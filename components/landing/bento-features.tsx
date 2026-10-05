"use client";
import React, { useState } from "react";
import { Tilt3D } from "./tilt-3d";
import { ShieldCheck, ArrowUpRight, Lock, Layers, Sparkles, Check, RefreshCw, Cpu, Globe2, Wallet, Zap } from "lucide-react";

export function BentoFeatures() {
	const [activeStep, setActiveStep] = useState(2);
	const [demoAmount, setDemoAmount] = useState(150);

	const steps = [
		{
			title: "1. Username Resolution",
			detail: "@sam → GD7X3K6M9Q…28WLP57X",
			status: "Verified On-Chain",
			time: "0.2s",
			badge: "Soroban WASM",
		},
		{
			title: "2. Wallet Signature",
			detail: "Freighter ed25519 signature verified",
			status: "Authorized by Sender",
			time: "0.8s",
			badge: "Non-Custodial",
		},
		{
			title: "3. Stellar Ledger Consensus",
			detail: "Transaction ledger sequence #49,281,902",
			status: "Finalized on Ledger",
			time: "1.8s",
			badge: "Immutable",
		},
		{
			title: "4. SEP-24 Cash Out Ready",
			detail: "Recipient can redeem to local fiat (NGN)",
			status: "Available Instant",
			time: "SEP-24 Rail",
			badge: "Anchor Off-Ramp",
		},
	];

	return (
		<section className="mt-32 relative">
			{/* Section Header */}
			<div className="mb-14 text-center max-w-3xl mx-auto">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
					<Cpu size={12} className="text-emerald-400" />
					Engineered for Consumer Experience
				</div>
				<h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-4">
					The blockchain settles. <br />
					<span className="text-neutral-500">SylarPay handles the experience.</span>
				</h2>
				<p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto font-normal leading-relaxed">
					No 56-character addresses. No gas miscalculations. Just seamless payments anchored to a verifiable Stellar ledger identity.
				</p>
			</div>

			{/* Bento Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
				{/* Card 1 (Span 8): Interactive Settlement Timeline */}
				<Tilt3D maxTilt={7} className="lg:col-span-8 rounded-3xl p-0.5">
					<div className="relative h-full rounded-[23px] border border-white/10 bg-[#070d0a]/90 p-6 md:p-8 backdrop-blur-xl overflow-hidden flex flex-col justify-between group">
						{/* Ambient Corner Glow */}
						<div
							className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-25 blur-3xl"
							style={{
								background: "radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)",
							}}
							aria-hidden="true"
						/>

						<div>
							<div className="flex items-center justify-between mb-4">
								<span className="text-[10px] font-sans uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
									<span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
									01 · Settlement Architecture
								</span>
								<span className="text-[11px] font-sans text-neutral-500 border border-white/5 rounded-full px-2.5 py-0.5 bg-white/[0.02]">Live Testnet Execution</span>
							</div>

							<h3 className="text-2xl font-medium tracking-tight text-white mb-2">Deterministic Resolution in Real Time</h3>
							<p className="text-sm text-neutral-400 max-w-xl mb-6 font-normal">
								Every payment resolves freshly through the Soroban <code className="text-emerald-400 font-sans text-xs">UsernameRegistry</code>. Frontends never cache addresses for
								execution, preventing outdated or compromised destinations.
							</p>

							{/* Step Sequence Timeline */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
								{steps.map((st, i) => (
									<div
										key={i}
										onClick={() => setActiveStep(i)}
										className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
											activeStep === i
												? "border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
												: "border-white/5 bg-white/[0.02] hover:border-white/15"
										}`}
									>
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-xs font-semibold text-white">{st.title}</span>
											<span className="text-[10px] font-sans text-emerald-400">{st.time}</span>
										</div>
										<div className="text-[11px] text-neutral-400 font-sans truncate mb-2">{st.detail}</div>
										<div className="flex items-center justify-between">
											<span className="text-[10px] text-neutral-500 flex items-center gap-1">
												<Check size={11} className="text-emerald-400" /> {st.status}
											</span>
											<span className="text-[9px] uppercase font-sans px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">{st.badge}</span>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-neutral-500">
							<span className="font-sans">Security Model: Ed25519 Native Auth</span>
							<a href="#how" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
								Inspect smart contract specs <ArrowUpRight size={13} />
							</a>
						</div>
					</div>
				</Tilt3D>

				{/* Card 2 (Span 4): Smart Contract Identity */}
				<Tilt3D maxTilt={9} className="lg:col-span-4 rounded-3xl p-0.5">
					<div className="relative h-full rounded-[23px] border border-white/10 bg-[#070d0a]/90 p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between group overflow-hidden">
						<div>
							<div className="flex items-center justify-between mb-4">
								<span className="text-[10px] font-sans uppercase tracking-widest text-[#d7edb5]">02 · Identity Layer</span>
								<span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
									<ShieldCheck size={16} />
								</span>
							</div>

							<h3 className="text-xl font-medium tracking-tight text-white mb-2">Soroban Identity Registry</h3>
							<p className="text-xs text-neutral-400 mb-6 font-normal leading-relaxed">
								Your username belongs exclusively to your Stellar account. No administrator can revoke, censor, or silently reassign it.
							</p>

							{/* Code Snippet Box */}
							<div className="rounded-xl border border-white/5 bg-black/70 p-3.5 font-sans text-[11px] text-neutral-300 space-y-1 mb-4 shadow-inner">
								<div className="text-neutral-500">{"// Soroban WASM Call"}</div>
								<div className="text-emerald-400">registry.register(&quot;sam&quot;, owner)</div>
								<div className="text-neutral-500">{"// Safe 2-Step Transfer"}</div>
								<div className="text-neutral-400">registry.propose_transfer(...)</div>
								<div className="text-neutral-400">registry.accept_transfer(...)</div>
							</div>
						</div>

						<div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-left">
							<div className="text-[10px] uppercase font-sans tracking-wider text-emerald-400 mb-0.5">Two-Step Safe Transfer</div>
							<div className="text-xs text-neutral-300">Guards against typoed destinations. The new owner must explicitly sign to accept.</div>
						</div>
					</div>
				</Tilt3D>

				{/* Card 3 (Span 4): Local Cash Out (SEP-24) */}
				<Tilt3D maxTilt={9} className="lg:col-span-4 rounded-3xl p-0.5">
					<div className="relative h-full rounded-[23px] border border-white/10 bg-[#070d0a]/90 p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between group overflow-hidden">
						<div>
							<div className="flex items-center justify-between mb-4">
								<span className="text-[10px] font-sans uppercase tracking-widest text-emerald-400">03 · Local Off-Ramp</span>
								<span className="p-1 rounded-lg bg-white/5 text-[#d7edb5]">
									<Globe2 size={16} />
								</span>
							</div>

							<h3 className="text-xl font-medium tracking-tight text-white mb-2">Cash Out to Local Fiat</h3>
							<p className="text-xs text-neutral-400 mb-5 font-normal leading-relaxed">
								Compatible with Stellar anchors for local fiat redemption (such as NGN). Payout happens directly through supported local banking rails.
							</p>

							{/* Calculator Box */}
							<div className="rounded-xl border border-white/5 bg-black/60 p-4 mb-4">
								<div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2">
									<span>USDC Received</span>
									<span className="font-sans text-white font-semibold">${demoAmount}.00 USDC</span>
								</div>
								<div className="h-px bg-white/5 my-2" />
								<div className="flex items-center justify-between text-[11px] text-emerald-400">
									<span>Estimated Payout (NGN)</span>
									<span className="font-sans font-bold text-sm text-emerald-300">₦{(demoAmount * 1590).toLocaleString()}</span>
								</div>
								<div className="text-[9px] text-neutral-500 font-sans mt-1 text-right">Est. Rate: 1 USDC = ₦1,590 NGN</div>
							</div>
						</div>

						<div className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-sans">
							<Zap size={13} className="text-emerald-400" />
							Powered by SEP-24 Anchor protocol
						</div>
					</div>
				</Tilt3D>

				{/* Card 4 (Span 8): Honest Privacy Model */}
				<Tilt3D maxTilt={7} className="lg:col-span-8 rounded-3xl p-0.5">
					<div className="relative h-full rounded-[23px] border border-white/10 bg-[#070d0a]/90 p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between group overflow-hidden">
						{/* Ambient Background Gradient */}
						<div
							className="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
							style={{
								background: "radial-gradient(circle, rgba(215,237,181,0.4) 0%, transparent 70%)",
							}}
							aria-hidden="true"
						/>

						<div>
							<div className="flex items-center justify-between mb-4">
								<span className="text-[10px] font-sans uppercase tracking-widest text-[#d7edb5] flex items-center gap-1">
									<Lock size={12} />
									04 · Honest Privacy Architecture
								</span>
								<span className="text-[10px] font-sans text-neutral-500">Public Ledger + Off-Chain Context</span>
							</div>

							<h3 className="text-2xl font-medium tracking-tight text-white mb-2">Private Context. Public Settlement.</h3>
							<p className="text-sm text-neutral-400 max-w-xl mb-6 font-normal leading-relaxed">
								SylarPay keeps your private payment notes, invoices, and customer metadata secure and off-chain, while the underlying Stellar transaction remains publicly verifiable.
							</p>

							{/* Side-by-Side Privacy Breakdown */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
								<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
									<div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
										<span className="size-2 rounded-full bg-emerald-400" />
										Off-Chain (Private to You)
									</div>
									<ul className="text-xs text-neutral-400 space-y-1.5 font-normal">
										<li>• Client invoice notes & private memos</li>
										<li>• Personal accounting bookkeeping tags</li>
										<li>• Private user contact information</li>
										<li>• UI display preferences</li>
									</ul>
								</div>

								<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
									<div className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
										<span className="size-2 rounded-full bg-emerald-400" />
										On-Chain (Public Proof)
									</div>
									<ul className="text-xs text-neutral-400 space-y-1.5 font-normal">
										<li>• Stellar settlement transaction hash</li>
										<li>• USDC asset amount transferred</li>
										<li>• Cryptographic block sequence & timestamp</li>
										<li>• Soroban username ownership claim</li>
									</ul>
								</div>
							</div>
						</div>

						<div className="text-xs font-sans text-neutral-500 pt-3 border-t border-white/5">Transparent & verifiable · No false privacy illusions</div>
					</div>
				</Tilt3D>
			</div>
		</section>
	);
}
