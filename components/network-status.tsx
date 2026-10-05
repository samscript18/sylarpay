"use client";
import React from "react";
import { useWallet } from "./wallet-provider";

export function NetworkStatus({ tag = false }: { tag?: boolean }) {
  const { config } = useWallet();
  return tag ? (
    <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-950/40 text-emerald-300">
      {config?.network === "mainnet" ? "MAINNET" : "TESTNET"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-xs font-sans text-neutral-400">
      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>
        {config?.network === "mainnet"
          ? "Stellar Mainnet"
          : "Stellar Testnet · Test assets have no monetary value"}
      </span>
    </span>
  );
}
