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
async function owned(account: string, id: string) {
  const row = await (
    await db()
  ).Withdrawal.findOne({ id, account, network: getConfig().network }).lean();
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
  const row = await owned(account, id);
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
  const prepared = await (
    await db()
  ).Withdrawal.updateOne(
    { id, account, network: c.network, fundingHash: null },
    { $set: { fundingXdr: tx.toXDR() } },
  );
  if (!prepared.matchedCount)
    throw new AppError(
      "Transfer already submitted. Check its confirmation before retrying.",
      409,
    );
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
  const row = await owned(account, id),
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
  const reserved = await (
    await db()
  ).Withdrawal.updateOne(
    {
      id,
      account,
      network: c.network,
      $or: [{ fundingHash: null }, { fundingHash: hash }],
    },
    { $set: { fundingHash: hash } },
  );
  if (!reserved.matchedCount)
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
        const response = (e as Error & { response?: { data?: { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } } }).response;
        const codes = response?.data?.extras?.result_codes;
        const reason = [codes?.transaction, ...(codes?.operations || [])]
          .filter((code): code is string => typeof code === "string" && /^(tx|op)_[a-z_]+$/.test(code))
          .join(", ");
        throw new AppError(
          `Stellar rejected this transfer${reason ? ` (${reason})` : ""}. No successful ledger confirmation was found. Keep this attempt and reconcile it before making another transfer.`,
          409,
        );
      }
    }
  }
  return verifyFunding(account, id);
}
export async function verifyFunding(account: string, id: string) {
  const row = await owned(account, id),
    c = getConfig();
  if (!row.fundingHash || !row.fundingXdr)
    throw new AppError("No submitted anchor transfer is recorded.", 409);
  const hash = row.fundingHash;
  let evidence;
  try {
    const s = await horizon();
    evidence = await s.transactions().transaction(hash).call();
  } catch (error) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    const original = TransactionBuilder.fromXDR(row.fundingXdr, c.passphrase);
    const maxTime = original instanceof Transaction ? original.timeBounds?.maxTime : undefined;
    // A saved signed hash proves an attempt, not submission. Only a definitive
    // Horizon 404 after expiry is classified as missing; outages stay uncertain.
    if (status === 404 && maxTime && maxTime !== "0" && BigInt(maxTime) < BigInt(Math.floor(Date.now() / 1000)))
      return { txHash: hash, status: "NOT_FOUND" };
    return { txHash: hash, status: "PENDING" };
  }
  if (!evidence.successful) return { txHash: hash, status: "FAILED" };
  const original = TransactionBuilder.fromXDR(row.fundingXdr, c.passphrase);
  if (!evidence.envelope_xdr)
    throw new AppError("Stellar transfer evidence is incomplete.", 502);
  const actual = TransactionBuilder.fromXDR(
    evidence.envelope_xdr,
    c.passphrase,
  );
  if (
    !(actual instanceof Transaction) ||
    actual.source !== account ||
    Buffer.from(actual.hash()).toString("hex") !== hash ||
    !Buffer.from(actual.hash()).equals(Buffer.from(original.hash()))
  )
    throw new AppError(
      "Stellar transfer does not match the reviewed anchor transaction.",
      502,
    );
  return { txHash: hash, status: "CONFIRMED" };
}
