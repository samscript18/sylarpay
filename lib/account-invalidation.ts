import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

const accountMutations = new Set([
  "/api/payments/submit",
  "/api/payments/verify",
  "/api/payments/note",
  "/api/multi-payments/submit",
  "/api/multi-payments/verify",
  "/api/trustline-submit",
  "/api/registry/submit",
  "/api/profile",
  "/api/withdrawals/fund",
]);

export function bindAccountInvalidation(
  client: QueryClient,
  network: string,
  account: string,
) {
  const interceptor = apiClient.interceptors.response.use((response) => {
    if (
      response.config.method?.toLowerCase() === "post" &&
      accountMutations.has(response.config.url || "")
    ) {
      // Refetch the indexed record and actual balance; never invent either in the cache.
      void client.invalidateQueries({
        queryKey: ["account", network, account],
      });
    }
    return response;
  });
  return () => apiClient.interceptors.response.eject(interceptor);
}
