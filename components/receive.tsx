"use client";
import { TestnetDisclosure } from "./testnet-disclosure";
import { ProfileSkeleton } from "./skeleton";
import { useWallet, ConnectPrompt } from "./wallet-provider";
import { useAccount } from "@/lib/use-account";
import { PaymentForm } from "./payment-form";
import { FaqAccordion } from "./faq-accordion";

export function Receive() {
  const w = useWallet();
  const a = useAccount();

  return (
    <main className="workspace">
      <TestnetDisclosure network={w.config?.network} />
      <div className="page-heading narrow">
        <span className="eyebrow">From anywhere. To you.</span>
        <h1>Receive USDC</h1>
        <p>Anyone can pay you using your @username, link, or QR code.</p>
      </div>

      {!w.account ? (
        <ConnectPrompt />
      ) : a.loading && !a.data ? (
        <ProfileSkeleton label="Loading your payment link…" />
      ) : (
        <>
          <PaymentForm initialMode="receive" />
          <FaqAccordion />
        </>
      )}
    </main>
  );
}
