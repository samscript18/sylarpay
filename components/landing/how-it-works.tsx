import React from "react";
import { UserCheck, Share2, DollarSign, ArrowDownToDot, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function HowItWorks() {
	const steps = [
		{
			num: "01",
			title: "Claim your name",
			description: "Connect your Stellar wallet and register your unique @username directly in the Soroban smart contract.",
			icon: UserCheck,
			tag: "Non-Custodial",
		},
		{
			num: "02",
			title: "Share your payment link",
			description: "Send your custom link (sylarpay.app/@you) or let clients scan your high-contrast QR code. No long public keys.",
			icon: Share2,
			tag: "Universal URL",
		},
		{
			num: "03",
			title: "Get paid in USDC",
			description: "Payments settle directly between Stellar accounts in under 2 seconds. Transactions are publicly verifiable on-chain.",
			icon: DollarSign,
			tag: "Instant Settlement",
		},
		{
			num: "04",
			title: "Cash out locally",
			description: "Use a compatible Stellar anchor (SEP-24) to convert your USDC into local fiat like NGN directly into your bank or mobile money.",
			icon: ArrowDownToDot,
			tag: "Fiat Off-Ramp",
		},
	];

	return (
		<section id="how" className="mt-32 max-w-7xl mx-auto px-4 scroll-mt-28">
			<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
				<div>
					<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
						Four Steps · One Identity
					</div>
					<h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-2">How SylarPay Works</h2>
					<p className="text-neutral-400 text-sm md:text-base max-w-lg font-normal">Designed to bridge the gap between global digital dollars and local bank accounts.</p>
				</div>

				<Link href="/claim" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium text-white transition-all hover:bg-white/10">
					<span>Claim your name now</span>
					<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5" />
				</Link>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{steps.map((st, i) => {
					const Icon = st.icon;
					return (
						<div
							key={i}
							className="group relative rounded-3xl border border-white/5 bg-[#060c08]/90 p-6 md:p-7 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30 hover:bg-[#07130c] flex flex-col justify-between"
						>
							{/* Subtle top border glow on hover */}
							<div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-400/0 to-transparent group-hover:via-emerald-400/40 transition-all duration-500" />

							<div>
								<div className="flex items-center justify-between mb-6">
									<span className="font-sans text-2xl font-semibold text-neutral-600 group-hover:text-emerald-400 transition-colors">{st.num}</span>
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-neutral-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-all">
										<Icon size={18} />
									</div>
								</div>

								<h3 className="text-lg font-medium text-white mb-2 group-hover:text-white transition-colors">{st.title}</h3>
								<p className="text-xs text-neutral-400 font-normal leading-relaxed mb-6">{st.description}</p>
							</div>

							<div className="pt-4 border-t border-white/5 flex items-center justify-between">
								<span className="text-[10px] font-sans uppercase tracking-wider text-emerald-400/80">{st.tag}</span>
								<span className="size-1.5 rounded-full bg-emerald-500/40 group-hover:bg-emerald-400 transition-colors" />
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
