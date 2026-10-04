"use client";
import { FundWithdrawal } from "./fund-withdrawal";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { amountSchema, units, displayAmount } from "@/lib/validation";
import { wallet } from "@/lib/wallet";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import type { AnchorInfo, WithdrawalSession } from "@/server/offramp";
export function CashOut() {
  const w = useWallet();
  return <CashOutSession key={`${w.account}:${w.config?.network}`} />;
}
function CashOutSession() {
  const w = useWallet(),
    a = useAccount(),
    [info, setInfo] = useState<AnchorInfo | null>(null),
    [amount, setAmount] = useState(""),
    [currency, setCurrency] = useState("NGN"),
    [session, setSession] = useState<WithdrawalSession | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const idem = useRef("");
  useEffect(() => {
    if (!w.account) return;
    const id = sessionStorage.getItem(
      `skylar_withdrawal_${w.account}_${w.config?.network}`,
    );
    if (id)
      api<WithdrawalSession>(`/api/withdrawals/${id}`)
        .then(setSession)
        .catch((e) => setError(e.message));
  }, [w.account, w.config?.network]);
  useEffect(() => {
    api<AnchorInfo>("/api/anchors")
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (
      !session ||
      ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(session.status)
    )
      return;
    let active = true;
    let attempts = 0;
    let checking = false;
    const timer = setInterval(async () => {
      if (checking) return;
      if (++attempts > 30) {
        clearInterval(timer);
        return;
      }
      checking = true;
      try {
        const r = await api<WithdrawalSession>(
          `/api/withdrawals/${session.id}`,
        );
        if (active) setSession(r);
        if (["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(r.status))
          clearInterval(timer);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Could not check withdrawal status.",
          );
      } finally {
        checking = false;
      }
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session?.id, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!w.config) return;
    setBusy(true);
    setError("");
    try {
      amountSchema.parse(amount);
      if (!info?.demo && a.data && units(amount) > units(a.data.balance))
        throw new Error("Insufficient USDC balance.");
      const retryKey = `skylar_withdrawal_request_${w.account}_${w.config.network}_${amount}_${currency}`;
      if (!idem.current)
        idem.current = sessionStorage.getItem(retryKey) || crypto.randomUUID();
      sessionStorage.setItem(retryKey, idem.current);
      let signed: string | undefined;
      if (info?.authentication) {
        setMessage("Authenticating with the payment partner…");
        const c = await api<{ xdr: string }>("/api/anchor-auth", {});
        signed = await wallet.signTransaction(c.xdr, w.config);
      }
      setMessage("Starting withdrawal…");
      const r = await api<WithdrawalSession>("/api/withdrawals", {
        amount,
        currency,
        idempotencyKey: idem.current,
        signed,
      });
      setSession(r);
      sessionStorage.setItem(
        `skylar_withdrawal_${w.account}_${w.config.network}`,
        r.id,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start withdrawal.");
    } finally {
      setBusy(false);
      setMessage("");
    }
  }
  async function refresh() {
    if (!session) return;
    setBusy(true);
    try {
      setSession(
        await api<WithdrawalSession>(`/api/withdrawals/${session.id}`),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check status.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace">
      <div className="page-heading narrow">
        <span className="eyebrow">Your work. Your local currency.</span>
        <h1>Cash out</h1>
        <p>Through a compatible Stellar anchor.</p>
      </div>
      {!w.account ? (
        <ConnectPrompt />
      ) : (
        <div className="card narrow">
          {info?.demo && (
            <div className="notice">
              <strong>Demo Off-Ramp</strong>
              <br />
              UI simulation only. No USDC is transferred and no bank payout
              occurs.
            </div>
          )}
          {session ? (
            <>
              <h2 className="section-title">
                {session.demo ? "Demo withdrawal" : "Your withdrawal"}
              </h2>
              <div className="balance-value">
                {displayAmount(session.amount)}
                <span>USDC → {session.currency}</span>
              </div>
              <div className="summary-row">
                <span>Provider</span>
                <strong>{session.provider}</strong>
              </div>
              <div className="summary-row">
                <span>Status</span>
                <strong>{session.status.replaceAll("_", " ")}</strong>
              </div>
              {session.status === "AWAITING_KYC" && (
                <p className="notice">
                  Provider verification required. Continue with the payment
                  partner.
                </p>
              )}
              {session.amountOut && (
                <div className="summary-row">
                  <span>Provider payout amount</span>
                  <strong>{session.amountOut}</strong>
                </div>
              )}
              {session.amountFee && (
                <div className="summary-row">
                  <span>Provider fee</span>
                  <strong>{session.amountFee}</strong>
                </div>
              )}
              <p className="tiny">Transaction ID</p>
              <div className="account">{session.anchorId || session.id}</div>
              {session.withdrawalAccount && (
                <div className="notice">
                  The provider is awaiting a USDC transfer. Follow its hosted
                  instructions.
                  <div className="account">{session.withdrawalAccount}</div>
                  {session.withdrawalMemo && (
                    <p>
                      Required memo ({session.withdrawalMemoType}):{" "}
                      {session.withdrawalMemo}
                    </p>
                  )}
                </div>
              )}
              {session.status === "AWAITING_USER_TRANSFER" && !session.demo && (
                <FundWithdrawal id={session.id} />
              )}
              {session.interactiveUrl && (
                <p>
                  <a
                    className="button full"
                    href={session.interactiveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {session.demo
                      ? "Open demo experience"
                      : "Continue with payment partner"}{" "}
                    ↗
                  </a>
                </p>
              )}
              <button
                className="button secondary full"
                disabled={busy}
                onClick={refresh}
              >
                Check withdrawal status
              </button>
              <p className="tiny">
                {session.demo
                  ? "Demo remains processing. No real payout is simulated."
                  : "Complete verification in the anchor’s secure hosted flow. Status and payout information come from the provider."}
              </p>
            </>
          ) : info?.available ? (
            <form onSubmit={start}>
              <div className="summary-row">
                <span>Available balance</span>
                <strong>
                  {a.data ? displayAmount(a.data.balance) : "Checking…"} USDC
                </strong>
              </div>
              <div className="summary-row">
                <span>Provider</span>
                <strong>{info.name}</strong>
              </div>
              <div className="field" style={{ marginTop: 20 }}>
                <label htmlFor="withdraw-amount">Amount · USDC</label>
                <input
                  id="withdraw-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    idem.current = "";
                  }}
                  placeholder="150.00"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="currency">Local currency</label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    idem.current = "";
                  }}
                >
                  <option
                    value="NGN"
                    disabled={!info.currencies.includes("NGN")}
                  >
                    NGN {info.currencies.includes("NGN") ? "" : "— unavailable"}
                  </option>
                  {info.currencies
                    .filter((v) => v !== "NGN")
                    .map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                </select>
              </div>
              {!info.currencies.includes("NGN") && (
                <p className="notice">
                  NGN cash out is currently unavailable with this provider.
                </p>
              )}
              <p className="notice">
                Rates, fees, and payout estimates will be shown by the anchor in
                its hosted experience. A withdrawal request does not mean fiat
                has been received.
              </p>
              <button
                className="button full"
                disabled={busy || !info.currencies.includes(currency)}
              >
                {info.demo ? "Start demo withdrawal" : "Continue to cash out"}
              </button>
            </form>
          ) : (
            <div
              className="empty-state"
              style={{ border: 0, padding: 15, margin: 0 }}
            >
              <h2>A local bridge is coming.</h2>
              <p>
                Cash out is currently unavailable. A compatible anchor must be
                configured and support your currency.
              </p>
            </div>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
