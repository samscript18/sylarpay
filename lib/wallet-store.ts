import { createStore } from "zustand/vanilla";
import { api, ApiError } from "./api";
import { wallet } from "./wallet";
import type { AppConfig } from "./config";
export interface WalletState {
  account: string | null;
  config: AppConfig | null;
  busy: boolean;
  error: string;
  message: string;
  setConfig: (config: AppConfig) => void;
  setError: (message: string) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  restore: (config: AppConfig) => Promise<void>;
}
export function createWalletStore() {
  let generation = 0;
  return createStore<WalletState>()((set, get) => ({
    account: null,
    config: null,
    busy: false,
    error: "",
    message: "",
    setConfig: (config) => set({ config }),
    setError: (error) => set({ error }),
    async connect() {
      if (get().busy) return;
      const attempt = ++generation;
      set({ busy: true, error: "", message: "Loading wallet configuration…" });
      try {
        const config =
          get().config ||
          (await api<AppConfig>("/api/config", undefined, { timeout: 10000 }));
        set({ config, message: "Open Freighter to approve wallet access…" });
        const account = await wallet.connect(config);
        if (generation !== attempt) return;
        set({ message: "Preparing secure sign-in…" });
        const challenge = await api<{ id: string; xdr: string }>(
          "/api/auth/challenge",
          { account },
          { timeout: 15000 },
        );
        set({ message: "Approve the sign-in request in Freighter…" });
        const signed = await wallet.signTransaction(challenge.xdr, config);
        const session = await api<{ account: string }>(
          "/api/auth/login",
          { id: challenge.id, signed },
          { timeout: 20000 },
        );
        if (session.account !== account)
          throw new Error(
            "Sign-in returned a different account. Reconnect your wallet.",
          );
        if (generation === attempt) set({ account });
      } catch (e) {
        if (generation === attempt)
          set({
            account: null,
            error: e instanceof Error ? e.message : "Could not connect wallet.",
          });
      } finally {
        if (generation === attempt) set({ busy: false, message: "" });
      }
    },
    async restore(config) {
      const attempt = generation;
      try {
        const session = await api<{ account: string }>(
          "/api/session",
          undefined,
          { timeout: 10000 },
        );
        const current = await wallet.getAddress(config);
        if (
          generation === attempt &&
          !get().busy &&
          current === session.account
        )
          set({ account: current });
      } catch (e) {
        if (
          generation === attempt &&
          !(e instanceof ApiError && e.status === 401) &&
          e instanceof Error
        )
          set({ error: e.message });
      }
    },
    async disconnect() {
      ++generation;
      set({ account: null, busy: false, message: "", error: "" });
      await wallet.disconnect();
      try {
        await api("/api/auth/logout", {}, { timeout: 10000 });
      } catch {
        set({
          error:
            "Could not end the server session. Reconnect when the connection returns, then disconnect again.",
        });
      }
    },
  }));
}
