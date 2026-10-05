"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Wallet, Menu, X } from "lucide-react";
import { useWallet } from "./wallet-provider";
import { Logo } from "./logo";
import { usePathname } from "next/navigation";

export function Header() {
	const w = useWallet();
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const links = [
		{ href: "/dashboard", label: "Overview" },
		{ href: "/send", label: "Send" },
		{ href: "/receive", label: "Receive" },
		{ href: "/cash-out", label: "Cash out" },
		{ href: "/claim", label: "Claim @name" },
	];

	return (
		<header className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
			<nav
				aria-label="Main navigation"
				className="pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-white/10 bg-[#050906]/85 p-2 pl-4 sm:pl-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5"
			>
				{/* Brand Logo */}
				<Link href="/" className="inline-flex items-center" aria-label="SylarPay home">
					<Logo size="sm" badge={w.config?.network === "testnet" ? "Testnet" : undefined} />
				</Link>

				{/* Desktop Nav Links */}
				<div className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
					{links.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link key={link.href} href={link.href} className={`transition-colors py-1 relative ${isActive ? "text-white font-semibold" : "hover:text-white"}`}>
								{link.label}
								{isActive && <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-emerald-400" />}
							</Link>
						);
					})}
				</div>

				{/* Right CTA / Wallet Button */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="group relative flex items-center gap-2 rounded-full border border-white/10 bg-[#0a120e] px-4 py-2 text-xs font-medium text-white transition-all hover:bg-[#0f1d16] hover:border-emerald-500/40 active:scale-[0.98] disabled:opacity-50"
						onClick={() => (w.account ? w.disconnect() : w.connect())}
						disabled={w.busy}
						title={w.account ? `Connected: ${w.account}` : "Connect Stellar Wallet"}
					>
						{w.account ? (
							<>
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
								</span>
								<span className="font-sans text-[11px] text-emerald-300">
									{w.account.slice(0, 4)}…{w.account.slice(-4)}
								</span>
							</>
						) : (
							<>
								<Wallet size={13} className="text-emerald-400" />
								<span>{w.busy ? "Connecting…" : "Connect wallet"}</span>
								<ArrowUpRight size={12} className="text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
							</>
						)}
					</button>

					{/* Mobile Menu Toggle */}
					<button type="button" className="md:hidden p-2 text-neutral-400 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation">
						{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
					</button>
				</div>
			</nav>

			{/* Mobile Drawer Menu */}
			{mobileMenuOpen && (
				<div className="pointer-events-auto fixed inset-x-4 top-20 rounded-3xl border border-white/10 bg-[#050a07]/95 p-6 shadow-2xl backdrop-blur-2xl md:hidden">
					<div className="flex flex-col gap-4 text-sm font-medium text-neutral-300">
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								onClick={() => setMobileMenuOpen(false)}
								className={`py-2 px-3 rounded-xl transition-colors ${pathname === link.href ? "bg-emerald-500/10 text-emerald-300" : "hover:bg-white/5"}`}
							>
								{link.label}
							</Link>
						))}
					</div>
				</div>
			)}
		</header>
	);
}
