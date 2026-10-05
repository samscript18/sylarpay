"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useWallet } from "@/components/wallet-provider";
import type { Profile, PaymentRecord } from "@/server/db";
import type { Recipient } from "./payment-client";
export interface AccountData {
  account: string;
  identity: Recipient | null;
  profile: Profile | null;
  balance: string;
  usdcTrustline: "missing" | "unauthorized" | "ready";
  payments: PaymentRecord[];
}
export function useAccount() {
  const { account, config } = useWallet();
  const query = useQuery({
    queryKey: ["account", config?.network, account],
    queryFn: ({ signal }) => api<AccountData>("/api/me", undefined, { signal }),
    enabled: !!account,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
  return {
    data: account && query.data?.account === account ? query.data : null,
    error: query.error?.message || "",
    loading: !!account && query.isPending,
    refreshing: query.isFetching,
    refresh: async () => {
      const result = await query.refetch();
      if (result.error) throw result.error;
      return result.data;
    },
  };
}
