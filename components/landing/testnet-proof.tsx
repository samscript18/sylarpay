import evidence from "@/docs/LIVE-TEST.json";
import { explorer } from "@/lib/config";

export function TestnetProof() {
  return (
    <section id="proof" aria-label="Existing Testnet settlement proof" className="mx-auto mt-20 max-w-5xl scroll-mt-28">
      <p className="text-xs uppercase tracking-wider text-emerald-300">Independently verifiable</p>
      <h2 className="mt-3 text-3xl font-medium">Proof you can open.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">Existing seeded @sam identity and the earlier verified 150 USDC payment. Recorded on {evidence.checkedAt.slice(0, 10)}; not a new payment, a current balance, or a fiat payout. Testnet resets can invalidate this evidence.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <article className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-lg font-medium">@sam · Soroban identity</h3>
          <p className="mt-2 text-xs text-emerald-300">Sylar Verified in the recorded demo · not government KYC</p>
          <dl className="mt-5 space-y-4 text-xs"><div><dt className="text-neutral-400">Recorded owner</dt><dd className="mt-1 break-all text-neutral-200">{evidence.recipient}</dd></div><div><dt className="text-neutral-400">Contract · Stellar Testnet</dt><dd className="mt-1 break-all text-neutral-200">{evidence.contractId}</dd></div></dl>
          <a href={`https://stellar.expert/explorer/testnet/contract/${evidence.contractId}`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-sm text-emerald-300">View UsernameRegistry ↗</a>
        </article>
        <article className="min-w-0 rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-6">
          <h3 className="text-lg font-medium">150 USDC · Confirmed on Stellar</h3>
          <p className="mt-2 text-xs text-emerald-300">Real Testnet settlement · no monetary value</p>
          <p className="mt-5 text-sm leading-relaxed text-neutral-400">Verification checked the network, sender, current recipient, exact amount and USDC issuer against the successful ledger transaction.</p>
          <p className="mt-4 break-all text-xs text-neutral-300">{evidence.txHash}</p>
          <a href={explorer("testnet", evidence.txHash)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-sm text-emerald-300">View verified 150 USDC transaction ↗</a>
        </article>
      </div>
      <details className="mt-5 rounded-2xl border border-white/10 p-5">
        <summary className="cursor-pointer text-sm font-medium">What’s real, and what’s simulated?</summary>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-emerald-300">Real Testnet functionality</dt><dd className="mt-2 leading-relaxed text-neutral-400">Username registration/resolution, Freighter signing, USDC payments, ledger verification and QR payment links.</dd></div>
          <div><dt className="text-amber-200">Integration and simulation</dt><dd className="mt-2 leading-relaxed text-neutral-400">SEP-10/SEP-24 adapter implemented. SDF’s reference flow simulates USD fiat payout; live end-to-end withdrawal rehearsal remains manual. NGN bank payout requires a production provider.</dd></div>
        </dl>
      </details>
    </section>
  );
}
