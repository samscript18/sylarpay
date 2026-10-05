import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
import { units } from "@/lib/validation";
import { AppError, log } from "./http";
import { db, duplicateKey, publicFields, PaymentRecord } from "./db";
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
  const { Payment } = await db();
  const existing = await Payment.findOne(
    { network: c.network, txHash: input.txHash },
    publicFields,
  ).lean();
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
      await Payment.updateOne(
        {
          txHash: input.txHash,
          network: c.network,
          status: { $ne: "CONFIRMED" },
        },
        {
          $set: {
            status: "FAILED",
            failureReason:
              e instanceof Error ? e.message : "Verification failed",
          },
        },
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
  await storePayment(record);
  log("payment_verified", { network: c.network });
  return record;
}
export async function storePayment(p: PaymentRecord) {
  const { Payment } = await db();
  // Upsert the immutable intent; confirmation can never be downgraded by a racing submission.
  try {
    await Payment.updateOne(
      { network: p.network, txHash: p.txHash },
      { $setOnInsert: p },
      { upsert: true, runValidators: true },
    );
  } catch (e) {
    if (!duplicateKey(e)) throw e;
  }
  await Payment.updateOne(
    { network: p.network, txHash: p.txHash, status: { $ne: "CONFIRMED" } },
    {
      $set: {
        status: p.status,
        confirmedAt: p.confirmedAt,
        failureReason: p.failureReason,
      },
    },
  );
}
export async function history(account: string) {
  const c = getConfig(),
    { Payment, Batch, Note } = await db();
  const payments = await Payment.find(
    {
      network: c.network,
      $or: [{ senderAddress: account }, { recipientAddress: account }],
    },
    publicFields,
  )
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const batches = await Batch.find(
    {
      network: c.network,
      $or: [
        { senderAddress: account },
        { "payments.expectedAddress": account },
      ],
    },
    publicFields,
  )
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const indexed: PaymentRecord[] = [
    ...payments,
    ...batches.flatMap((batch) =>
      batch.payments.flatMap((p, operationIndex) =>
        batch.senderAddress === account || p.expectedAddress === account
          ? [
              {
                txHash: batch.txHash,
                network: batch.network,
                senderAddress: batch.senderAddress,
                recipientAddress: p.expectedAddress,
                username: p.username,
                assetCode: batch.assetCode,
                assetIssuer: batch.assetIssuer,
                amount: p.amount,
                status: batch.status,
                createdAt: batch.createdAt,
                confirmedAt: batch.confirmedAt,
                failureReason: batch.failureReason,
                operationIndex,
              },
            ]
          : [],
      ),
    ),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  const notes = await Note.find(
    {
      network: c.network,
      account,
      txHash: { $in: indexed.map((p) => p.txHash) },
    },
    publicFields,
  ).lean();
  const byHash = new Map(notes.map((n) => [n.txHash, n.note]));
  return indexed.map((p) => ({
    ...p,
    ...(byHash.has(p.txHash) ? { note: byHash.get(p.txHash) } : {}),
  }));
}
