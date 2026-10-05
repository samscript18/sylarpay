"use client";
import { useState } from "react";
import { PaymentForm } from "./payment-form";
import { MultiSend } from "./multi-send";
import { ConnectPrompt, useWallet } from "./wallet-provider";
export function SendPanel() {
	const w = useWallet();
	if (!w.account) return <ConnectPrompt />;
	return <ConnectedSendPanel key={`${w.account}:${w.config?.network}`} />;
}
function ConnectedSendPanel() {
	const w = useWallet();
	const [mode, setMode] = useState<"single" | "multi">(() => {
		try {
			return sessionStorage.getItem(`sylar_multi_payment_${w.account}_${w.config?.network}`) ? "multi" : "single";
		} catch {
			return "single";
		}
	});
	const [locked, setLocked] = useState(false);
	return (
		<>
			<div className="send-mode" role="group" aria-label="Send mode">
				<button type="button" aria-pressed={mode === "single"} disabled={locked} onClick={() => setMode("single")}>
					One recipient
				</button>
				<button type="button" aria-pressed={mode === "multi"} disabled={locked} onClick={() => setMode("multi")}>
					Multiple recipients
				</button>
			</div>
			{mode === "single" ? <PaymentForm onLockChange={setLocked} /> : <MultiSend onLockChange={setLocked} />}
		</>
	);
}
