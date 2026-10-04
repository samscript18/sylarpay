"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import { explorer } from "@/lib/config";
import { useWallet } from "./wallet-provider";
import type { FundingReview } from "@/server/withdrawal-funding";
export function FundWithdrawal({ id }: { id: string }) {
  const w = useWallet(),
    [review, setReview] = useState<FundingReview | null>(null),
    [hash, setHash] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function prepare() {
    setBusy(true);
    try {
      setReview(await api<FundingReview>("/api/withdrawals/fund", { id }));
      setStatus(
        "Review the exact provider destination and required memo before signing.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not prepare transfer.");
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!review || !w.config) return;
    setBusy(true);
    try {
      setStatus("Waiting for wallet approval…");
      const signed = await wallet.signTransaction(review.xdr, w.config);
      const { TransactionBuilder } = await import("@stellar/stellar-sdk");
      const tx = TransactionBuilder.fromXDR(signed, w.config.passphrase);
      const original = TransactionBuilder.fromXDR(
        review.xdr,
        w.config.passphrase,
      );
      const hex = (bytes: Uint8Array) =>
        Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
          "",
        );
      if (hex(tx.hash()) !== hex(original.hash()))
        throw new Error(
          "Wallet changed the reviewed anchor transfer. No transfer was submitted.",
        );
      setHash(hex(tx.hash()));
      setStatus("Submitting USDC transfer. Confirmation is not available yet.");
      const r = await api<{ txHash: string; status: string }>(
        "/api/withdrawals/fund",
        { id, signed },
      );
      setHash(r.txHash);
      setStatus(
        r.status === "CONFIRMED"
          ? "USDC transfer confirmed on Stellar. The provider is still responsible for payout."
          : "USDC transfer submitted. Waiting for ledger evidence and provider status.",
      );
    } catch (e) {
      setStatus(
        `${e instanceof Error ? e.message : "Could not confirm transfer."} Check the transaction and provider status before making another transfer.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="notice">
      {hash ? (
        <a
          className="text-link"
          href={explorer(w.config!.network, hash)}
          target="_blank"
          rel="noreferrer"
        >
          View anchor transfer on Stellar ↗
        </a>
      ) : review ? (
        <>
          <strong>
            Transfer {review.amount} {review.assetCode} to the anchor
          </strong>
          <div className="account">{review.destination}</div>
          <p className="tiny">
            Network: {review.network}
            <br />
            Issuer: {review.issuer}
            <br />
            Required memo:{" "}
            {review.memo ? `${review.memoType}: ${review.memo}` : "None"}
          </p>
          <button className="button small" disabled={busy} onClick={send}>
            Confirm USDC transfer
          </button>
        </>
      ) : (
        <button
          className="button secondary small"
          disabled={busy}
          onClick={prepare}
        >
          Prepare USDC transfer
        </button>
      )}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
