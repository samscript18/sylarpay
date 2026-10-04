"use client";
import { useState } from "react";
import { useWallet } from "./wallet-provider";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
export function TransferForm({ username }: { username: string }) {
  const w = useWallet(),
    [newOwner, setNewOwner] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(method: "propose_transfer" | "cancel_transfer") {
    if (!w.config) return;
    setBusy(true);
    try {
      setStatus("Preparing username transfer…");
      const r = await api<{ xdr: string }>("/api/registry/prepare", {
        username,
        method,
        newOwner: method === "propose_transfer" ? newOwner : undefined,
      });
      setStatus("Waiting for wallet approval…");
      const signed = await wallet.signTransaction(r.xdr, w.config);
      await api("/api/registry/submit", { signed });
      setStatus(
        method === "propose_transfer"
          ? "Transfer proposed. The new owner must connect and accept the transfer."
          : "Transfer proposal cancelled.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details style={{ marginTop: 25 }}>
      <summary className="text-link">Transfer your username</summary>
      <p className="tiny">
        Ownership stays with you until the new owner accepts. Verification stays
        with your account. Lost wallet access cannot be recovered by SkylarPay.
      </p>
      <div className="field">
        <label htmlFor="new-owner">New owner’s Stellar account</label>
        <input
          id="new-owner"
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
          placeholder="G…"
          autoComplete="off"
        />
      </div>
      <div className="actions">
        <button
          className="button small secondary"
          disabled={busy || !newOwner}
          onClick={() => action("propose_transfer")}
        >
          Propose transfer
        </button>
        <button
          className="button small secondary"
          disabled={busy}
          onClick={() => action("cancel_transfer")}
        >
          Cancel proposal
        </button>
      </div>
      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}
    </details>
  );
}
export function AcceptTransfer() {
  const w = useWallet(),
    [username, setUsername] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function accept() {
    if (!w.config) return;
    setBusy(true);
    try {
      const r = await api<{ xdr: string }>("/api/registry/prepare", {
        username,
        method: "accept_transfer",
      });
      const signed = await wallet.signTransaction(r.xdr, w.config);
      await api("/api/registry/submit", { signed });
      setStatus(
        "Transfer accepted. Complete your public profile to request verification.",
      );
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Transfer could not be accepted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details style={{ marginTop: 25 }}>
      <summary className="text-link">Accept a username transfer</summary>
      <div className="field">
        <label htmlFor="accept-name">Username proposed to your account</label>
        <input
          id="accept-name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
        />
      </div>
      <button
        className="button small secondary"
        disabled={busy || !username}
        onClick={accept}
      >
        Accept transfer
      </button>
      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}
    </details>
  );
}
