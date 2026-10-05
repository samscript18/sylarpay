"use client";
import Link from "next/link";
import { DashboardSkeleton } from "./skeleton";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet, ShieldCheck, Check, Plus, ExternalLink, Lock } from "lucide-react";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import { displayAmount } from "@/lib/validation";
import { explorer } from "@/lib/config";
import { TransferForm, AcceptTransfer } from "./transfer-form";
import { Verification } from "./payment-form";
import { ShareProfile } from "./share-profile";
import { api } from "@/lib/api";
import { wallet } from "@/lib/wallet";
import type { PaymentRecord } from "@/server/db";

function Activity({ p, account }: { p: PaymentRecord; account: string }) {
	const [note, setNote] = useState(p.note || "");
	const [message, setMessage] = useState("");
	const [show, setShow] = useState(false);
	const incoming = p.recipientAddress === account;

	async function save() {
		try {
			await api("/api/payments/note", { txHash: p.txHash, note });
			setMessage("Private note saved.");
		} catch (e) {
			setMessage(e instanceof Error ? e.message : "Unable to save note.");
		}
	}

	return (
		<div className="border-b border-white/[0.06] last:border-b-0 py-4 transition-colors">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3.5 min-w-0">
					<span
						className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
							incoming ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-neutral-300"
						}`}
					>
						{incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
					</span>

					<div className="min-w-0">
						<strong className="text-sm font-medium text-white truncate block">{incoming ? (p.status === "CONFIRMED" ? "Payment received" : "Incoming payment") : `To @${p.username}`}</strong>
						<p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5 font-normal">
							<span className={`inline-block size-1.5 rounded-full ${p.status === "CONFIRMED" ? "bg-emerald-400" : p.status === "PENDING" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
							<span>{p.status === "CONFIRMED" ? "Confirmed on Stellar" : p.status === "PENDING" ? "Waiting for confirmation" : "Payment failed"}</span>
							<span>·</span>
							<span>{new Date(p.createdAt).toLocaleDateString()}</span>
						</p>
					</div>
				</div>

				<div className="text-right shrink-0">
					<div className="font-sans text-base font-semibold text-white tabular-nums">
						{incoming ? "+" : "−"} ${displayAmount(p.amount)}
						<span className="text-xs font-normal text-emerald-400 ml-1">USDC</span>
					</div>

					<div className="flex items-center justify-end gap-2 mt-1">
						<a
							className="text-[11px] font-sans text-neutral-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-0.5"
							href={explorer(p.network, p.txHash)}
							target="_blank"
							rel="noreferrer"
						>
							Explorer <ArrowUpRight size={10} />
						</a>
						<button className="text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setShow(!show)} aria-expanded={show}>
							{p.note ? "View note" : "+ Note"}
						</button>
					</div>
				</div>
			</div>

			{show && (
				<div className="mt-3 rounded-xl border border-white/10 bg-black/60 p-3.5 text-left text-xs animate-[fadeInUp_0.2s_ease-out]">
					<div className="flex items-center justify-between mb-2">
						<label htmlFor={`note-${p.txHash}-${p.operationIndex ?? 0}`} className="font-sans uppercase text-[10px] tracking-wider text-neutral-400 flex items-center gap-1">
							<Lock size={10} className="text-emerald-400" />
							{p.operationIndex !== undefined ? "Private transaction note · Shared across this multi-send" : "Private note · Stored off-chain"}
						</label>
					</div>
					<div className="flex gap-2">
						<input
							id={`note-${p.txHash}-${p.operationIndex ?? 0}`}
							value={note}
							maxLength={500}
							placeholder="e.g. Invoice #104 · Design deliverables"
							onChange={(e) => setNote(e.target.value)}
							className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
						/>
						<button className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors" onClick={save}>
							Save
						</button>
					</div>
					{message && (
						<p role="status" className="text-[11px] text-emerald-400 mt-2 font-sans">
							✓ {message}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export function Dashboard() {
	const w = useWallet();
	const a = useAccount();
	const [status, setStatus] = useState("");
	const [busy, setBusy] = useState(false);
	const [trustAttempt, setTrustAttempt] = useState<{
		account: string;
		network: string;
	} | null>(null);
	const checkingTrust = trustAttempt?.account === w.account && trustAttempt.network === w.config?.network;

	async function trust() {
		if (!w.config) return;
		setBusy(true);
		try {
			if (!checkingTrust) {
				setStatus("Preparing USDC trustline…");
				const r = await api<{ xdr: string }>("/api/trustline", {});
				setStatus("Waiting for wallet approval…");
				const signed = await wallet.signTransaction(r.xdr, w.config);
				await api("/api/trustline-submit", { signed });
				setTrustAttempt({ account: w.account!, network: w.config.network });
			}
			setStatus("Checking USDC receiving on Stellar…");
			const updated = await a.refresh();
			setStatus(
				updated?.account === w.account && updated.usdcTrustline === "ready"
					? "USDC receiving is enabled."
					: updated?.usdcTrustline === "unauthorized"
						? "Your USDC trustline needs issuer authorization."
						: "Transaction submitted. USDC receiving is not yet confirmed; check again shortly.",
			);
		} catch (e) {
			setStatus(e instanceof Error ? e.message : "Unable to add trustline.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="workspace">
			{/* Top Heading */}
			<div className="page-heading">
				<span className="eyebrow">
					<span className="dot" />
					Financial Identity on Stellar
				</span>
				<h1>{a.data?.profile ? `Hello, ${a.data.profile.displayName}` : "Welcome to SylarPay"}</h1>
				{a.data?.identity ? (
					<div className="flex items-center gap-2 mt-1">
						<span className="font-sans text-neutral-300 text-sm">@{a.data.identity.username}</span>
						<Verification verified={a.data.identity.verified} />
					</div>
				) : (
					<p>Your money, with a familiar name.</p>
				)}
			</div>

			{!w.account ? (
				<ConnectPrompt />
			) : (
				<>
					{a.error && (
						<div className="notice error mb-6" role="alert">
							<div className="flex items-center justify-between">
								<span>{a.error}</span>
								<button className="button small secondary" onClick={a.refresh}>
									Retry
								</button>
							</div>
						</div>
					)}

					{a.loading && !a.data && <DashboardSkeleton />}

					{a.data && (
						<>
							{/* Bento Row 1 */}
							<div className="grid-two">
								{/* Balance Showcase */}
								<div className="card balance-card">
									<span className="eyebrow">Available Balance · {w.config?.network?.toUpperCase()}</span>
									<div className="balance-value">
										{displayAmount(a.data.balance)}
										<span>USDC</span>
									</div>
									<p className="tiny muted mb-6">
										Read directly from Stellar ledger
										{w.config?.network === "testnet" ? " · Test assets carry no monetary value" : ""}
									</p>
									<div className="actions">
										<Link className="button" href="/receive">
											<ArrowDownLeft size={16} />
											Receive
										</Link>
										<Link className="button" href="/send">
											<ArrowUpRight size={16} />
											Send
										</Link>
										<Link className="button secondary" href="/cash-out">
											Cash out
										</Link>
									</div>
								</div>

								{/* Identity Box */}
								<div className="card identity-card flex flex-col justify-between">
									<div>
										<div className="identity-card-heading">
											<h2>Payment identity</h2>
											<span className="tiny muted">Your receiving profile</span>
										</div>
										{a.data.identity ? (
											<div>
												<div className="identity-card-person">
													<span className="identity-card-avatar" aria-hidden="true">
														{(a.data.profile?.displayName || a.data.identity.username)[0].toUpperCase()}
													</span>
													<div className="min-w-0">
														<strong className="identity-card-username">@{a.data.identity.username}</strong>
														<div className="mt-1">
															<Verification verified={a.data.identity.verified} />
														</div>
													</div>
												</div>
												<p className="identity-card-description">Your name is all someone needs to pay you.</p>
												{w.config?.appUrl && (
													<ShareProfile
														username={a.data.identity.username}
														url={`${w.config.appUrl.replace(/\/$/, "")}/@${a.data.identity.username}`}
													/>
												)}
												<Link className="identity-card-profile" href={`/@${a.data.identity.username}`}>
													View payment profile <ArrowUpRight size={14} />
												</Link>
											</div>
										) : (
											<div className="space-y-3">
												<p className="text-xs text-neutral-400 font-normal">Claim your unique @username to turn your account into a payment profile.</p>
												<Link className="button small" href="/claim">
													Claim your @username
												</Link>
											</div>
										)}

										<details className="identity-card-account">
											<summary>
												Stellar account{" "}
												<span>
													{w.account?.slice(0, 4)}…{w.account?.slice(-4)}
												</span>
											</summary>
											<div className="account">{w.account}</div>
										</details>

										{a.data.identity ? (
											<div className="identity-card-settings">
												<TransferForm username={a.data.identity.username} />
											</div>
										) : (
											<div className="mt-3">
												<AcceptTransfer />
											</div>
										)}
									</div>

									<div className="mt-5 pt-4 border-t border-white/5">
										{a.data.usdcTrustline === "ready" ? (
											<p className="text-xs text-emerald-300 flex items-center gap-2">
												<Check size={14} aria-hidden="true" /> USDC receiving enabled
											</p>
										) : a.data.usdcTrustline === "unauthorized" ? (
											<p className="text-xs text-slate-400">USDC receiving requires issuer authorization.</p>
										) : (
											<button className="button secondary small w-full justify-center" onClick={trust} disabled={busy}>
												{busy ? "Preparing trustline…" : checkingTrust ? "Check USDC Receiving" : "Enable USDC Receiving Trustline"}
											</button>
										)}
										{status && (
											<p className="notice text-xs mt-2" role="status">
												{status}
											</p>
										)}
									</div>
								</div>
							</div>

							{/* Activity Section */}
							<section className="card">
								<div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
									<div>
										<h2 className="text-lg font-medium text-white">Recent Activity</h2>
										<p className="text-xs text-neutral-500 font-sans mt-0.5">Indexed from Stellar transactions</p>
									</div>
									<button className="button secondary small" onClick={a.refresh} disabled={a.loading} aria-label="Refresh activity">
										<RefreshCw size={13} className={a.loading ? "animate-pulse" : ""} />
										<span>Refresh</span>
									</button>
								</div>

								{a.data.payments.length ? (
									<div className="divide-y divide-white/5">
										{a.data.payments.map((p) => (
											<Activity key={`${p.txHash}:${p.operationIndex ?? 0}`} p={p} account={w.account!} />
										))}
									</div>
								) : (
									<div className="py-12 text-center text-neutral-500 text-sm">
										<p className="font-normal">No transaction activity recorded yet.</p>
										<p className="text-xs text-neutral-600 font-sans mt-1">Verified SylarPay payments will appear here in real time.</p>
									</div>
								)}
							</section>
						</>
					)}
				</>
			)}
		</main>
	);
}
