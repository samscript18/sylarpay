"use client";
import { Check, Pencil } from "lucide-react";
import type { Recipient } from "@/lib/payment-client";

export function SelectedRecipient({ recipient, onChange, disabled, label = "Selected recipient" }: { recipient: Recipient; onChange: () => void; disabled?: boolean; label?: string }) {
	return (
		<div className="selected-recipient" role="group" aria-label={label}>
			<span className="selected-recipient-avatar" aria-hidden="true">
				{(recipient.profile?.displayName || recipient.username)[0].toUpperCase()}
			</span>
			<div className="selected-recipient-info">
				<div className="recipient-match-name">
					<strong>@{recipient.username}</strong>
					{recipient.verified ? (
						<span className="recipient-verified" role="img" aria-label="Sylar Verified" title="Sylar Verified">
							<Check size={10} strokeWidth={3} aria-hidden="true" />
						</span>
					) : (
						<span className="recipient-unverified">Unverified</span>
					)}
				</div>
				<div className="recipient-match-meta">
					{recipient.profile?.displayName && (
						<>
							<span className="truncate">{recipient.profile.displayName}</span>
							<span aria-hidden="true">·</span>
						</>
					)}
					<span className="shrink-0" title={recipient.address}>
						{recipient.address.slice(0, 4)}…{recipient.address.slice(-4)}
					</span>
				</div>
				<span className="selected-recipient-label">
					<Check size={10} aria-hidden="true" /> Recipient selected
				</span>
			</div>
			<button type="button" className="selected-recipient-change" disabled={disabled} onClick={onChange} aria-label={`Change recipient @${recipient.username}`}>
				<Pencil size={13} aria-hidden="true" />
				<span>Change</span>
			</button>
		</div>
	);
}
