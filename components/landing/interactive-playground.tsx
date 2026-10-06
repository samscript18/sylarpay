"use client";
import React, { useState } from "react";
import { api } from "@/lib/api";
import type { Recipient } from "@/lib/payment-client";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";

export function InteractivePlayground() {
	const [testUser, setTestUser] = useState("sam");
	const [testAmount, setTestAmount] = useState("100.00");
	const [isResolving, setIsResolving] = useState(false);
	const [resolved, setResolved] = useState<Recipient | null>(null);
	const [error, setError] = useState("");
	const [executed, setExecuted] = useState(false);
	const handleResolve = async () => {
		setIsResolving(true);
		setResolved(null);
		setExecuted(false);
		setError("");
		try {
			setResolved(await api<Recipient>(`/api/users/${encodeURIComponent(testUser)}`));
		} catch (error) {
			setError(error instanceof Error ? error.message : "Username lookup failed. Try again.");
		} finally {
			setIsResolving(false);
		}
	};

	return (
		<section className="mt-32 max-w-5xl mx-auto px-4">
			<div className="relative rounded-3xl border border-emerald-500/25 bg-[#060c08]/95 p-6 md:p-12 shadow-[0_0_50px_rgba(16,185,129,0.15)] backdrop-blur-2xl overflow-hidden ring-1 ring-white/10">
				{/* Glow */}
				<div
					className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
					style={{
						background: "radial-gradient(circle, rgba(16,185,129,0.6) 0%, transparent 70%)",
					}}
					aria-hidden="true"
				/>

				<div className="relative z-10 flex flex-col items-center text-center mb-8">
					<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[10px] font-sans uppercase tracking-wider text-emerald-300">
						<Sparkles size={12} className="text-emerald-400" />
						DEMO • No wallet transaction
					</div>
					<h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-2">Look up a @username. Preview a payment.</h2>
					<p className="text-sm text-neutral-400 max-w-lg font-normal">Look up a registered username without a wallet. The payment preview is illustrative: no transaction is signed or submitted. Freighter is required to send USDC or start cash-out.</p>
				</div>

				{/* Interactive Controls */}
				<div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 max-w-3xl mx-auto mb-8">
					<div className="md:col-span-6 relative">
						<label className="block text-[11px] uppercase font-sans tracking-wider text-neutral-400 mb-1.5 text-left">Test Username</label>
						<div className="relative flex items-center">
							<span className="absolute left-3.5 text-neutral-500 font-sans text-sm">@</span>
							<input
								type="text"
								value={testUser}
                                disabled={isResolving}
								onChange={(e) => { setTestUser(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setResolved(null); setExecuted(false); setError(""); }}
								placeholder="sam"
								className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-24 py-3 font-sans text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
							/>
							<button
								type="button"
								onClick={handleResolve}
								disabled={isResolving}
								className="absolute right-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
							>
								{isResolving ? "Resolving…" : "Resolve"}
							</button>
						</div>
					</div>

					<div className="md:col-span-6 relative">
						<label className="block text-[11px] uppercase font-sans tracking-wider text-neutral-400 mb-1.5 text-left">USDC Amount</label>
						<div className="relative flex items-center">
							<span className="absolute left-3.5 text-neutral-500 font-sans text-sm">$</span>
							<input
								type="text"
								value={testAmount}
								onChange={(e) => setTestAmount(e.target.value)}
								placeholder="100.00"
								className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-16 py-3 font-sans text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
							/>
							<span className="absolute right-3.5 text-xs font-sans text-neutral-400">USDC</span>
						</div>
					</div>
				</div>

				{error && <p role="alert" className="relative z-10 mb-4 text-sm text-amber-200">{error}</p>}
				{/* Resolution Result Card */}
				<div className="relative z-10 max-w-3xl mx-auto rounded-2xl border border-white/10 bg-black/50 p-5 md:p-6 text-left">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
						<div>
							<div className="text-sm font-semibold text-white flex items-center gap-2">
								<span>@{testUser || "username"}</span>
								{resolved?.verified && (
									<span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-sans text-emerald-300">
										<Check size={11} /> Sylar Verified
									</span>
								)}
							</div>
							<div className="text-[11px] font-sans text-neutral-400 mt-1 truncate">
								Stellar account: <span className="text-white">{resolved?.address || "Choose Resolve to look up this username"}</span>
							</div>
						</div>

						<button
							type="button"
							onClick={() => setExecuted(true)}
							disabled={!resolved || isResolving || executed}
							className={`rounded-full px-5 py-2.5 text-xs font-semibold transition-all ${
								executed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white text-black hover:bg-neutral-200"
							}`}
						>
							{executed ? "Simulation shown" : `Simulate payment`}
						</button>
					</div>

					{executed && (
						<div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 font-sans text-xs text-emerald-300 space-y-1 animate-[fadeInUp_0.4s_ease-out]">
							<div className="flex items-center gap-2 font-bold text-white">
								<Check size={14} className="text-emerald-400" />
								Illustrative payment preview — no funds sent
							</div>
							<p className="text-neutral-300">Preview amount: {testAmount} USDC. A real payment requires review, Freighter signing, and Stellar ledger verification.</p>
							<Link href={`/@${testUser}`} className="inline-block pt-2 underline">Open payment profile ↗</Link>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
