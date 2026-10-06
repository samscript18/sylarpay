"use client";
import { TestnetDisclosure } from "./testnet-disclosure";
import Link from "next/link";
import { ProfileSkeleton, LoadingStatus } from "./skeleton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Recipient } from "@/lib/payment-client";
import { PaymentForm, Verification } from "./payment-form";
import { ShareProfile } from "./share-profile";
import { useWallet } from "./wallet-provider";
export function PublicProfile({ username, amount }: { username: string; amount?: string }) {
	const w = useWallet();
	const [pay, setPay] = useState(false);
	const query = useQuery({
		queryKey: ["profile", w.config?.network, username],
		queryFn: ({ signal }) => api<Recipient>(`/api/users/${username}`, undefined, { signal }),
		retry: false,
	});
	const recipient = query.data,
		error = query.error?.message;
	return (
		<main className="workspace max-w-xl mx-auto px-4 py-8">
      <TestnetDisclosure network={w.config?.network} />
			{error ? (
				<div className="empty-state text-center p-8 rounded-3xl bg-[#070b09]/80 border border-white/10 backdrop-blur-xl">
					<h1 className="text-2xl font-bold text-white mb-2">Profile unavailable</h1>
					<p className="text-zinc-400 mb-6" role="alert">
						{error}
					</p>
					<Link className="button secondary inline-flex items-center gap-2" href="/">
						Back to SylarPay
					</Link>
				</div>
			) : !recipient ? (
				<ProfileSkeleton label={`Resolving @${username}…`} />
			) : (
				<div className="space-y-6">
					<div className="card narrow profile-card bg-[#070b09]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
						{/* Ambient emerald backlight */}
						<div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

						<div className="relative z-10 flex flex-col items-center">
							<div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/30 border-2 border-emerald-500/40 flex items-center justify-center text-2xl font-bold text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.25)] mb-4">
								{recipient.profile?.displayName?.[0] || username[0].toUpperCase()}
							</div>

							<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">@{username}</h1>

							<div className="mt-2 mb-4">
								<Verification verified={recipient.verified} />
							</div>

							<p className="text-sm sm:text-base text-zinc-300 max-w-md mx-auto mb-6 leading-relaxed">
								{recipient.profile?.displayName && <span className="font-semibold text-white block text-lg mb-1">{recipient.profile.displayName}</span>}
								{recipient.profile?.bio || "Available for instant USDC payments on Stellar"}
							</p>

							{!pay ? (
								<button
									className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 mb-6"
									onClick={() => setPay(true)}
								>
									Pay @{username} ↗
								</button>
							) : (
								<button className="text-xs text-emerald-400 hover:text-emerald-300 mb-4 transition-colors font-medium flex items-center gap-1" onClick={() => setPay(false)}>
									↑ Hide payment form
								</button>
							)}

							{w.config?.appUrl ? (
								<div className="w-full">
									<ShareProfile username={username} url={`${w.config.appUrl.replace(/\/$/, "")}/@${username}`} />
								</div>
							) : (
								<LoadingStatus>Preparing payment link…</LoadingStatus>
							)}

							<details className="w-full mt-6 text-left group">
								<summary className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors py-2 flex items-center justify-between border-t border-white/5">
									<span>View Stellar destination & verification info</span>
									<span className="text-zinc-400 group-open:rotate-180 transition-transform text-xs">▼</span>
								</summary>
								<div className="pt-3 space-y-2">
									<div className="account text-[11px] font-mono p-2.5 rounded-xl bg-black/40 border border-white/5 text-zinc-400 break-all select-all">{recipient.address}</div>
									<p className="text-[11px] text-zinc-400 leading-normal">
										Sylar Verified checks wallet ownership and public profile setup on Stellar. It does not imply government identity verification.
									</p>
								</div>
							</details>
						</div>
					</div>

					{pay && (
						<section className="animate-fadeInUp" aria-label="Pay recipient">
							<PaymentForm initialUsername={username} initialAmount={amount} recipient={recipient} />
						</section>
					)}
				</div>
			)}
		</main>
	);
}
