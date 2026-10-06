export function StatsTicker() {
  return (
    <div aria-label="Testnet proof strip" className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3 text-xs text-neutral-300">
      {["Soroban username registry", "Freighter wallet signing", "Verified USDC settlement"].map(text => <span key={text} className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{text} · Testnet</span>)}
    </div>
  );
}
