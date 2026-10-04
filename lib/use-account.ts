"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useWallet } from "@/components/wallet-provider";
import type { Profile, PaymentRecord } from "@/server/db";
import type { Recipient } from "./payment-client";
export interface AccountData {
  account: string;
  identity: Recipient | null;
  profile: Profile | null;
  balance: string;
  payments: PaymentRecord[];
}
export function useAccount() {
  const { account } = useWallet(),
    [data, setData] = useState<AccountData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError("");
    try {
      setData(await api<AccountData>("/api/me"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your account.");
    } finally {
      setLoading(false);
    }
  }, [account]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  return {
    data: account && data?.account === account ? data : null,
    error,
    loading,
    refresh,
  };
}
