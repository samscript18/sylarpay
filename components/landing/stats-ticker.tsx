import React from "react";
import { ArrowUpRight } from "lucide-react";

export function StatsTicker() {
  const stats = [
    {
      label: "Settlement Speed",
      value: "1.8",
      unit: "sec",
      detail: "Stellar Consensus Protocol",
      href: "https://stellar.org/learn/stellar-consensus-protocol",
    },
    {
      label: "Ledger Network Fee",
      value: "<0.0001",
      unit: "USDC",
      detail: "100 Stroops per tx",
      href: "https://developers.stellar.org/docs/learn/fundamentals/fees-metering",
    },
    {
      label: "Identity Layer",
      value: "Soroban",
      unit: "WASM",
      detail: "UsernameRegistry Contract",
      href: "https://soroban.stellar.org/",
    },
    {
      label: "Local Off-Ramp",
      value: "SEP-24",
      unit: "Rail",
      detail: "Supported fiat varies by anchor",
      href: "https://stellar.org/developers-blog/sep-24-hosted-deposit-and-withdrawal",
    },
  ];

  return (
    <div className="mx-auto mt-14 max-w-5xl">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:grid-cols-4 backdrop-blur-xl shadow-2xl">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-1.5 bg-[#050906]/90 px-4 py-6 transition-colors hover:bg-[#071109]"
          >
            <dt className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
              {stat.label}
            </dt>
            <dd className="font-sans text-xl md:text-2xl font-semibold text-white tabular-nums tracking-tight">
              {stat.value}
              <span className="ml-1.5 text-xs font-normal text-emerald-400">
                {stat.unit}
              </span>
            </dd>
            <dd className="text-[11px] text-neutral-500 hover:text-emerald-400 transition-colors">
              <a
                href={stat.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-sans"
              >
                {stat.detail}
                <ArrowUpRight size={11} />
              </a>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3.5 text-center font-sans text-[11px] text-neutral-500">
        Settled directly on Stellar Ledger · No custodial intermediaries · Live on Testnet
      </p>
    </div>
  );
}
