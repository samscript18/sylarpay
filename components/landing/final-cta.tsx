import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

export function FinalCta() {
  return (
    <section className="mt-36 mb-24 max-w-5xl mx-auto px-4 relative">
      <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-b from-[#0a140f] to-[#040705] p-10 md:p-16 text-center shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-white/5">
        {/* Intense Radial Emerald Aura */}
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-40 blur-[140px]"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.7) 0%, rgba(34, 99, 75, 0.4) 50%, transparent 75%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[10px] font-sans uppercase tracking-wider text-emerald-300">
            <Sparkles size={12} className="text-emerald-400" />
            Claim Your Name Before It&apos;s Gone
          </div>

          <h2 className="text-3xl md:text-6xl font-medium tracking-tight text-white mb-6 leading-tight">
            Your next payment <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-[#d7edb5]">
              starts with your name.
            </span>
          </h2>

          <p className="text-sm md:text-base text-neutral-400 mb-8 font-normal max-w-lg mx-auto">
            People understand usernames. Share yours, receive USDC, and verify the payment on Stellar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/claim"
              className="group relative flex items-center gap-2 rounded-full bg-white text-black px-8 py-3.5 text-sm font-semibold transition-all hover:bg-neutral-200 active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              <span>Get your @username</span>
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-neutral-300 transition-all hover:bg-white/10 hover:text-white"
            >
              Open Dashboard
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-sans text-neutral-500">
            <ShieldCheck size={14} className="text-emerald-400" />
            Yours to own · Non-custodial · Settled on Stellar
          </div>
        </div>
      </div>
    </section>
  );
}
