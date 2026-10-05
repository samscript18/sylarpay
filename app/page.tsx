import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { AuroraHeroBackground } from "@/components/landing/aurora-hero-background";
import { InteractiveHeroCard } from "@/components/landing/interactive-hero-card";
import { StatsTicker } from "@/components/landing/stats-ticker";
import { BentoFeatures } from "@/components/landing/bento-features";
import { InteractivePlayground } from "@/components/landing/interactive-playground";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FinalCta } from "@/components/landing/final-cta";

export default function Home() {
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden pt-28 md:pt-36">
      {/* Crazy Animated Background Engine */}
      <AuroraHeroBackground />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-5xl text-center pt-4 md:pt-10">
          {/* Eyebrow Badge */}
          <div className="animate-[fadeInUp_0.8s_ease-out_both] mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-950/20 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            The Consumer Payment Layer on Stellar
          </div>

          {/* Main H1 Headline */}
          <h1 className="animate-[fadeInUp_0.8s_ease-out_0.1s_both] mb-6 text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight text-white leading-[1.02]">
            Get paid globally. <br />
            Pay locally. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#d7edb5] to-emerald-400">
              Just use @username.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-[fadeInUp_0.8s_ease-out_0.2s_both] mx-auto mb-10 max-w-2xl text-base sm:text-lg md:text-xl font-light text-neutral-400 tracking-tight leading-relaxed">
            Turn your Stellar account into a simple human-readable payment identity.
            Receive USDC through a link or QR code — then cash out in supported local currencies
            through a compatible anchor.
          </p>

          {/* Primary Action Buttons */}
          <div className="animate-[fadeInUp_0.8s_ease-out_0.3s_both] flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/claim"
              className="group relative flex items-center gap-2 rounded-full bg-white text-black px-8 py-3.5 text-sm font-semibold transition-all hover:bg-neutral-200 active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.25)]"
            >
              <span>Claim your @username</span>
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>

            <a
              href="#how"
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-medium text-neutral-300 transition-all hover:bg-white/10 hover:text-white"
            >
              <span>See how it works</span>
              <ArrowRight size={15} className="text-neutral-400 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* 3D Moving Showcase Card on Hover */}
          <div className="animate-[fadeInUp_0.8s_ease-out_0.4s_both]">
            <InteractiveHeroCard />
          </div>

          {/* 4-Column Live Metric Stats Ticker */}
          <div className="animate-[fadeInUp_0.8s_ease-out_0.5s_both]">
            <StatsTicker />
          </div>
        </section>

        {/* 12-COLUMN BENTO GRID */}
        <BentoFeatures />

        {/* INTERACTIVE PLAYGROUND / SANDBOX */}
        <InteractivePlayground />

        {/* FOUR STEPS SECTION */}
        <HowItWorks />

        {/* FINAL CLOSING CTA */}
        <FinalCta />
      </main>
    </div>
  );
}
