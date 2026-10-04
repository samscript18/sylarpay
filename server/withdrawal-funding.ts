import {
  Asset,
  BASE_FEE,
  Memo,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { db } from "./db";
import { getConfig } from "@/lib/config";
import { addressSchema, amountSchema, units } from "@/lib/validation";
import { withdrawalStatus } from "./offramp";
import { AppError } from "./http";
import { horizon, balance } from "./stellar";
interface FundingRow {
  id: string;
  account: string;
  fundingXdr: string | null;
  fundingHash: string | null;
}
export interface FundingReview {
  xdr: string;
  destination: string;
  amount: string;
  memo?: string;
  memoType?: string;
  network: string;
  assetCode: string;
  issuer: string;
}
function owned(account: string, id: string) {
  const row = db()
    .prepare(
      "SELECT id,account,fundingXdr,fundingHash FROM withdrawals WHERE id=? AND account=? AND network=?",
    )
    .get(id, account, getConfig().network) as FundingRow | undefined;
  if (!row) throw new AppError("Withdrawal not found.", 404);
  return row;
}
function memo(type?: string, value?: string) {
  if (!value) return Memo.none();
  switch (type) {
    case "id":
      return Memo.id(value);
    case "text":
      return Memo.text(value);
    case "hash": {
      const bytes = Buffer.from(value, "base64");
      if (bytes.length !== 32) throw new AppError("Invalid anchor hash memo.");
      return Memo.hash(bytes);
    }
    default:
      throw new AppError(
        "This provider uses an unsupported memo type. Follow its hosted instructions.",
      );
  }
}
export async function prepareFunding(
  account: string,
  id: string,
): Promise<FundingReview> {
  const row = owned(account, id);
  if (row.fundingHash)
    throw new AppError(
      `Transfer already submitted: ${row.fundingHash}. Check its confirmation before making another transfer.`,
      409,
    );
  const status = await withdrawalStatus(account, id),
    c = getConfig();
  if (
    status.demo ||
    status.status !== "AWAITING_USER_TRANSFER" ||
    !status.withdrawalAccount ||
    !status.amountIn
  )
    throw new AppError(
      "The anchor has not provided complete USDC transfer instructions.",
    );
  const destination = addressSchema.parse(status.withdrawalAccount),
    amount = amountSchema.parse(status.amountIn);
  if (units(await balance(account)) < units(amount))
    throw new AppError("Insufficient USDC balance.");
  const s = await horizon(),
    source = await s.loadAccount(account);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: c.passphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        amount,
        asset: new Asset(c.assetCode, c.issuer),
      }),
    )
    .addMemo(memo(status.withdrawalMemoType, status.withdrawalMemo))
    .setTimeout(180)
    .build();
  db()
    .prepare(
      "UPDATE withdrawals SET fundingXdr=? WHERE id=? AND fundingHash IS NULL",
    )
    .run(tx.toXDR(), id);
  return {
    xdr: tx.toXDR(),
    destination,
    amount,
    memo: status.withdrawalMemo,
    memoType: status.withdrawalMemoType,
    network: c.network,
    assetCode: c.assetCode,
    issuer: c.issuer,
  };
}
export async function submitFunding(
  account: string,
  id: string,
  signed: string,
) {
  const row = owned(account, id),
    c = getConfig();
  if (!row.fundingXdr)
    throw new AppError("Review the anchor transfer before signing.");
  const tx = TransactionBuilder.fromXDR(signed, c.passphrase),
    original = TransactionBuilder.fromXDR(row.fundingXdr, c.passphrase);
  if (
    !(tx instanceof Transaction) ||
    tx.source !== account ||
    !Buffer.from(tx.hash()).equals(Buffer.from(original.hash()))
  )
    throw new AppError(
      "Signed transfer does not match the reviewed anchor transaction.",
    );
  const hash = Buffer.from(tx.hash()).toString("hex");
  if (row.fundingHash && row.fundingHash !== hash)
    throw new AppError("A different transfer has already been submitted.", 409);
  // Reserve this exact network hash before submission; retries can only replay the same transaction.
  const reserved = db()
    .prepare(
      "UPDATE withdrawals SET fundingHash=? WHERE id=? AND (fundingHash IS NULL OR fundingHash=?)",
    )
    .run(hash, id, hash);
  if (!reserved.changes)
    throw new AppError("A different transfer has already been submitted.", 409);
  const s = await horizon();
  try {
    await s.submitTransaction(tx);
  } catch (e) {
    if (
      e instanceof Error &&
      "response" in e &&
      (e.response as { status?: number })?.status === 400
    ) {
      try {
        const previous = await s.transactions().transaction(hash).call();
        if (!previous.successful) throw new AppError("Anchor transfer failed.");
      } catch {
        throw new AppError(
          "Transfer was rejected or is not confirmed. Check the transaction before retrying.",
          409,
        );
      }
    }
  }
  try {
    const evidence = await s.transactions().transaction(hash).call();
    if (evidence.successful) return { txHash: hash, status: "CONFIRMED" };
  } catch {
    /* Unindexed ledger evidence is pending, never confirmed. */
  }
  return { txHash: hash, status: "PENDING" };
}
