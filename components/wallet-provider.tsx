"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { AppConfig } from "@/lib/config";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
interface WalletContext {
  account: string | null;
  config: AppConfig | null;
  busy: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}
const Context = createContext<WalletContext | null>(null);
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null),
    [config, setConfig] = useState<AppConfig | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<AppConfig>("/api/config")
      .then(async (c) => {
        if (active) setConfig(c);
        try {
          const session = await api<{ account: string }>("/api/session");
          const current = await wallet.getAddress(c);
          if (active && current === session.account) setAccount(current);
        } catch (e) {
          // An unauthenticated session is normal; wallet/network failures need a clear message.
          if (
            active &&
            e instanceof Error &&
            e.message !== "Connect your Stellar wallet to continue."
          )
            setError(e.message);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  const connect = useCallback(async () => {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const a = await wallet.connect(config);
      const c = await api<{ id: string; xdr: string }>("/api/auth/challenge", {
        account: a,
      });
      const signed = await wallet.signTransaction(c.xdr, config);
      await api("/api/auth/login", { id: c.id, signed });
      setAccount(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect wallet.");
    } finally {
      setBusy(false);
    }
  }, [config]);
  const disconnect = useCallback(async () => {
    try {
      await api("/api/auth/logout", {});
    } catch {
      setError(
        "Could not end the server session. Reconnect when the connection returns, then disconnect again.",
      );
    } finally {
      await wallet.disconnect();
      setAccount(null);
    }
  }, []);
  return (
    <Context.Provider
      value={{ account, config, busy, error, connect, disconnect }}
    >
      {error && (
        <div className="global-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useWallet() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing wallet provider.");
  return context;
}
export function ConnectPrompt() {
  const w = useWallet();
  return (
    <div className="empty-state">
      <span className="eyebrow">Your payment identity</span>
      <h2>It starts with your wallet.</h2>
      <p>
        Connect Freighter on Stellar{" "}
        {w.config?.network === "mainnet" ? "Mainnet" : "Testnet"} to continue.
        Your keys stay in your wallet.
      </p>
      <button className="button" onClick={w.connect} disabled={w.busy}>
        {w.busy ? "Waiting for wallet approval…" : "Connect Stellar wallet"}
      </button>
      <p className="tiny">
        You’ll sign a one-time sign-in request. It does not send funds.
      </p>
    </div>
  );
}
