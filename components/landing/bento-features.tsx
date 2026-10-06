import { ArrowRight, ShieldCheck, Globe2, Lock } from "lucide-react";

export function BentoFeatures() {
  return (
    <section className="mx-auto mt-20 max-w-5xl">
      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-[#070d0a] p-6 sm:p-8">
          <ShieldCheck className="mb-5 text-emerald-300" size={24} />
          <h2 className="text-2xl font-medium">Names don’t become stale.</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">SylarPay checks the current owner in Soroban before you sign, before submission, and again when verifying the payment. If ownership changes, you review the destination again.</p>
          <div aria-label="Username payment path" className="mt-6 flex flex-wrap items-center gap-2 text-xs text-emerald-200">
            {["@username", "Soroban registry", "Current wallet", "Freighter", "Stellar"].map((step, i) => <span key={step} className="inline-flex items-center gap-2">{i > 0 && <ArrowRight size={12} aria-hidden="true" />}<span className="rounded-lg bg-white/5 px-2 py-2">{step}</span></span>)}
          </div>
        </article>
        <article className="rounded-3xl border border-white/10 bg-[#070d0a] p-6 sm:p-8">
          <Globe2 className="mb-5 text-emerald-300" size={24} />
          <h2 className="text-2xl font-medium">Cash out locally</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">Connect to a compatible Stellar anchor to redeem USDC into supported local currencies.</p>
          <p className="mt-4 text-sm text-neutral-300">NGN availability depends on the configured anchor.</p>
          <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200">Testnet reference demo: USD · simulated fiat payout. NGN is not supported by this reference anchor.</p>
          <p className="mt-5 text-xs text-emerald-300">SEP-24 • Anchor-powered</p>
        </article>
      </div>
      <article className="mt-5 rounded-3xl border border-white/10 bg-[#070d0a] p-6 sm:p-8">
        <h2 className="flex items-center gap-3 text-2xl font-medium"><Lock size={22} className="text-emerald-300" />Private Context. Public Settlement.</h2>
        <div className="mt-5 grid gap-5 text-sm md:grid-cols-2">
          <div><h3 className="font-medium text-white">Public on Stellar</h3><p className="mt-2 leading-relaxed text-neutral-400">Transaction hash, amount, timestamp, wallet addresses and username ownership.</p></div>
          <div><h3 className="font-medium text-white">Private inside the app</h3><p className="mt-2 leading-relaxed text-neutral-400">Your account’s payment notes and invoice context. Notes stay off-chain and are not added to the Stellar memo.</p></div>
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 text-xs text-neutral-400">Stellar transactions are public. SylarPay keeps your personal payment context private.</p>
      </article>
    </section>
  );
}
