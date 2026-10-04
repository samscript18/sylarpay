import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
import { units } from "@/lib/validation";
import { AppError, log } from "./http";
import { db, PaymentRecord } from "./db";
import { horizon } from "./stellar";
import { resolveUsername } from "./registry";
export interface Evidence {
  hash: string;
  successful: boolean;
  source: string;
  destination: string;
  assetCode: string;
  issuer: string;
  amount: string;
  network: string;
  operationCount: number;
  type: string;
}
export function assertPayment(
  e: Evidence,
  expected: {
    hash: string;
    sender: string;
    recipient: string;
    amount: string;
    network: string;
    assetCode: string;
    issuer: string;
  },
) {
  if (!e.successful)
    throw new AppError("Stellar reports that this transaction failed.");
  if (
    e.hash !== expected.hash ||
    e.network !== expected.network ||
    e.source !== expected.sender ||
    e.destination !== expected.recipient ||
    e.assetCode !== expected.assetCode ||
    e.issuer !== expected.issuer ||
    units(e.amount) !== units(expected.amount) ||
    e.operationCount !== 1 ||
    e.type !== "payment"
  )
    throw new AppError("Transaction does not match the expected USDC payment.");
}
export async function verifyPayment(
  input: { txHash: string; username: string; amount: string },
  sender: string,
): Promise<PaymentRecord> {
  const c = getConfig();
  const s = await horizon();
  const recipient = await resolveUsername(input.username);
  const existing = db()
    .prepare("SELECT * FROM payments WHERE network=? AND txHash=?")
    .get(c.network, input.txHash) as PaymentRecord | undefined;
  if (
    existing &&
    (existing.senderAddress !== sender ||
      existing.username !== input.username ||
      units(existing.amount) !== units(input.amount))
  )
    throw new AppError(
      "This transaction is already associated with a different payment.",
      409,
    );
  let tx;
  try {
    tx = await s.transactions().transaction(input.txHash).call();
  } catch (e) {
    if (
      e instanceof Error &&
      "response" in e &&
      (e.response as { status?: number })?.status === 404
    ) {
      if (existing?.status === "CONFIRMED")
        throw new AppError(
          "Previously verified transaction is unavailable on Stellar. Check the network or a Testnet reset before presenting it as confirmed.",
          503,
        );
      const record: PaymentRecord = {
        txHash: input.txHash,
        network: c.network,
        senderAddress: sender,
        recipientAddress: recipient.address,
        username: input.username,
        assetCode: c.assetCode,
        assetIssuer: c.issuer,
        amount: input.amount,
        status: "PENDING",
        createdAt: existing?.createdAt || new Date().toISOString(),
        confirmedAt: null,
        failureReason: null,
      };
      return record;
    }
    throw e;
  }
  const envelope = TransactionBuilder.fromXDR(tx.envelope_xdr, c.passphrase);
  if (!(envelope instanceof Transaction))
    throw new AppError("Fee-bump payments are not supported by this MVP.");
  if (envelope.source !== sender)
    throw new AppError(
      "Transaction sender does not match the connected account.",
    );
  const op = envelope.operations[0];
  const evidence: Evidence = {
    hash: Buffer.from(envelope.hash()).toString("hex"),
    successful: tx.successful,
    source: op?.source || envelope.source,
    destination: op?.type === "payment" ? op.destination : "",
    assetCode: op?.type === "payment" ? op.asset.getCode() : "",
    issuer: op?.type === "payment" ? op.asset.getIssuer() || "" : "",
    amount: op?.type === "payment" ? op.amount : "0",
    network: c.network,
    operationCount: envelope.operations.length,
    type: op?.type || "",
  };
  try {
    assertPayment(evidence, {
      hash: input.txHash,
      sender,
      recipient: recipient.address,
      amount: input.amount,
      network: c.network,
      assetCode: c.assetCode,
      issuer: c.issuer,
    });
  } catch (e) {
    if (existing && existing.status !== "CONFIRMED")
      db()
        .prepare(
          "UPDATE payments SET status='FAILED',failureReason=? WHERE txHash=? AND network=?",
        )
        .run(
          e instanceof Error ? e.message : "Verification failed",
          input.txHash,
          c.network,
        );
    throw e;
  }
  const record: PaymentRecord = {
    txHash: input.txHash,
    network: c.network,
    senderAddress: sender,
    recipientAddress: recipient.address,
    username: input.username,
    assetCode: c.assetCode,
    assetIssuer: c.issuer,
    amount: input.amount,
    status: "CONFIRMED",
    createdAt: existing?.createdAt || new Date().toISOString(),
    confirmedAt: tx.created_at,
    failureReason: null,
  };
  storePayment(record);
  log("payment_verified", { network: c.network });
  return record;
}
export function storePayment(p: PaymentRecord) {
  db()
    .prepare(
      `INSERT INTO payments(txHash,network,senderAddress,recipientAddress,username,assetCode,assetIssuer,amount,status,createdAt,confirmedAt,failureReason) VALUES(@txHash,@network,@senderAddress,@recipientAddress,@username,@assetCode,@assetIssuer,@amount,@status,@createdAt,@confirmedAt,@failureReason) ON CONFLICT(network,txHash) DO UPDATE SET status=excluded.status,confirmedAt=excluded.confirmedAt,failureReason=excluded.failureReason WHERE payments.status!='CONFIRMED'`,
    )
    .run(p);
}
export function history(account: string) {
  const c = getConfig();
  return db()
    .prepare(
      "SELECT p.*, n.note FROM payments p LEFT JOIN notes n ON p.network=n.network AND p.txHash=n.txHash AND n.account=? WHERE p.network=? AND (senderAddress=? OR recipientAddress=?) ORDER BY createdAt DESC LIMIT 50",
    )
    .all(account, c.network, account, account) as PaymentRecord[];
}
