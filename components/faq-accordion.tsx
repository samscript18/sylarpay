"use client";
import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
	question: string;
	answer: string;
}

const defaultFAQs: FAQItem[] = [
	{
		question: "What are the fees on SylarPay?",
		answer: "SylarPay currently charges no app processing fee for direct payments. Stellar network fees are paid in XLM and shown by your wallet before approval. Anchor fees, if applicable, are provided by the anchor.",
	},
	{
		question: "What stays private?",
		answer: "Your account-private payment notes and invoice context stay off-chain. Transaction amounts, wallet addresses and settlement remain publicly verifiable on Stellar. SylarPay does not make Stellar payments private.",
	},
	{
		question: "Can I send to someone before they have a Stellar account?",
		answer: "The recipient needs a funded Stellar account, a registered username and a trustline for the configured USDC asset before receiving a username payment. Anyone can view their payment profile without connecting a wallet.",
	},
	{
		question: "How does the Soroban UsernameRegistry protect my name?",
		answer: "Your username is registered directly in a Soroban smart contract and belongs exclusively to your Stellar public key. No central administrator or backend server can silently revoke or reassign ownership.",
	},
	{
		question: "How do I cash out USDC to NGN or local fiat?",
		answer: "You can use the 'Cash Out' tab to start a SEP-24 interactive off-ramp with a compatible Stellar anchor. Supported currencies, fees and payout methods depend on the anchor. The current SDF Test Anchor demo uses USD with simulated fiat payout; NGN and production bank payout are not live.",
	},
];

export function FaqAccordion({ items = defaultFAQs }: { items?: FAQItem[] }) {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const toggle = (idx: number) => {
		setOpenIndex(openIndex === idx ? null : idx);
	};

	return (
		<section className="mt-16 md:mt-24 pb-16 max-w-xl mx-auto px-4">
			<h2 className="text-2xl md:text-3xl font-medium text-white text-center mb-8 tracking-tight">Frequently asked questions</h2>

			<div className="flex flex-col gap-3.5">
				{items.map((item, idx) => {
					const isOpen = openIndex === idx;
					return (
						<div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition-colors hover:border-white/20">
							<button type="button" onClick={() => toggle(idx)} className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors" aria-expanded={isOpen}>
								<span className="text-base sm:text-lg font-medium text-slate-200">{item.question}</span>
								<span className="text-emerald-400 shrink-0 ml-4 p-1 rounded-full bg-emerald-500/10">{isOpen ? <Minus size={18} /> : <Plus size={18} />}</span>
							</button>

							{isOpen && <div className="px-5 pb-5 pt-1 text-sm text-slate-400 font-light leading-relaxed border-t border-white/5 animate-[fadeInUp_0.2s_ease-out]">{item.answer}</div>}
						</div>
					);
				})}
			</div>
		</section>
	);
}
