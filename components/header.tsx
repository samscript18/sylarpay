"use client";
import Link from "next/link";
import { NetworkStatus } from "./network-status";
import { ArrowUpRight } from "lucide-react";
import { useWallet } from "./wallet-provider";
export function Header() {
  const w = useWallet();
  return (
    <header>
      <Link href="/" className="brand">
        <span className="brand-mark">S</span>SkylarPay
        <NetworkStatus tag />
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/dashboard">Overview</Link>
        <Link href="/send">Send</Link>
        <Link href="/receive">Receive</Link>
        <Link href="/cash-out">Cash out</Link>
      </nav>
      <button
        className="button small"
        onClick={() => (w.account ? w.disconnect() : w.connect())}
        disabled={w.busy}
      >
        {w.busy
          ? "Connecting…"
          : w.account
            ? `${w.account.slice(0, 4)}…${w.account.slice(-4)}`
            : "Connect wallet"}
        <ArrowUpRight size={15} />
      </button>
    </header>
  );
}
