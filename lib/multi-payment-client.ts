import { TransactionBuilder } from "@stellar/stellar-sdk";
import { api } from "./api";
import { wallet } from "./wallet";
import type { AppConfig } from "./config";
import type { MultiIntent } from "@/server/multi-payments";
import type { PaymentBatch } from "@/server/db";
export async function confirmMultiPayment(
  intent: MultiIntent,
  txHash: string,
  progress: (message: string) => void,
) {
  progress("Confirming every payment on Stellar…");
  for (let i = 0; i < 10; i++) {
    const record = await api<PaymentBatch>("/api/multi-payments/verify", {
      ...intent,
      txHash,
    });
    if (record.status !== "PENDING") return record;
    if (i < 9) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return { status: "PENDING" as const };
}
export async function sendMultiPayment(
  intent: MultiIntent,
  config: AppConfig,
  progress: (message: string) => void,
  attempted: (hash: string) => void,
) {
  progress("Preparing all payments…");
  const prepared = await api<{ xdr: string }>(
    "/api/multi-payments/prepare",
    intent,
  );
  progress("Waiting for wallet approval…");
  const signed = await wallet.signTransaction(prepared.xdr, config);
  const tx = TransactionBuilder.fromXDR(signed, config.passphrase);
  const original = TransactionBuilder.fromXDR(prepared.xdr, config.passphrase);
  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const hash = toHex(tx.hash());
  if (hash !== toHex(original.hash()))
    throw new Error(
      "Wallet changed the reviewed multi-send. No transaction was submitted.",
    );
  attempted(hash);
  progress("Submitting multi-send to Stellar…");
  const result = await api<{ txHash: string }>("/api/multi-payments/submit", {
    ...intent,
    signed,
  });
  if (result.txHash !== hash)
    throw new Error(
      "Submission returned a different hash. Check the signed transaction before retrying.",
    );
  return confirmMultiPayment(intent, hash, progress);
}
