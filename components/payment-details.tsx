"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  LockKeyhole,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { explorer } from "@/lib/config";
import { displayAmount } from "@/lib/validation";
import type { PaymentRecord } from "@/server/db";
import { ConnectPrompt, useWallet } from "./wallet-provider";
import { ProfileSkeleton } from "./skeleton";

function PrivateNote({ payment }: { payment: PaymentRecord }) {
  const [note, setNote] = useState(payment.note || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  const w = useWallet();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/payments/note", { txHash: payment.txHash, note });
      await client.invalidateQueries({
        queryKey: ["account", w.config?.network, w.account],
      });
      setMessage("Private note saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save your note.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="border-t border-white/10 p-6 sm:p-8">
      <label
        htmlFor="receipt-note"
        className="flex items-center gap-2 text-sm font-medium text-white"
      >
        <LockKeyhole size={15} className="text-slate-400" />
        Private note
      </label>
      <p className="mb-4 mt-2 text-xs leading-relaxed text-slate-400">
        Only visible to you. Stored off-chain.
        {payment.operationIndex !== undefined
          ? " Shared across this multi-send transaction."
          : ""}
      </p>
      <textarea
        id="receipt-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="What was this payment for?"
        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.025] p-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-slate-300">
          {message}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="button secondary small"
        >
          {busy ? "Saving…" : "Save note"}
        </button>
      </div>
    </form>
  );
}
function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError("");
    } catch {
      setError("Copy unavailable. Select the text to copy it.");
    }
  }
  return (
    <div className="py-4 border-t border-white/[0.06]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <dt className="text-xs text-slate-400">{label}</dt>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <dd className="break-all font-mono text-xs leading-6 text-slate-300 select-all">
        {value}
      </dd>
      {error && (
        <p role="status" className="mt-2 text-xs text-amber-300">
          {error}
        </p>
      )}
    </div>
  );
}
export function PaymentDetails({
  txHash,
  operation,
}: {
  txHash: string;
  operation?: string;
}) {
  const w = useWallet();
  const valid =
    /^[a-f0-9]{64}$/.test(txHash) &&
    (operation === undefined || /^(0|[1-9]\d?)$/.test(operation));
  const query = useQuery({
    queryKey: [
      "account",
      w.config?.network,
      w.account,
      "payment",
      txHash,
      operation,
    ],
    queryFn: ({ signal }) =>
      api<PaymentRecord>(
        `/api/payments/${txHash}${operation !== undefined ? `?operation=${operation}` : ""}`,
        undefined,
        { signal },
      ),
    enabled: !!w.account && valid,
    refetchOnWindowFocus: true,
    refetchInterval: (q) =>
      q.state.data?.status === "PENDING" ? 10000 : false,
  });
  const payment = query.data;
  const incoming = payment?.recipientAddress === w.account;
  const confirmed = payment?.status === "CONFIRMED";
  const failed = payment?.status === "FAILED";
  const Icon = confirmed ? CheckCircle2 : failed ? XCircle : Clock3;
  const date = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  return (
    <main className="workspace receipt-workspace mx-auto max-w-xl">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to activity
      </Link>
      {!w.account ? (
        <ConnectPrompt />
      ) : !valid ? (
        <div role="alert" className="card">
          <h1>Payment not found</h1>
          <p className="muted">This payment link is invalid.</p>
        </div>
      ) : query.isPending ? (
        <ProfileSkeleton label="Loading payment details…" />
      ) : query.error ? (
        <div role="alert" className="card">
          <h1>Payment details unavailable</h1>
          <p className="muted">{query.error.message}</p>
          <button
            className="button secondary small mt-4"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        payment && (
          <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c100e] shadow-xl">
            <header className="relative border-b border-white/10 px-6 pb-8 pt-9 text-center sm:px-8">
              <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Payment receipt
              </p>
              <span
                className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border ${confirmed ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : failed ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}
              >
                <Icon size={27} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <h1 className="text-base font-medium text-slate-300">
                {failed
                  ? "Payment failed"
                  : confirmed
                    ? incoming
                      ? "Payment received"
                      : "Payment sent"
                    : "Payment pending"}
              </h1>
              <p className="mt-3 break-words text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                ${displayAmount(payment.amount)}
                <span className="ml-2 text-sm font-medium text-slate-400">
                  {payment.assetCode}
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {incoming ? (
                  "To your account"
                ) : (
                  <>
                    To{" "}
                    <span className="font-medium text-white">
                      @{payment.username}
                    </span>
                  </>
                )}
              </p>
              <span
                className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${confirmed ? "bg-emerald-500/10 text-emerald-300" : failed ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300"}`}
              >
                <Icon size={13} />
                {confirmed
                  ? "Confirmed on Stellar"
                  : failed
                    ? "Transfer unsuccessful"
                    : "Waiting for Stellar confirmation"}
              </span>
              {payment.network === "testnet" && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Testnet · Test assets have no monetary value.
                </p>
              )}
              {failed && payment.failureReason && (
                <p role="alert" className="mt-4 text-sm text-rose-300">
                  {payment.failureReason}
                </p>
              )}
            </header>
            <div className="px-6 py-6 sm:px-8">
              <dl>
                <div className="flex justify-between gap-4 pb-4 text-xs">
                  <dt className="text-slate-400">Date</dt>
                  <dd className="text-right text-slate-200">
                    {date(payment.confirmedAt || payment.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/[0.06] py-4 text-xs">
                  <dt className="text-slate-400">Network</dt>
                  <dd className="text-slate-200">
                    Stellar{" "}
                    {payment.network === "testnet" ? "Testnet" : "Mainnet"}
                  </dd>
                </div>
                {payment.operationIndex !== undefined && (
                  <div className="flex justify-between gap-4 border-t border-white/[0.06] py-4 text-xs">
                    <dt className="text-slate-400">Multi-send payment</dt>
                    <dd className="text-slate-200">
                      Operation {payment.operationIndex + 1}
                    </dd>
                  </div>
                )}
                <CopyValue label="From account" value={payment.senderAddress} />
                <CopyValue
                  label="To account"
                  value={payment.recipientAddress}
                />
                <CopyValue label="Transaction hash" value={payment.txHash} />
              </dl>
              <details className="border-t border-white/[0.06] py-4 text-xs text-slate-400">
                <summary className="cursor-pointer">Asset details</summary>
                <p className="mt-3">{payment.assetCode} issuer</p>
                <p className="mt-2 break-all font-mono leading-6 text-slate-300">
                  {payment.assetIssuer}
                </p>
              </details>
              <a
                href={explorer(payment.network, payment.txHash)}
                target="_blank"
                rel="noreferrer"
                className="button secondary mt-2 w-full gap-2"
              >
                View on Stellar Explorer
                <ArrowUpRight size={16} />
              </a>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                Stellar settlement is publicly verifiable.
              </p>
            </div>
            <PrivateNote
              key={`${w.account}:${payment.txHash}`}
              payment={payment}
            />
          </article>
        )
      )}
    </main>
  );
}
