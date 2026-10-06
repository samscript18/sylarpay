"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ArrowUp, ArrowDown, ArrowRight, ArrowUpRight, Clock, Lock, AtSign, KeyRound, Copy, Share2, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { amountSchema, displayAmount, usernameSchema } from "@/lib/validation";
import { explorer } from "@/lib/config";
import { confirmPayment, Recipient, sendUsdcPayment } from "@/lib/payment-client";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import { RecipientLookup } from "./recipient-lookup";
import { SelectedRecipient } from "./selected-recipient";
import { LoadingStatus } from "./skeleton";

export function Verification({ verified }: { verified: boolean }) {
	return (
		<span
			title={verified ? "Stellar username ownership and profile verified. Not government KYC." : "Not app-verified"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
				verified ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-white/5 border border-white/10 text-neutral-400"
			}`}
		>
			{verified && <Check size={11} className="text-emerald-400" />}
			{verified ? "Sylar Verified" : "Unverified"}
		</span>
	);
}

export function PaymentForm({
	initialUsername = "",
	initialAmount = "",
	initialMode = "send",
	recipient: initialRecipient,
	onLockChange,
}: {
	initialUsername?: string;
	initialAmount?: string;
	initialMode?: "send" | "receive";
	recipient?: Recipient;
	onLockChange?: (locked: boolean) => void;
}) {
	const w = useWallet();
	if (!w.account) return <ConnectPrompt />;
	return <ConnectedPaymentForm key={`${w.account}:${w.config?.network}`} initialUsername={initialUsername} initialAmount={initialAmount} initialMode={initialMode} recipient={initialRecipient} onLockChange={onLockChange} />;
}

function ConnectedPaymentForm({
	initialUsername,
	initialAmount,
	initialMode = "send",
	recipient: initialRecipient,
	onLockChange,
}: {
	initialUsername: string;
	initialAmount: string;
	initialMode?: "send" | "receive";
	recipient?: Recipient;
	onLockChange?: (locked: boolean) => void;
}) {
	const w = useWallet();
	const a = useAccount();
	const storageKey = `sylar_payment_${w.account}_${w.config?.network}`;
	const receiptRef = useRef<HTMLElement>(null);

	// Tab mode: send vs receive
	const [activeTab, setActiveTab] = useState<"send" | "receive">(initialMode);

	// Recipient input mode: username vs address
	const [recipientMode, setRecipientMode] = useState<"username" | "address">("username");

	// Private note / memo state
	const [memo, setMemo] = useState("");

	// Receive mode state
	const [copiedLink, setCopiedLink] = useState(false);
	const [requestAmount, setRequestAmount] = useState("");

	const [saved] = useState(() => {
		try {
			const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
			if (value && /^[a-f0-9]{64}$/.test(value.hash) && usernameSchema.safeParse(value.username).success && amountSchema.safeParse(value.amount).success && value.recipient?.address)
				return value as {
					hash: string;
					username: string;
					amount: string;
					recipient: Recipient;
				};
		} catch {
			/* Storage fallback */
		}
		return null;
	});

	const [username, setUsername] = useState(saved?.username || initialUsername);
	const [amount, setAmount] = useState(saved?.amount || initialAmount);
	const [recipient, setRecipient] = useState<Recipient | null>(saved?.recipient || initialRecipient || null);
	const [stage, setStage] = useState<"edit" | "review" | "pending" | "success" | "failed">(saved ? "pending" : "edit");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [hash, setHash] = useState(saved?.hash || "");

	useEffect(() => {
		if (stage === "success") {
			receiptRef.current?.focus({ preventScroll: true });
			receiptRef.current?.scrollIntoView({
				block: "start",
				behavior: "instant",
			});
		}
	}, [stage]);

	useEffect(() => {
		onLockChange?.(busy || stage === "pending");
	}, [busy, stage, onLockChange]);

	async function review(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError("");
		setMessage(`Resolving ${username}…`);
		try {
			const name = usernameSchema.parse(username);
			amountSchema.parse(amount);
			const r = await api<Recipient>(`/api/users/${name}`);
			setRecipient(r);
			setUsername(name);
			setStage("review");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unable to resolve recipient.");
		} finally {
			setBusy(false);
			setMessage("");
		}
	}

	async function pay() {
		if (!w.config || !recipient) return;
		setBusy(true);
		setError("");
		try {
			const record = hash
				? await confirmPayment(hash, { username, amount }, setMessage)
				: await sendUsdcPayment({ username, amount, expectedAddress: recipient.address }, w.config, setMessage, (txHash) => {
						setHash(txHash);
						setStage("pending");
						try {
							sessionStorage.setItem(storageKey, JSON.stringify({ hash: txHash, username, amount, recipient }));
						} catch {
							/* Local recovery storage */
						}
					});
			if (record.status !== "PENDING") {
				try {
					sessionStorage.removeItem(storageKey);
				} catch {
					/* Local recovery storage */
				}
			}
			setStage(record.status === "CONFIRMED" ? "success" : record.status === "FAILED" ? "failed" : "pending");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Payment could not be verified.");
			if (e instanceof Error && e.message === "Stellar reports that this transaction failed.") {
				setStage("failed");
				try {
					sessionStorage.removeItem(storageKey);
				} catch {
					/* Local recovery storage */
				}
			}
		} finally {
			setBusy(false);
			setMessage("");
		}
	}

	const handleCopyReceiveLink = async () => {
		if (!a.data?.identity || !w.config?.appUrl) return;
		const url = `${w.config!.appUrl.replace(/\/$/, "")}/@${a.data.identity.username}${requestAmount ? `?amount=${requestAmount}` : ""}`;
		try {
			await navigator.clipboard.writeText(url);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2500);
		} catch {
			setError("Could not copy the payment link. Copy it from the field below.");
		}
	};

	const handleShareReceiveLink = async () => {
		if (!a.data?.identity || !w.config?.appUrl) return;
		const url = `${w.config!.appUrl.replace(/\/$/, "")}/@${a.data.identity.username}${requestAmount ? `?amount=${requestAmount}` : ""}`;
		if (navigator.share) {
			try {
				await navigator.share({
					title: `Pay @${a.data.identity.username}`,
					url,
				});
			} catch {
				/* Cancelled */
			}
		} else {
			await handleCopyReceiveLink();
		}
	};

	if (!w.account) return <ConnectPrompt />;

	// SUCCESS RECEIPT VIEW (Loofta aesthetic)
	if (stage === "success") {
		return (
			<section
				className="relative max-w-lg mx-auto rounded-3xl border border-white/10 bg-[#0f0f14]/90 p-8 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl text-center overflow-hidden"
				aria-label="Payment receipt"
				style={{ scrollMarginTop: 100 }}
				ref={receiptRef}
				tabIndex={-1}
			>
				{/* Glow */}
				<div
					className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-30 blur-3xl"
					style={{
						background: "radial-gradient(circle, rgba(16,185,129,0.7) 0%, transparent 70%)",
					}}
					aria-hidden="true"
				/>

				<div className="relative z-10 animate-[fadeInUp_0.3s_ease-out]">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
						<Check size={28} strokeWidth={2.5} />
					</div>

					<h2 className="text-2xl font-medium tracking-tight text-white mb-2">Payment sent</h2>

					<div aria-label="Payment amount" className="my-4 font-mono text-5xl font-semibold tracking-tight text-white tabular-nums">
						<span>${displayAmount(amount)}</span>
						<span className="text-xl font-normal text-emerald-400 ml-2">USDC</span>
					</div>

					<p className="text-sm text-neutral-400 mb-6 font-light">
						to <strong className="text-white font-medium">@{username}</strong>
					</p>

					<div className="mb-8 rounded-2xl border border-white/5 bg-black/40 p-4">
						<span className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400">
							<Check size={14} /> Confirmed on Stellar {w.config?.network === "testnet" ? "Testnet" : "Mainnet"}
						</span>
						{w.config?.network === "testnet" && <p className="text-[11px] text-neutral-500 mt-1 font-mono">Test assets have no monetary value.</p>}
					</div>

					<div className="space-y-3">
						<Link
							className="relative inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-white text-black font-semibold text-sm transition-all hover:bg-neutral-200 active:scale-[0.98]"
							href="/dashboard"
						>
							Back to overview
						</Link>

						<a
							className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-white transition-all hover:bg-white/10"
							href={explorer(w.config!.network, hash)}
							target="_blank"
							rel="noreferrer"
						>
							View on Stellar Explorer <ArrowUpRight size={15} />
						</a>
					</div>

					<details className="mt-6 pt-4 border-t border-white/5 text-left">
						<summary className="cursor-pointer text-xs font-mono text-neutral-500 hover:text-white">Transaction details</summary>
						<p className="text-[11px] text-neutral-500 mt-2 font-mono">Transaction hash</p>
						<div className="account mt-1">{hash}</div>
					</details>
				</div>
			</section>
		);
	}

	return (
		<div className="max-w-lg mx-auto">
			<div className="mb-6 flex items-stretch gap-2.5">
				<div role="group" aria-label="Payment mode" className="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.025] p-1">
					{(["send", "receive"] as const).map((mode) => {
						const selected = activeTab === mode;
						const Icon = mode === "send" ? ArrowUp : ArrowDown;
						return (
							<button
								key={mode}
								type="button"
								aria-pressed={selected}
								onClick={() => {
									setActiveTab(mode);
									if (mode === "send") setStage("edit");
								}}
								className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${selected ? "border-white/10 bg-white/[0.07] text-white shadow-sm" : "border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-white"}`}
							>
								<span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${selected ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>
									<Icon size={15} strokeWidth={2} aria-hidden="true" />
								</span>
								{mode === "send" ? "Send" : "Receive"}
							</button>
						);
					})}
				</div>
				<Link href="/dashboard" className="flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] px-3 text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400" title="Activity history">
					<Clock size={18} aria-hidden="true" />
					<span className="sr-only sm:not-sr-only sm:text-xs sm:font-medium">History</span>
				</Link>
			</div>

			{/* 2. MAIN PAYMENT CARD CONTAINER */}
			<div className="relative rounded-3xl border border-white/10 bg-[#0c100e]/95 p-6 sm:p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl ring-1 ring-white/5 overflow-hidden">
				{/* Subtle Ambient Card Glow */}
				<div
					className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
					style={{
						background: "radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)",
					}}
					aria-hidden="true"
				/>

				{/* TAB A: SEND EXPERIENCE */}
				{activeTab === "send" && (
					<div>
						{stage === "edit" ? (
							<form onSubmit={review} className="space-y-6">
								{/* Header Row */}
								<div className="flex items-center justify-between">
									<span className="text-slate-300 text-lg font-medium">Send USDC</span>
									<span className="text-xs font-mono uppercase tracking-wider text-emerald-400/90 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
										Stellar SCP
									</span>
								</div>

								{/* Hero Typographic Amount Input (Loofta Style) */}
								<div className="py-2">
									<div className="flex items-baseline tabular-nums">
										<span className="font-semibold text-slate-500 mr-1.5 text-4xl sm:text-5xl leading-none select-none">$</span>
										<input
											id="amount"
											inputMode="decimal"
											placeholder="0"
											value={amount}
											onChange={(e) => setAmount(e.target.value)}
											className="text-white placeholder:text-slate-600 font-semibold tracking-tight tabular-nums border-0 bg-transparent outline-none p-0 m-0 text-5xl sm:text-7xl leading-none w-full"
											aria-label="Amount · USDC"
											required
										/>
									</div>

									{/* Quick Amount Pill Presets */}
									<div className="flex items-center gap-2 mt-4 pt-1">
										{["10", "50", "100", "250"].map((preset) => (
											<button
												key={preset}
												type="button"
												onClick={() => setAmount(`${preset}.00`)}
												className="rounded-full px-3 py-1 text-xs font-mono text-slate-400 bg-white/[0.04] border border-white/5 hover:bg-white/10 hover:text-white transition-colors"
											>
												${preset}
											</button>
										))}
										{a.data?.balance && (
											<button
												type="button"
												onClick={() => setAmount(a.data!.balance)}
												className="rounded-full px-3 py-1 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-900/40 transition-colors"
											>
												Max (${displayAmount(a.data.balance)})
											</button>
										)}
									</div>
								</div>

								{/* Recipient Section */}
								<div>
									<div className="flex items-center justify-between mb-2">
										<label htmlFor="recipient" className="text-xs font-medium uppercase font-mono tracking-wider text-slate-400 block">
											To
										</label>

										{!recipient && (
											<div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10 text-xs">
												<button
													type="button"
													onClick={() => setRecipientMode("username")}
													className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-colors ${
														recipientMode === "username"
															? "bg-white text-black shadow-sm font-semibold"
															: "text-slate-400 hover:text-white"
													}`}
												>
													<AtSign size={11} /> @username
												</button>
												<button
													type="button"
													onClick={() => setRecipientMode("address")}
													className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-colors ${
														recipientMode === "address"
															? "bg-white text-black shadow-sm font-semibold"
															: "text-slate-400 hover:text-white"
													}`}
												>
													<KeyRound size={11} /> Stellar Public Key
												</button>
											</div>
										)}
									</div>

									{/* Recipient Input Box with Adornment */}
									{recipient ? (
										<SelectedRecipient
											recipient={recipient}
											disabled={busy}
											onChange={() => {
												setRecipient(null);
												setError("");
												requestAnimationFrame(() => document.getElementById("recipient")?.focus());
											}}
										/>
									) : (
										<>
											<div className="relative flex items-center rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-emerald-500/60 focus-within:bg-white/[0.06] transition-all">
												<div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-lg bg-white/10 border border-white/15 text-slate-200">
													<AtSign size={13} className="text-emerald-400" />
												</div>

												<input
													id="recipient"
													aria-label="Recipient"
													type="text"
													value={username}
													onChange={(e) => {
														setUsername(e.target.value);
														setRecipient(null);
														setError("");
													}}
													placeholder={recipientMode === "username" ? "username" : "G..."}
													required
													autoComplete="off"
													className="h-13 w-full rounded-2xl bg-transparent pl-14 pr-4 text-white text-lg placeholder:text-slate-500 outline-none"
												/>
											</div>

											<div className="mt-2" id="recipient-feedback">
												<RecipientLookup
													value={username}
													network={w.config?.network}
													onSelect={(match) => {
														setUsername(match.username);
														setRecipient(match);
														setError("");
													}}
												/>
											</div>
										</>
									)}
								</div>

								{/* Message / Memo Input (Loofta Style) */}
								<div>
									<div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
										<label htmlFor="payment-memo" className="font-medium">
											Message / Note (optional)
										</label>
										<span className="font-mono text-[11px] text-slate-500">{memo.length}/500</span>
									</div>

									<div className="relative flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 h-12 text-sm focus-within:border-emerald-500/50 transition-colors">
										<input
											id="payment-memo"
											type="text"
											value={memo}
											maxLength={500}
											onChange={(e) => setMemo(e.target.value)}
											placeholder="Add an invoice note or reference..."
											className="w-full bg-transparent text-white placeholder:text-slate-500 outline-none text-sm"
										/>
									</div>
								</div>

								{/* High-Energy Action Button (Loofta Style Gradient) */}
								<button
									type="submit"
									disabled={busy}
									className="relative z-10 inline-flex items-center justify-center gap-2 w-full h-13 rounded-2xl text-white font-semibold text-base transition-all duration-200 ease-out hover:scale-[1.015] active:scale-95 shadow-[0_14px_34px_-10px_rgba(16,185,129,0.55)] hover:shadow-[0_20px_45px_-12px_rgba(16,185,129,0.7)] bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] disabled:opacity-50 cursor-pointer"
								>
									<span>Continue</span>
									<ArrowRight size={17} />
								</button>

								{/* Trust Indicator */}
								<p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center font-light">
									<Lock size={12} className="text-emerald-400" />
									<span>Settles directly on Stellar ledger · No custodial intermediaries</span>
								</p>
							</form>
						) : (
							/* REVIEW / CONFIRMATION STEP (Loofta aesthetic drawer) */
							<div className="space-y-5 animate-[fadeInUp_0.25s_ease-out]">
								<div className="flex items-center justify-between border-b border-white/5 pb-3">
									<span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
										{stage === "pending" ? "Payment confirmation pending" : stage === "failed" ? "Payment failed" : "Review Payment"}
									</span>
									<span className="text-xs font-mono text-emerald-400">Stellar {w.config?.network}</span>
								</div>

								<div className="text-center py-2">
									<div className="font-mono text-4xl sm:text-5xl font-semibold tracking-tight text-white tabular-nums">
										${displayAmount(amount)}
										<span className="text-lg font-normal text-emerald-400 ml-2">USDC</span>
									</div>
									<p className="text-xs text-neutral-400 mt-1">
										to <span className="text-white font-medium">@{recipient?.username}</span>
									</p>
								</div>

								<div className="rounded-2xl border border-white/5 bg-black/40 p-4 space-y-2.5 text-xs">
									<div className="summary-row">
										<span>Recipient</span>
										<strong className="text-white">@{recipient?.username}</strong>
									</div>
									<div className="summary-row">
										<span>Verification</span>
										<Verification verified={recipient?.verified || false} />
									</div>
									<div className="summary-row">
										<span>Network Fee</span>
										<strong className="text-emerald-400 font-mono">Shown in Freighter · paid in XLM</strong>
									</div>
									<div className="summary-row">
										<span>Confirmation</span>
										<strong className="text-white font-mono">Confirmed after ledger verification</strong>
									</div>

									<div className="pt-2">
										<span className="text-neutral-500 font-mono text-[10px] uppercase block mb-1">Stellar destination</span>
										<div className="account text-xs">{recipient?.address}</div>
									</div>
								</div>

								<div className="notice text-xs">
									{stage === "pending"
										? "Confirmation is not available yet. Check this transaction before making another payment."
										: stage === "failed"
											? "This payment was not confirmed. Check the transaction details and failure reason before trying again."
											: "Review the recipient, destination, asset, and amount before signing."}
								</div>

								{hash && (
									<div>
										<div className="account text-xs" aria-label="Transaction hash">
											{hash}
										</div>
										<a className="text-link text-xs mt-1 block" href={explorer(w.config!.network, hash)} target="_blank" rel="noreferrer">
											View submitted transaction ↗
										</a>
									</div>
								)}

								<div className="flex gap-3 pt-2">
									{!hash && (
										<button type="button" className="button secondary flex-1" disabled={busy} onClick={() => setStage("edit")}>
											Edit
										</button>
									)}
									<button
										type="button"
										className="relative z-10 flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full text-white font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] shadow-[0_10px_25px_rgba(16,185,129,0.4)] disabled:opacity-50"
										disabled={busy || stage === "failed"}
										onClick={pay}
									>
										{busy ? (
											<span className="flex items-center gap-2">
												<span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
												<span>Signing…</span>
											</span>
										) : (
											<span>{hash ? "Check confirmation" : "Confirm payment"}</span>
										)}
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{/* TAB B: RECEIVE EXPERIENCE (LOOFTA MORPHING CARD) */}
				{activeTab === "receive" && (
					<div className="space-y-6 text-center animate-[fadeInUp_0.25s_ease-out]">
						<div className="flex items-center justify-between border-b border-white/5 pb-3">
							<span className="text-slate-300 text-lg font-medium">Receive USDC</span>
							<span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">Payment Link & QR</span>
						</div>

						{a.data?.identity && w.config?.appUrl ? (
							<div className="space-y-5">
								{/* Profile Badge */}
								<div className="flex flex-col items-center">
									<div className="relative mb-2">
										<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-[#164434] text-xl font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.35)]">
											{(a.data.profile?.displayName || a.data.identity.username)[0].toUpperCase()}
										</div>
									</div>
									<h3 className="text-xl font-medium text-white mb-1">@{a.data.identity.username}</h3>
									<Verification verified={a.data.identity.verified} />
								</div>

								{/* Optional Request Amount */}
								<div className="max-w-xs mx-auto text-left">
									<label htmlFor="req-amount" className="text-[11px] font-mono uppercase text-slate-400 mb-1 block">
										Request specific amount (optional)
									</label>
									<div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm">
										<span className="text-slate-500 font-mono mr-1.5">$</span>
										<input
											id="req-amount"
											type="text"
											value={requestAmount}
											onChange={(e) => setRequestAmount(e.target.value)}
											placeholder="150.00"
											className="bg-transparent text-white font-mono outline-none w-full"
										/>
										<span className="text-xs font-mono text-slate-400">USDC</span>
									</div>
								</div>

								{/* QR Code Container */}
								<div className="inline-block p-4 rounded-2xl bg-white shadow-2xl">
									<QRCodeSVG
										value={`${w.config!.appUrl.replace(/\/$/, "")}/@${a.data.identity.username}${requestAmount ? `?amount=${requestAmount}` : ""}`}
										size={180}
										level="H"
										marginSize={1}
									/>
								</div>

								{/* Payment Link Box */}
								<div className="account text-xs select-all">
									{w.config?.appUrl.replace(/\/$/, "")}/@
									{a.data.identity.username}
									{requestAmount ? `?amount=${requestAmount}` : ""}
								</div>

								{/* Action Buttons */}
								<div className="flex flex-col sm:flex-row gap-3 justify-center">
									<button
										type="button"
										onClick={handleCopyReceiveLink}
										className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-white text-black font-semibold text-xs transition-all hover:bg-neutral-200 active:scale-95"
									>
										{copiedLink ? (
											<>
												<Check size={14} className="text-emerald-600" />
												<span>Copied!</span>
											</>
										) : (
											<>
												<Copy size={14} />
												<span>Copy payment link</span>
											</>
										)}
									</button>

									<button
										type="button"
										onClick={handleShareReceiveLink}
										className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-white/10 bg-white/5 text-white font-medium text-xs transition-all hover:bg-white/10"
									>
										<Share2 size={14} />
										<span>Share</span>
									</button>

									<Link
										href="/cash-out"
										className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 font-medium text-xs transition-all hover:bg-emerald-900/40"
									>
										<Sparkles size={13} />
										<span>Cash out · supported currencies</span>
									</Link>
								</div>
							</div>
						) : (
							<div className="py-8 text-center space-y-4">
								<p className="text-sm text-neutral-400 font-light">You need to claim a @username to receive payments through a custom link or QR code.</p>
								<Link
									href="/claim"
									className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-[#22634b] px-6 py-3 text-xs font-semibold text-white shadow-lg"
								>
									Claim your @username now
								</Link>
							</div>
						)}
					</div>
				)}

				{/* Global Loading / Status Messages */}
				{message && <LoadingStatus>{message}</LoadingStatus>}
				{error && (
					<div className="notice error mt-4" role="alert">
						{error}
						{hash && stage !== "failed" && <p className="mt-1 text-xs">Submission may have succeeded. Check confirmation using this transaction before retrying.</p>}
					</div>
				)}
			</div>
		</div>
	);
}
