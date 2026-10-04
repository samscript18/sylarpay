import { api } from "./api";
import { wallet } from "./wallet";
import type { AppConfig } from "./config";
import type { PaymentRecord } from "@/server/db";
export interface Recipient {
  username: string;
  address: string;
  verified: boolean;
  profile?: { displayName: string; bio: string };
}
export async function sendUsdcPayment(
  p: { username: string; amount: string; expectedAddress: string },
  config: AppConfig,
  progress: (s: string) => void,
  submitted: (hash: string) => void,
) {
  progress("Preparing Stellar payment…");
  const prepared = await api<{ xdr: string; recipient: Recipient }>(
    "/api/payments/prepare",
    p,
  );
  if (prepared.recipient.address !== p.expectedAddress)
    throw new Error("Recipient changed. Review the destination again.");
  progress("Waiting for wallet approval…");
  const signed = await wallet.signTransaction(prepared.xdr, config);
  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const transaction = TransactionBuilder.fromXDR(signed, config.passphrase);
  const original = TransactionBuilder.fromXDR(prepared.xdr, config.passphrase);
  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hash = toHex(transaction.hash());
  if (hash !== toHex(original.hash()))
    throw new Error(
      "Wallet changed the reviewed transaction. No payment was submitted.",
    );
  // Preserve the real, network-bound hash before the request can lose its response.
  // A hash identifies this attempt; only backend ledger verification proves success.
  submitted(hash);
  progress("Submitting to Stellar…");
  const result = await api<{ txHash: string }>("/api/payments/submit", {
    ...p,
    signed,
  });
  if (result.txHash !== hash)
    throw new Error(
      "Submission returned a different transaction. Check the signed transaction before retrying.",
    );
  progress("Payment submitted.");
  return confirmPayment(hash, p, progress);
}
export async function confirmPayment(
  txHash: string,
  p: { username: string; amount: string },
  progress: (s: string) => void,
) {
  progress("Confirming on Stellar…");
  for (let i = 0; i < 10; i++) {
    const record = await api<PaymentRecord>("/api/payments/verify", {
      ...p,
      txHash,
    });
    if (record.status !== "PENDING") return record;
    await new Promise((r) => setTimeout(r, 2000 + i * 300));
  }
  return { status: "PENDING" as const, txHash };
}
