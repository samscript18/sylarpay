"use client";
import { LoadingStatus, Skeleton } from "./skeleton";
import { createContext, useContext, useState, useEffect } from "react";
import { useStore } from "zustand";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createWalletStore } from "@/lib/wallet-store";
import { bindAccountInvalidation } from "@/lib/account-invalidation";
import type { AppConfig } from "@/lib/config";
const Context = createContext<ReturnType<typeof createWalletStore> | null>(
  null,
);
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  const [store] = useState(createWalletStore);
  return (
    <QueryClientProvider client={client}>
      <Context.Provider value={store}>
        <WalletSession>{children}</WalletSession>
      </Context.Provider>
    </QueryClientProvider>
  );
}
function WalletSession({ children }: { children: React.ReactNode }) {
  const w = useWallet(),
    client = useQueryClient();
  const { setConfig, restore, setError } = w;
  const network = w.config?.network;
  useEffect(() => {
    if (!w.account || !network) return;
    return bindAccountInvalidation(client, network, w.account);
  }, [client, w.account, network]);
  const config = useQuery({
    queryKey: ["config"],
    queryFn: ({ signal }) =>
      api<AppConfig>("/api/config", undefined, { signal, timeout: 10000 }),
    staleTime: Infinity,
  });
  useEffect(() => {
    if (config.data) {
      setConfig(config.data);
      void restore(config.data);
    }
  }, [config.data, setConfig, restore]);
  useEffect(() => {
    if (config.error) setError(config.error.message);
  }, [config.error, setError]);
  useEffect(() => {
    // Private query data must not survive wallet/session changes.
    client.removeQueries({
      predicate: (query) =>
        ["account", "withdrawal"].includes(String(query.queryKey[0])) &&
        (query.queryKey[1] !== w.config?.network ||
          query.queryKey[2] !== w.account),
    });
  }, [w.account, w.config?.network, client]);
  return (
    <>
      {w.error && (
        <div className="global-error" role="alert">
          {w.error}
          <button onClick={() => w.setError("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {w.busy && w.message && (
        <div className="narrow">
          <LoadingStatus>{w.message}</LoadingStatus>
        </div>
      )}
      {children}
    </>
  );
}
export function useWallet() {
  const store = useContext(Context);
  if (!store) throw new Error("Missing wallet provider.");
  return useStore(store);
}
export function ConnectPrompt() {
  const w = useWallet();
  return (
    <div className="empty-state relative overflow-hidden group">
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-60 h-60 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <span className="eyebrow mb-4">
        <span className="dot" />
        Non-Custodial Stellar Connection
      </span>

      <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-2">
        It starts with your wallet.
      </h2>

      <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6 font-normal leading-relaxed">
        Connect Freighter on Stellar{" "}
        <span className="text-emerald-400 font-sans">
          {w.config?.network === "mainnet" ? "Mainnet" : "Testnet"}
        </span>{" "}
        to continue. Your keys never leave your device.
      </p>

      <button
        className="button inline-flex items-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
        onClick={w.connect}
        disabled={w.busy}
      >
        {w.busy ? (
          <>
            <Skeleton className="h-2 w-8" />
            <span>Waiting for wallet approval…</span>
          </>
        ) : (
          <span>Connect Stellar wallet</span>
        )}
      </button>

      <p className="tiny text-neutral-500 mt-4 font-sans">
        You’ll sign a one-time cryptographic authentication request. No funds
        move.
      </p>
    </div>
  );
}
