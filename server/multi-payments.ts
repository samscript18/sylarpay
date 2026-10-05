import {
  Asset,
  BASE_FEE,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { getConfig } from "@/lib/config";
import { multiPaymentSchema, units } from "@/lib/validation";
import { db, duplicateKey, publicFields, type PaymentBatch } from "./db";
import { AppError, log } from "./http";
import { resolveUsername } from "./registry";
import { horizon } from "./stellar";
export type MultiIntent = ReturnType<typeof multiPaymentSchema.parse>;
async function resolve(intent: MultiIntent) {
  const recipients = await Promise.all(
    intent.payments.map((p) => resolveUsername(p.username)),
  );
  recipients.forEach((r, i) => {
    if (r.address !== intent.payments[i].expectedAddress)
      throw new AppError(
        `@${r.username} changed owners. Review all recipients again.`,
        409,
      );
  });
  if (new Set(recipients.map((r) => r.address)).size !== recipients.length)
    throw new AppError("Choose distinct recipient accounts.");
  return recipients;
}
export function assertMultiPayment(
  tx: Transaction,
  intent: MultiIntent,
  account: string,
  hash?: string,
) {
  const c = getConfig();
  if (
    tx.source !== account ||
    tx.memo.type !== "none" ||
    tx.operations.length !== intent.payments.length ||
    (hash && Buffer.from(tx.hash()).toString("hex") !== hash)
  )
    throw new AppError("Transaction does not match the reviewed multi-send.");
  tx.operations.forEach((op, i) => {
    const expected = intent.payments[i];
    if (
      op.type !== "payment" ||
      (op.source || tx.source) !== account ||
      op.destination !== expected.expectedAddress ||
      op.asset.getCode() !== c.assetCode ||
      op.asset.getIssuer() !== c.issuer ||
      units(op.amount) !== units(expected.amount)
    )
      throw new AppError("Transaction does not match the reviewed multi-send.");
  });
}
export async function prepareMultiPayment(
  account: string,
  intent: MultiIntent,
) {
  const c = getConfig();
  const recipients = await resolve(intent);
  const s = await horizon();
  const [source, ...accounts] = await Promise.all(
    [account, ...recipients.map((r) => r.address)].map((address) =>
      s.loadAccount(address),
    ),
  );
  const assetBalance = (a: typeof source) =>
    a.balances.find(
      (b) =>
        "asset_code" in b &&
        b.asset_code === c.assetCode &&
        b.asset_issuer === c.issuer,
    );
  const available = assetBalance(source);
  const total = intent.payments.reduce((sum, p) => sum + units(p.amount), 0n);
  if (
    !available ||
    ("is_authorized" in available && available.is_authorized === false) ||
    units(available.balance) -
      units(
        ("selling_liabilities" in available && available.selling_liabilities) ||
          "0",
      ) <
      total
  )
    throw new AppError("Insufficient USDC balance for the total payment.");
  accounts.forEach((a, i) => {
    const trust = assetBalance(a);
    if (!trust || ("is_authorized" in trust && trust.is_authorized === false))
      throw new AppError(
        `@${recipients[i].username} needs an authorized USDC trustline.`,
      );
    if (
      "limit" in trust &&
      units(trust.limit) -
        units(trust.balance) -
        units(
          ("buying_liabilities" in trust && trust.buying_liabilities) || "0",
        ) <
        units(intent.payments[i].amount)
    )
      throw new AppError(
        `@${recipients[i].username} does not have enough USDC trustline capacity.`,
      );
  });
  const builder = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: c.passphrase,
  });
  intent.payments.forEach((p) =>
    builder.addOperation(
      Operation.payment({
        destination: p.expectedAddress,
        asset: new Asset(c.assetCode, c.issuer),
        amount: p.amount,
      }),
    ),
  );
  return { xdr: builder.setTimeout(180).build().toXDR(), recipients };
}
function sameIntent(record: PaymentBatch, intent: MultiIntent, sender: string) {
  return (
    record.senderAddress === sender &&
    record.payments.length === intent.payments.length &&
    record.payments.every(
      (p, i) =>
        p.username === intent.payments[i].username &&
        p.expectedAddress === intent.payments[i].expectedAddress &&
        units(p.amount) === units(intent.payments[i].amount),
    )
  );
}
async function store(record: PaymentBatch) {
  const { Batch } = await db();
  try {
    await Batch.updateOne(
      { network: record.network, txHash: record.txHash },
      { $setOnInsert: record },
      { upsert: true, runValidators: true },
    );
  } catch (e) {
    if (!duplicateKey(e)) throw e;
  }
  const current = await Batch.findOne(
    { network: record.network, txHash: record.txHash },
    publicFields,
  ).lean();
  if (!current || !sameIntent(current, record, record.senderAddress))
    throw new AppError(
      "This transaction belongs to a different multi-send.",
      409,
    );
  await Batch.updateOne(
    {
      network: record.network,
      txHash: record.txHash,
      status: { $ne: "CONFIRMED" },
    },
    {
      $set: {
        status: record.status,
        confirmedAt: record.confirmedAt,
        failureReason: record.failureReason,
      },
    },
  );
}
export async function verifyMultiPayment(
  account: string,
  intent: MultiIntent,
  hash: string,
): Promise<PaymentBatch> {
  const c = getConfig();
  await resolve(intent);
  const { Batch, Payment } = await db();
  if (await Payment.exists({ network: c.network, txHash: hash }))
    throw new AppError("Transaction already indexed as a single payment.", 409);
  const existing = await Batch.findOne(
    { network: c.network, txHash: hash },
    publicFields,
  ).lean();
  if (existing && !sameIntent(existing, intent, account))
    throw new AppError(
      "This transaction belongs to a different multi-send.",
      409,
    );
  const record: PaymentBatch = {
    txHash: hash,
    assetCode: c.assetCode,
    assetIssuer: c.issuer,
    network: c.network,
    senderAddress: account,
    payments: intent.payments,
    status: "PENDING",
    createdAt: existing?.createdAt || new Date().toISOString(),
    confirmedAt: null,
    failureReason: null,
  };
  const s = await horizon();
  let ledger;
  try {
    ledger = await s.transactions().transaction(hash).call();
  } catch (e) {
    if (
      e instanceof Error &&
      "response" in e &&
      (e.response as { status?: number }).status === 404
    ) {
      if (existing?.status === "CONFIRMED")
        throw new AppError(
          "Previously verified multi-send is unavailable on Stellar.",
          503,
        );
      return existing?.status === "FAILED" ? existing : record;
    }
    throw e;
  }
  const tx = TransactionBuilder.fromXDR(ledger.envelope_xdr, c.passphrase);
  if (!(tx instanceof Transaction))
    throw new AppError("Unsupported multi-send envelope.");
  assertMultiPayment(tx, intent, account, hash);
  if (!ledger.successful) {
    record.status = "FAILED";
    record.failureReason = "Stellar reports that this transaction failed.";
  } else {
    record.status = "CONFIRMED";
    record.confirmedAt = ledger.created_at;
  }
  await store(record);
  log("multi_payment_verified", {
    network: c.network,
    confirmed: record.status === "CONFIRMED",
  });
  return record;
}
export async function submitMultiPayment(
  account: string,
  intent: MultiIntent,
  signed: string,
) {
  const c = getConfig();
  await resolve(intent);
  const tx = TransactionBuilder.fromXDR(signed, c.passphrase);
  if (!(tx instanceof Transaction))
    throw new AppError("Unsupported multi-send envelope.");
  assertMultiPayment(tx, intent, account);
  const hash = Buffer.from(tx.hash()).toString("hex");
  const { Payment } = await db();
  if (await Payment.exists({ network: c.network, txHash: hash }))
    throw new AppError("Transaction already indexed as a single payment.", 409);
  await store({
    txHash: hash,
    assetCode: c.assetCode,
    assetIssuer: c.issuer,
    network: c.network,
    senderAddress: account,
    payments: intent.payments,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    failureReason: null,
  });
  const s = await horizon();
  try {
    await s.submitTransaction(tx);
  } catch (e) {
    if (
      e instanceof Error &&
      "response" in e &&
      (e.response as { status?: number }).status === 400
    ) {
      const record = await verifyMultiPayment(account, intent, hash);
      if (record.status !== "CONFIRMED") {
        await store({
          ...record,
          status: "FAILED",
          failureReason:
            "Stellar rejected the multi-send. Check balances, trustlines and transaction fees.",
        });
        throw new AppError(
          "Stellar rejected the multi-send. Check balances, trustlines and transaction fees.",
        );
      }
    }
    // Transport ambiguity preserves the same signed hash for verification, never another signature.
  }
  return { txHash: hash };
}
