"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { amountSchema, displayAmount, usernameSchema } from "@/lib/validation";
import { explorer } from "@/lib/config";
import {
  confirmPayment,
  Recipient,
  sendUsdcPayment,
} from "@/lib/payment-client";
import { useWallet, ConnectPrompt } from "./wallet-provider";
export function Verification({ verified }: { verified: boolean }) {
  return (
    <span className={`badge ${verified ? "" : "unverified"}`}>
      {verified && <Check size={13} />}{" "}
      {verified ? "Skylar Verified" : "Unverified"}
    </span>
  );
}
export function PaymentForm({
  initialUsername = "",
  initialAmount = "",
  recipient: initialRecipient,
}: {
  initialUsername?: string;
  initialAmount?: string;
  recipient?: Recipient;
}) {
  const w = useWallet();
  if (!w.account) return <ConnectPrompt />;
  return (
    <ConnectedPaymentForm
      key={`${w.account}:${w.config?.network}`}
      initialUsername={initialUsername}
      initialAmount={initialAmount}
      recipient={initialRecipient}
    />
  );
}
function ConnectedPaymentForm({
  initialUsername,
  initialAmount,
  recipient: initialRecipient,
}: {
  initialUsername: string;
  initialAmount: string;
  recipient?: Recipient;
}) {
  const w = useWallet();
  const storageKey = `skylar_payment_${w.account}_${w.config?.network}`;
  const [saved] = useState(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (
        value &&
        /^[a-f0-9]{64}$/.test(value.hash) &&
        usernameSchema.safeParse(value.username).success &&
        amountSchema.safeParse(value.amount).success &&
        value.recipient?.address
      )
        return value as {
          hash: string;
          username: string;
          amount: string;
          recipient: Recipient;
        };
    } catch {
      /* Storage may be disabled; the in-memory attempt remains available. */
    }
    return null;
  });
  const [username, setUsername] = useState(saved?.username || initialUsername),
    [amount, setAmount] = useState(saved?.amount || initialAmount),
    [recipient, setRecipient] = useState<Recipient | null>(
      saved?.recipient || initialRecipient || null,
    ),
    [stage, setStage] = useState<
      "edit" | "review" | "pending" | "success" | "failed"
    >(saved ? "pending" : "edit"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [hash, setHash] = useState(saved?.hash || "");
  async function review(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage(`Resolving ${username}…`);
    try {
      const name = usernameSchema.parse(username);
      amountSchema.parse(amount);
      const r = await api<Recipient>(`/api/users/${name}`);
      setRecipient(r);
      setUsername(name);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resolve recipient.");
    } finally {
      setBusy(false);
      setMessage("");
    }
  }
  async function pay() {
    if (!w.config || !recipient) return;
    setBusy(true);
    setError("");
    try {
      const record = hash
        ? await confirmPayment(hash, { username, amount }, setMessage)
        : await sendUsdcPayment(
            { username, amount, expectedAddress: recipient.address },
            w.config,
            setMessage,
            (txHash) => {
              setHash(txHash);
              setStage("pending");
              try {
                sessionStorage.setItem(
                  storageKey,
                  JSON.stringify({ hash: txHash, username, amount, recipient }),
                );
              } catch {
                /* Keep the hash in memory if browser storage is unavailable. */
              }
            },
          );
      if (record.status !== "PENDING") {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Optional local recovery storage. */
        }
      }
      setStage(
        record.status === "CONFIRMED"
          ? "success"
          : record.status === "FAILED"
            ? "failed"
            : "pending",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Payment could not be verified.",
      );
      if (
        e instanceof Error &&
        e.message === "Stellar reports that this transaction failed."
      ) {
        setStage("failed");
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* Optional local recovery storage. */
        }
      }
    } finally {
      setBusy(false);
      setMessage("");
    }
  }
  if (!w.account) return <ConnectPrompt />;
  if (stage === "success")
    return (
      <div className="card narrow success">
        <div className="success-icon">
          <Check size={32} />
        </div>
        <h2>Payment sent</h2>
        <div className="balance-value">
          ${displayAmount(amount)}
          <span>USDC</span>
        </div>
        <p>to @{username}</p>
        <span className="badge">
          <Check size={14} /> Confirmed on Stellar{" "}
          {w.config?.network === "testnet" ? "Testnet" : "Mainnet"}
        </span>
        {w.config?.network === "testnet" && (
          <p className="tiny">Test assets have no monetary value.</p>
        )}
        <div className="account">{hash}</div>
        <p>
          <a
            className="text-link"
            href={explorer(w.config!.network, hash)}
            target="_blank"
            rel="noreferrer"
          >
            View on Stellar Explorer ↗
          </a>
        </p>
        <Link className="button secondary" href="/dashboard">
          Back to overview
        </Link>
      </div>
    );
  return (
    <div className="card narrow">
      {stage === "edit" ? (
        <form onSubmit={review}>
          <div className="field">
            <label htmlFor="recipient">Recipient</label>
            <input
              id="recipient"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              required
              autoComplete="off"
            />
            <div className="hint">
              Pay a name. We’ll resolve the Stellar destination.
            </div>
          </div>
          <div className="field">
            <label htmlFor="amount">Amount · USDC</label>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="150.00"
              required
            />
          </div>
          <button className="button full" disabled={busy}>
            Continue <ArrowUpRight size={17} />
          </button>
        </form>
      ) : (
        <>
          <span className="eyebrow">
            {stage === "pending"
              ? "Payment confirmation pending"
              : stage === "failed"
                ? "Payment failed"
                : "You’re sending"}
          </span>
          <div className="balance-value">
            ${displayAmount(amount)}
            <span>USDC</span>
          </div>
          <div className="summary-row">
            <span>To</span>
            <strong>@{recipient?.username}</strong>
          </div>
          <div className="summary-row">
            <span>Verification</span>
            <Verification verified={recipient?.verified || false} />
          </div>
          <div className="summary-row">
            <span>Network</span>
            <strong>Stellar {w.config?.network}</strong>
          </div>
          <p className="tiny">Stellar destination</p>
          <div className="account">{recipient?.address}</div>
          <div className="notice">
            {stage === "pending"
              ? "Confirmation is not available yet. Check this transaction before making another payment."
              : stage === "failed"
                ? "This payment was not confirmed. Check the transaction details and failure reason before trying again."
                : "Review the recipient, destination, asset, and amount before signing."}
          </div>
          {hash && (
            <div className="account" aria-label="Transaction hash">
              {hash}
            </div>
          )}
          {hash && (
            <a
              className="text-link"
              href={explorer(w.config!.network, hash)}
              target="_blank"
              rel="noreferrer"
            >
              View submitted transaction ↗
            </a>
          )}
          <div className="actions">
            <button
              className="button"
              disabled={busy || stage === "failed"}
              onClick={pay}
            >
              {hash ? "Check confirmation" : "Confirm payment"}
            </button>
            {!hash && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setStage("edit")}
              >
                Edit
              </button>
            )}
          </div>
        </>
      )}
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
          {hash && stage !== "failed" && (
            <p>
              Submission may have succeeded. Check confirmation using this
              transaction before retrying.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
