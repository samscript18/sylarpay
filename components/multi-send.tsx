"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Plus, Trash2, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { decimalUnits, displayAmount, multiPaymentSchema, units, usernameSchema, amountSchema } from "@/lib/validation";
import { explorer } from "@/lib/config";
import { confirmMultiPayment, sendMultiPayment } from "@/lib/multi-payment-client";
import type { MultiIntent } from "@/server/multi-payments";
import type { Recipient } from "@/lib/payment-client";
import { useWallet } from "./wallet-provider";
import { RecipientLookup } from "./recipient-lookup";
import { SelectedRecipient } from "./selected-recipient";
import { LoadingStatus } from "./skeleton";
import { Verification } from "./payment-form";
const emptyRow = () => ({ id: crypto.randomUUID(), username: "", amount: "" });
export function MultiSend({ onLockChange }: { onLockChange: (locked: boolean) => void }) {
	const w = useWallet();
	const storageKey = `sylar_multi_payment_${w.account}_${w.config?.network}`;
	const [restored] = useState(() => {
		try {
			const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
			if (value && /^[a-f0-9]{64}$/.test(value.hash) && multiPaymentSchema.safeParse(value.intent).success) return value as { hash: string; intent: MultiIntent };
		} catch {
			/* Recovery storage is optional. */
		}
		return null;
	});
	const [rows, setRows] = useState(() =>
		restored
			? restored.intent.payments.map((p) => ({
					id: crypto.randomUUID(),
					username: p.username,
					amount: p.amount,
				}))
			: [emptyRow(), emptyRow()],
	);
	const [intent, setIntent] = useState<MultiIntent | null>(restored?.intent || null);
	const [recipients, setRecipients] = useState<Recipient[]>([]);
	const [selected, setSelected] = useState<Record<string, Recipient>>({});
	const [hash, setHash] = useState(restored?.hash || "");
	const [stage, setStage] = useState<"edit" | "review" | "pending" | "success" | "failed">(restored ? "pending" : "edit");
	const [busy, setBusy] = useState(false),
		[message, setMessage] = useState(""),
		[error, setError] = useState("");
	const receiptRef = useRef<HTMLElement>(null);
	useEffect(() => onLockChange(busy || stage === "pending"), [busy, stage, onLockChange]);
	useEffect(() => {
		if (stage === "success") {
			receiptRef.current?.focus({ preventScroll: true });
			receiptRef.current?.scrollIntoView({
				block: "start",
				behavior: "instant",
			});
		}
	}, [stage]);
	const total = (() => {
		try {
			const payments = stage === "edit" ? rows : intent?.payments || rows;
			return decimalUnits(payments.reduce((sum, r) => sum + units(r.amount), 0n));
		} catch {
			return null;
		}
	})();
	function update(id: string, field: "username" | "amount", value: string) {
		if (busy) return;
		setRows((current) => current.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
		setError("");
	}
	async function review(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		setMessage("Resolving all recipients…");
		try {
			const values = rows.map((r) => ({
				username: usernameSchema.parse(r.username),
				amount: amountSchema.parse(r.amount),
			}));
			if (new Set(values.map((r) => r.username)).size !== values.length) throw new Error("Each username can appear only once.");
			const resolved = await Promise.all(values.map((r) => api<Recipient>(`/api/users/${r.username}`)));
			if (new Set(resolved.map((r) => r.address)).size !== resolved.length) throw new Error("Choose distinct recipient accounts.");
			setIntent(
				multiPaymentSchema.parse({
					payments: values.map((r, i) => ({
						...r,
						expectedAddress: resolved[i].address,
					})),
				}),
			);
			setRecipients(resolved);
			setStage("review");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Could not resolve recipients.");
		} finally {
			setBusy(false);
			setMessage("");
		}
	}
	async function pay() {
		if (!intent || !w.config) return;
		setBusy(true);
		setError("");
		try {
			const record = hash
				? await confirmMultiPayment(intent, hash, setMessage)
				: await sendMultiPayment(intent, w.config, setMessage, (txHash) => {
						setHash(txHash);
						setStage("pending");
						try {
							sessionStorage.setItem(storageKey, JSON.stringify({ hash: txHash, intent }));
						} catch {
							/* Keep the attempt in memory. */
						}
					});
			if (record.status !== "PENDING") {
				try {
					sessionStorage.removeItem(storageKey);
				} catch {
					/* Optional storage. */
				}
			}
			if (record.status === "FAILED") setError("Stellar reports that this multi-send failed. None of these USDC payments were transferred. Network fees may still apply.");
			setStage(record.status === "CONFIRMED" ? "success" : record.status === "FAILED" ? "failed" : "pending");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Multi-send could not be verified.");
		} finally {
			setBusy(false);
			setMessage("");
		}
	}
	if (stage === "success")
		return (
			<section className="card narrow payment-receipt" aria-label="Multi-send receipt" tabIndex={-1} ref={receiptRef}>
				<div className="receipt-check" aria-hidden="true">
					<Check size={24} />
				</div>
				<h2>Payments sent</h2>
				<div className="receipt-amount">
					<span>${displayAmount(total!)}</span>
					<span className="receipt-asset">USDC</span>
				</div>
				<p className="receipt-recipient">to {intent!.payments.length} recipients</p>
				<div className="receipt-proof">
					<span className="receipt-confirmed">
						<Check size={14} /> Confirmed on Stellar {w.config?.network === "testnet" ? "Testnet" : "Mainnet"}
					</span>
					{w.config?.network === "testnet" && <p>Test assets have no monetary value.</p>}
				</div>
				<div className="receipt-actions">
					<Link href="/dashboard" className="button full">
						Back to overview
					</Link>
					<a className="button secondary full" href={explorer(w.config!.network, hash)} target="_blank" rel="noreferrer">
						View on Stellar Explorer <ArrowUpRight size={16} />
					</a>
				</div>
				<details className="receipt-details">
					<summary>Payment details</summary>
					{intent!.payments.map((p) => (
						<p key={p.username}>
							@{p.username} · {displayAmount(p.amount)} USDC
						</p>
					))}
					<div className="account">{hash}</div>
				</details>
			</section>
		);
	return (
		<div className="card narrow bg-[#070b09]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
			<div className="absolute -top-24 right-0 w-64 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

			{stage === "edit" ? (
				<form onSubmit={review} className="space-y-6 relative z-10">
					<div className="multi-send-heading text-center mb-2">
						<h2 className="text-2xl font-bold text-white tracking-tight">Send to multiple people</h2>
						<p className="text-xs text-zinc-400 mt-1">One approval. One atomic Stellar transaction.</p>
					</div>

					<div className="space-y-4">
						{rows.map((row, i) => (
							<div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 relative group" key={row.id}>
								<div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
									<span>Recipient {i + 1}</span>
									{rows.length > 2 && (
										<button
											className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
											type="button"
											aria-label={`Remove recipient ${i + 1}`}
											disabled={busy}
											onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
										>
											<Trash2 size={14} />
										</button>
									)}
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
									<div className="sm:col-span-3">
										{selected[row.id] ? (
											<SelectedRecipient
												recipient={selected[row.id]}
												label={`Selected recipient ${i + 1}`}
												disabled={busy}
												onChange={() => {
													setSelected((current) => {
														const next = { ...current };
														delete next[row.id];
														return next;
													});
													requestAnimationFrame(() => document.getElementById(`recipient-${row.id}`)?.focus());
												}}
											/>
										) : (
											<>
												<label htmlFor={`recipient-${row.id}`} className="sr-only">
													Recipient {i + 1}
												</label>
												<input
													id={`recipient-${row.id}`}
													value={row.username}
													disabled={busy}
													onChange={(e) => update(row.id, "username", e.target.value)}
													placeholder="@username"
													autoComplete="off"
													className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
													required
												/>
												<RecipientLookup
													value={row.username}
													network={w.config?.network}
													onSelect={(r) => {
														if (busy) return;
														update(row.id, "username", r.username);
														setSelected((current) => ({
															...current,
															[row.id]: r,
														}));
													}}
												/>
											</>
										)}
									</div>

									<div className="sm:col-span-2">
										<label htmlFor={`amount-${row.id}`} className="sr-only">
											Amount {i + 1} · USDC
										</label>
										<div className="relative">
											<input
												id={`amount-${row.id}`}
												value={row.amount}
												disabled={busy}
												onChange={(e) => update(row.id, "amount", e.target.value)}
												inputMode="decimal"
												placeholder="0.00"
												className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-3.5 pr-14 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all text-right font-medium"
												required
											/>
											<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">USDC</span>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>

					{rows.length < 10 && (
						<button
							className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5"
							type="button"
							disabled={busy}
							onClick={() => setRows((current) => [...current, emptyRow()])}
						>
							<Plus size={14} /> Add recipient
						</button>
					)}

					<div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-sm">
						<span className="text-zinc-400">Total · {rows.length} recipients</span>
						<strong className="text-lg font-bold text-emerald-400">{total ? displayAmount(total) : "—"} USDC</strong>
					</div>

					<p className="text-[11px] text-zinc-500 text-center leading-normal">All payments settle atomically on Stellar. If one fails, none are transferred.</p>

					<button
						className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
						disabled={busy}
					>
						Review payments <ArrowUpRight size={16} />
					</button>
				</form>
			) : (
				<div className="space-y-5 relative z-10">
					<h2 className="text-xl font-bold text-white text-center">{stage === "pending" ? "Multi-send confirmation pending" : stage === "failed" ? "Multi-send not confirmed" : "Review all payments"}</h2>

					<div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-sm">
						<span className="text-zinc-400">Total settlement</span>
						<strong className="text-xl font-bold text-emerald-400">{displayAmount(total!)} USDC</strong>
					</div>

					<p className="text-xs text-zinc-500 text-center">
						Stellar {w.config?.network} · {intent!.payments.length} operations · Network fees apply
					</p>

					{stage === "pending" && (
						<p className="text-xs text-zinc-400 text-center" role="status">
							Checking this signed transaction. Stellar confirmation is still required; do not send again.
						</p>
					)}

					<details className="text-xs text-zinc-400">
						<summary className="cursor-pointer">USDC asset details</summary>
						<p className="account break-all mt-2">Issuer: {w.config?.issuer}</p>
					</details>

					<div className="space-y-2 max-h-60 overflow-y-auto pr-1">
						{intent!.payments.map((p, i) => (
							<div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5" key={p.username}>
								<div className="flex justify-between items-center text-sm">
									<strong className="text-white">@{p.username}</strong>
									<span className="font-semibold text-emerald-400">{displayAmount(p.amount)} USDC</span>
								</div>
								{recipients[i] && <Verification verified={recipients[i].verified} />}
								<div className="account text-[10px] font-mono text-zinc-500 truncate select-all">{p.expectedAddress}</div>
							</div>
						))}
					</div>

					{hash && (
						<div className="space-y-2 pt-2">
							<div className="account text-[11px] font-mono p-2.5 rounded-xl bg-black/40 border border-white/5 text-zinc-400 break-all select-all" aria-label="Transaction hash">
								{hash}
							</div>
							<a
								className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1"
								href={explorer(w.config!.network, hash)}
								target="_blank"
								rel="noreferrer"
							>
								View submitted transaction <ArrowUpRight size={14} />
							</a>
						</div>
					)}

					<div className="space-y-3 pt-2">
						<button
							className="w-full py-4 px-6 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 via-[#22634b] to-[#165b43] shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
							disabled={busy || stage === "failed"}
							onClick={pay}
						>
							{hash ? "Check confirmation" : "Confirm multi-send"}
						</button>
						{!hash && (
							<button
								className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
								disabled={busy}
								onClick={() => setStage("edit")}
							>
								Edit recipients
							</button>
						)}
					</div>
				</div>
			)}
			{message && <LoadingStatus>{message}</LoadingStatus>}
			{error && (
				<div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300" role="alert">
					{error}
					{hash && stage !== "failed" && <span className="block mt-1 font-semibold">Check this hash before retrying. Submission may have succeeded.</span>}
				</div>
			)}
		</div>
	);
}
