"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import { displayAmount } from "@/lib/validation";
import { explorer } from "@/lib/config";
import { TransferForm, AcceptTransfer } from "./transfer-form";
import { Verification } from "./payment-form";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import type { PaymentRecord } from "@/server/db";
function Activity({ p, account }: { p: PaymentRecord; account: string }) {
  const [note, setNote] = useState(p.note || ""),
    [message, setMessage] = useState(""),
    [show, setShow] = useState(false);
  const incoming = p.recipientAddress === account;
  async function save() {
    try {
      await api("/api/payments/note", { txHash: p.txHash, note });
      setMessage("Private note saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save note.");
    }
  }
  return (
    <div>
      <div className="activity-row">
        <span className="round-icon">
          {incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </span>
        <div className="details">
          <strong>
            {incoming
              ? p.status === "CONFIRMED"
                ? "Payment received"
                : "Incoming payment"
              : `To @${p.username}`}
          </strong>
          <p>
            {p.status === "CONFIRMED"
              ? "Confirmed on Stellar"
              : p.status === "PENDING"
                ? "Waiting for confirmation"
                : "Payment failed"}{" "}
            · {new Date(p.createdAt).toLocaleDateString()}
          </p>
          <a
            className="text-link"
            href={explorer(p.network, p.txHash)}
            target="_blank"
            rel="noreferrer"
          >
            View transaction ↗
          </a>
          <button
            className="button secondary small"
            style={{ marginLeft: 12 }}
            onClick={() => setShow(!show)}
            aria-expanded={show}
          >
            Private note
          </button>
        </div>
        <strong className="amount">
          {incoming ? "+" : "−"} ${displayAmount(p.amount)}
          <p>USDC</p>
        </strong>
      </div>
      {show && (
        <div className="field">
          <label htmlFor={`note-${p.txHash}`}>
            Private note · stored off-chain
          </label>
          <input
            id={`note-${p.txHash}`}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="button small secondary" onClick={save}>
            Save note
          </button>
          {message && (
            <p role="status" className="tiny">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function Dashboard() {
  const w = useWallet(),
    a = useAccount(),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function trust() {
    if (!w.config) return;
    setBusy(true);
    try {
      setStatus("Preparing USDC trustline…");
      const r = await api<{ xdr: string }>("/api/trustline", {});
      setStatus("Waiting for wallet approval…");
      const signed = await wallet.signTransaction(r.xdr, w.config);
      await api("/api/trustline-submit", { signed });
      setStatus("USDC trustline ready.");
      await a.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unable to add trustline.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace">
      <div className="page-heading">
        <span className="eyebrow">Your money, with a familiar name</span>
        <h1>
          {a.data?.profile
            ? `Hello, ${a.data.profile.displayName}`
            : "Welcome to SkylarPay"}
        </h1>
        {a.data?.identity && (
          <div>
            @{a.data.identity.username}{" "}
            <Verification verified={a.data.identity.verified} />
          </div>
        )}
      </div>
      {!w.account ? (
        <ConnectPrompt />
      ) : (
        <>
          {a.error && (
            <div className="notice error" role="alert">
              {a.error}
              <button className="button small secondary" onClick={a.refresh}>
                Retry
              </button>
            </div>
          )}
          {a.loading && !a.data && (
            <p role="status" className="notice">
              Reading your Stellar account…
            </p>
          )}
          {a.data && (
            <>
              <div className="grid-two">
                <div className="card balance-card">
                  <span className="eyebrow">
                    Available balance · Stellar {w.config?.network}
                  </span>
                  <div className="balance-value">
                    {displayAmount(a.data.balance)}
                    <span>USDC</span>
                  </div>
                  <p className="muted tiny">
                    Read directly from Stellar{" "}
                    {w.config?.network === "testnet"
                      ? "· Test assets have no monetary value"
                      : ""}
                  </p>
                  <div className="actions">
                    <Link className="button" href="/receive">
                      <ArrowDownLeft size={17} />
                      Receive
                    </Link>
                    <Link className="button" href="/send">
                      <ArrowUpRight size={17} />
                      Send
                    </Link>
                    <Link className="button" href="/cash-out">
                      Cash out
                    </Link>
                  </div>
                </div>
                <div className="card">
                  <h2 className="section-title">Your payment identity</h2>
                  {a.data.identity ? (
                    <>
                      <p>Your next payment is one link away.</p>
                      <Link
                        className="text-link"
                        href={`/@${a.data.identity.username}`}
                      >
                        Open @{a.data.identity.username} ↗
                      </Link>
                    </>
                  ) : (
                    <>
                      <p>Leave long addresses behind.</p>
                      <Link className="button" href="/claim">
                        Claim your @username
                      </Link>
                    </>
                  )}
                  <div className="account">{w.account}</div>
                  {a.data.identity ? (
                    <TransferForm username={a.data.identity.username} />
                  ) : (
                    <AcceptTransfer />
                  )}
                  <button
                    className="button secondary small"
                    style={{ marginTop: 20 }}
                    onClick={trust}
                    disabled={busy}
                  >
                    Enable USDC receiving
                  </button>
                  {status && (
                    <p className="notice" role="status">
                      {status}
                    </p>
                  )}
                </div>
              </div>
              <section className="activity card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2>Recent activity</h2>
                  <button
                    className="button secondary small"
                    onClick={a.refresh}
                    disabled={a.loading}
                    aria-label="Refresh activity"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                {a.data.payments.length ? (
                  a.data.payments.map((p) => (
                    <Activity key={p.txHash} p={p} account={w.account!} />
                  ))
                ) : (
                  <p className="muted">
                    Your first payment starts a new story. Verified SkylarPay
                    payments will appear here.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
