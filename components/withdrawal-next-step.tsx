"use client";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { FundWithdrawal } from "./fund-withdrawal";
import type { WithdrawalSession } from "@/server/offramp";

export function WithdrawalNextStep({
  session,
  busy,
  reconnect,
  refresh,
}: {
  session: WithdrawalSession;
  busy: boolean;
  reconnect: () => void;
  refresh: () => void;
}) {
  const closed = ["COMPLETED", "FAILED", "EXPIRED", "CANCELLED"].includes(
    session.status,
  );
  let title = "Your withdrawal is processing";
  let description =
    "We’ll check for updates automatically. You can leave this page and return later.";
  let label = "";
  let href: string | undefined;
  let action: (() => void) | undefined;
  let hint = "";
  let Icon = Clock3;
  if (closed) {
    Icon = session.status === "COMPLETED" ? CheckCircle2 : CircleAlert;
    title =
      session.status === "COMPLETED"
        ? "Withdrawal finished"
        : session.status === "EXPIRED"
          ? "Withdrawal expired"
          : session.status === "CANCELLED"
            ? "Withdrawal cancelled"
            : "Withdrawal could not be completed";
    description =
      session.status === "COMPLETED"
        ? "The partner has reported completion. See the transaction details below."
        : "Review the partner’s transaction details before making another withdrawal.";
  } else if (session.providerAccessExpired) {
    Icon = ShieldCheck;
    title = "Reconnect to continue";
    description =
      "Your withdrawal is saved. Reconnect your wallet to the partner to check its latest status.";
    label = "Reconnect to partner";
    action = reconnect;
    hint =
      "Approve access in Freighter. This does not send money or start another withdrawal.";
  } else if (
    session.interactiveUrlExpired &&
    session.status === "AWAITING_KYC"
  ) {
    Icon = CircleAlert;
    title = "Your partner link has expired";
    description =
      "Your withdrawal is saved. Open the partner’s details to look for instructions to continue.";
    if (session.moreInfoUrl) {
      label = "Open partner details";
      href = session.moreInfoUrl;
      hint = `Opens ${session.provider} in a new tab. A new verification link must come from the partner.`;
    } else {
      description =
        "Your withdrawal is saved. Check for new instructions from the partner before starting another cash out.";
      label = "Check for updates";
      action = refresh;
    }
  } else if (session.status === "AWAITING_KYC" || session.demo) {
    Icon = ShieldCheck;
    title = session.demo
      ? "Explore the demo handoff"
      : "Complete your details with the partner";
    description = session.demo
      ? "This is a demonstration. No funds move and no bank payout occurs."
      : `${session.provider} needs a few details before your withdrawal can continue.`;
    if (session.interactiveUrl && !session.interactiveUrlExpired) {
      label = session.demo ? "Open demo experience" : "Continue verification";
      href = session.interactiveUrl;
      hint = session.demo
        ? "Demo Off-Ramp · simulated processing only"
        : `Opens ${session.provider} in a new tab. Return here when you’re done.`;
    }
  } else if (
    session.status === "AWAITING_USER_TRANSFER" &&
    !session.fundingHash
  ) {
    title = "Review your USDC transfer";
    description =
      "Check the partner’s destination, amount and memo. You’ll approve the transfer in Freighter.";
  } else if (session.status === "CREATED" && !session.anchorId) {
    Icon = CircleAlert;
    title = "We’re checking your request";
    description =
      "The partner has not confirmed this request. Don’t start another withdrawal or send USDC until it is reconciled.";
  }
  return (
    <section
      aria-label="Next step"
      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
    >
      <div className="flex gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {closed ? "Withdrawal update" : "Next step"}
          </p>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>
      </div>
      {label && (
        <div className="mt-5">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="button w-full gap-2"
            >
              {label}
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          ) : (
            <button className="button w-full" disabled={busy} onClick={action}>
              {label}
            </button>
          )}
          {hint && (
            <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
              {hint}
            </p>
          )}
        </div>
      )}
      {!closed &&
        !session.providerAccessExpired &&
        !session.demo &&
        (session.status === "AWAITING_USER_TRANSFER" ||
          session.fundingHash) && (
          <div className="mt-5">
            <FundWithdrawal
              key={session.id}
              id={session.id}
              fundingHash={session.fundingHash}
            />
          </div>
        )}
    </section>
  );
}
