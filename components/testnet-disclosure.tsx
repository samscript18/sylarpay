import type { StellarNetwork } from "@/lib/config";

export function TestnetDisclosure({ network }: { network?: StellarNetwork }) {
  if (network !== "testnet") return null;
  return (
    <aside aria-label="Testnet demonstration notice" className="relative mb-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-left text-sm leading-relaxed text-amber-100">
      <p>Stellar Testnet. USDC settlement is real and verifiable. Fiat payout is simulated; no NGN rail is live.</p>
      <p className="mt-1 text-xs text-amber-200/80">Test assets have no monetary value. Sending USDC and starting cash-out require Freighter approval.</p>
    </aside>
  );
}
