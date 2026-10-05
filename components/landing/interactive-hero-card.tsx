"use client";
import React, { useState } from "react";
import { Tilt3D } from "./tilt-3d";
import { QRCodeSVG } from "qrcode.react";
import { Check, ArrowUp, ArrowDown, ArrowRight, ShieldCheck, QrCode, AtSign, Copy, Share2, Zap } from "lucide-react";

export function InteractiveHeroCard() {
	const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
	const [amount, setAmount] = useState("150.00");
	const [isSimulating, setIsSimulating] = useState(false);
	const [simulatedSuccess, setSimulatedSuccess] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleSimulate = () => {
		setIsSimulating(true);
		setSimulatedSuccess(false);
		setTimeout(() => {
			setIsSimulating(false);
			setSimulatedSuccess(true);
			setTimeout(() => setSimulatedSuccess(false), 3500);
		}, 1100);
	};

	const handleCopy = () => {
		navigator.clipboard?.writeText("https://sylarpay.app/@sam");
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="relative w-full max-w-lg mx-auto [perspective:1200px]">
			{/* 3D Floating Satellites (Lifted above the card in Z space) */}
			<div className="absolute -top-6 -right-3 md:-right-8 z-20 pointer-events-none animate-[floatSlow_5s_easeInOut_infinite]">
				<div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-[#06110a]/90 px-3.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
					<span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
						<ArrowDown size={14} strokeWidth={2.5} />
					</span>
					<div>
						<div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/80">Payment Received</div>
						<div className="font-mono text-xs font-semibold text-white">+ $150.00 USDC</div>
					</div>
				</div>
			</div>

			<div className="absolute -bottom-6 -left-3 md:-left-8 z-20 pointer-events-none animate-[floatSlow_6s_easeInOut_infinite_1.5s]">
				<div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#090e0b]/90 px-3.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
					<div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#22634b]/30 text-[#d7edb5]">
						<Zap size={14} />
					</div>
					<div>
						<div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Cash Out Rail</div>
						<div className="text-xs font-medium text-neutral-200">SEP-24 · USDC → NGN</div>
					</div>
				</div>
			</div>

			{/* Main 3D Card with Loofta UI feels */}
			<Tilt3D maxTilt={11} scale={1.015} className="rounded-3xl p-1">
				<div className="relative rounded-[26px] border border-white/10 bg-[#0c100e]/95 p-6 sm:p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/5 overflow-hidden text-left">
					{/* Subtle Ambient Card Gradient */}
					<div
						className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-35 blur-3xl"
						style={{
							background: "radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(34, 99, 75, 0.2) 60%, transparent 80%)",
						}}
						aria-hidden="true"
					/>

					{/* Top Mode Switcher (Exact Loofta pay.loofta.xyz Capsule) */}
					<div className="flex items-center justify-between gap-3 mb-6">
						<div className="relative flex-1 flex rounded-2xl p-1 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.06] overflow-hidden">
							{/* Sliding Pill */}
							<div
								aria-hidden="true"
								className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] bg-gradient-to-b from-white/[0.08] to-white/[0.03] shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-white/[0.08] ${
									activeTab === "send" ? "translate-x-0" : "translate-x-full"
								}`}
							/>

							<button
								type="button"
								onClick={() => setActiveTab("send")}
								className="group relative z-10 flex-1 whitespace-nowrap rounded-xl px-4 py-2 inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-300"
							>
								<span className="relative shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full">
									<span
										className={`absolute inset-0 rounded-full transition-all duration-300 ${
											activeTab === "send"
												? "bg-gradient-to-br from-[#10b981] via-[#22634b] to-[#165b43] shadow-[0_10px_20px_rgba(16,185,129,0.3)] scale-[1.04]"
												: "bg-white/[0.06]"
										}`}
									/>
									<span className={`relative z-10 flex items-center justify-center ${activeTab === "send" ? "text-white" : "text-slate-400"}`}>
										<ArrowUp size={13} strokeWidth={2.5} />
									</span>
								</span>
								<span className={activeTab === "send" ? "text-white" : "text-slate-400"}>Send</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveTab("receive")}
								className="group relative z-10 flex-1 whitespace-nowrap rounded-xl px-4 py-2 inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-300"
							>
								<span className="relative shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full">
									<span
										className={`absolute inset-0 rounded-full transition-all duration-300 ${
											activeTab === "receive"
												? "bg-gradient-to-br from-[#10b981] via-[#22634b] to-[#165b43] shadow-[0_10px_20px_rgba(16,185,129,0.3)] scale-[1.04]"
												: "bg-white/[0.06]"
										}`}
									/>
									<span className={`relative z-10 flex items-center justify-center ${activeTab === "receive" ? "text-white" : "text-slate-400"}`}>
										<ArrowDown size={13} strokeWidth={2.5} />
									</span>
								</span>
								<span className={activeTab === "receive" ? "text-white" : "text-slate-400"}>Receive</span>
							</button>
						</div>

						<div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
							<span className="relative flex h-1.5 w-1.5">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
							</span>
							STELLAR SCP
						</div>
					</div>

					{/* TAB 1: SEND VIEW */}
					{activeTab === "send" && (
						<div className="space-y-5 animate-[fadeInUp_0.2s_ease-out]">
							<div className="flex items-center justify-between text-xs text-slate-400">
								<span className="font-medium">Amount</span>
								<span className="font-mono text-emerald-400">USDC · Instant</span>
							</div>

							{/* Huge Typographic Amount Input (Loofta) */}
							<div>
								<div className="flex items-baseline tabular-nums">
									<span className="font-semibold text-slate-500 mr-1 text-4xl sm:text-5xl select-none">$</span>
									<input
										type="text"
										value={amount}
										onChange={(e) => setAmount(e.target.value)}
										className="text-white font-semibold tracking-tight tabular-nums border-0 bg-transparent outline-none p-0 text-5xl sm:text-6xl leading-none w-full"
										aria-label="Simulated amount"
									/>
								</div>

								<div className="flex items-center gap-2 mt-3">
									{["50.00", "150.00", "500.00"].map((v) => (
										<button
											key={v}
											type="button"
											onClick={() => setAmount(v)}
											className={`text-xs font-mono px-2.5 py-1 rounded-full border transition-colors ${
												amount === v
													? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
													: "bg-white/[0.04] border-white/5 text-slate-400 hover:text-white"
											}`}
										>
											${v.replace(".00", "")}
										</button>
									))}
								</div>
							</div>

							{/* Recipient Input (Loofta Style) */}
							<div>
								<div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
									<span className="font-mono uppercase text-[10px] tracking-wider">To</span>
									<span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
										<Check size={11} /> Sylar Verified
									</span>
								</div>

								<div className="relative flex items-center rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-emerald-500/60 focus-within:bg-white/[0.06] transition-all">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-white/10 border border-white/15 text-slate-200">
										<AtSign size={13} className="text-emerald-400" />
									</div>
									<input type="text" defaultValue="sam" readOnly className="h-12 w-full rounded-2xl bg-transparent pl-14 pr-4 text-white text-base font-medium outline-none" />
								</div>
							</div>

							{/* CTA Button */}
							<button
								type="button"
								onClick={handleSimulate}
								disabled={isSimulating}
								className="relative z-10 inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-white font-semibold text-sm transition-all duration-200 ease-out hover:scale-[1.015] active:scale-95 shadow-[0_14px_34px_-10px_rgba(16,185,129,0.55)] bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] cursor-pointer"
							>
								{isSimulating ? (
									<span className="flex items-center gap-2">
										<span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
										Settling on Stellar...
									</span>
								) : simulatedSuccess ? (
									<span className="flex items-center gap-2 text-white font-bold">
										<Check size={16} /> Settled on Ledger!
									</span>
								) : (
									<>
										<span>Send ${amount} USDC</span>
										<ArrowRight size={15} />
									</>
								)}
							</button>

							{/* Trust Footnote */}
							<p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center font-light pt-1">
								<Check size={11} className="text-emerald-400" />
								<span>Pay with a username · Publicly verifiable on Stellar</span>
							</p>
						</div>
					)}

					{/* TAB 2: RECEIVE VIEW */}
					{activeTab === "receive" && (
						<div className="space-y-4 text-center animate-[fadeInUp_0.2s_ease-out]">
							<div className="flex flex-col items-center pt-1">
								<h3 className="text-lg font-medium text-white mb-0.5">@sam</h3>
								<span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
									<Check size={11} /> Sylar Verified
								</span>
							</div>

							{/* High Contrast QR */}
							<div className="inline-block p-3.5 rounded-2xl bg-white shadow-xl">
								<QRCodeSVG value={`https://sylarpay.app/@sam?amount=${amount}`} size={160} level="H" marginSize={1} />
							</div>

							<div className="account text-[11px] select-all">sylarpay.app/@sam?amount={amount}</div>

							<div className="flex gap-2 justify-center">
								<button
									type="button"
									onClick={handleCopy}
									className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-white text-black font-semibold text-xs transition-all hover:bg-neutral-200"
								>
									{copied ? (
										<>
											<Check size={13} className="text-emerald-600" />
											<span>Copied!</span>
										</>
									) : (
										<>
											<Copy size={13} />
											<span>Copy link</span>
										</>
									)}
								</button>
								<button
									type="button"
									onClick={handleCopy}
									className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full border border-white/10 bg-white/5 text-white font-medium text-xs transition-all hover:bg-white/10"
								>
									<Share2 size={13} />
									<span>Share</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</Tilt3D>
		</div>
	);
}
