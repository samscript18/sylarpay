import { FlaskConical } from "lucide-react";
import type { StellarNetwork } from "@/lib/config";

const highlights = ["Verifiable USDC settlement", "Simulated fiat payout", "No live NGN rail", "Wallet approval required"];

export function TestnetDisclosure({ network }: { network?: StellarNetwork }) {
  if (network !== "testnet") return null;
  return (
    <aside aria-label="Testnet demonstration notice" className="testnet-notice">
      <div className="testnet-notice-header">
        <span className="testnet-notice-label"><FlaskConical size={14} aria-hidden="true" />Stellar Testnet</span>
        <div className="testnet-notice-marquee" aria-hidden="true">
          <div className="testnet-notice-track">
            {[0, 1].map(copy => (
              <div className="testnet-notice-group" key={copy}>
                {highlights.map(text => <span key={text}><i />{text}</span>)}
              </div>
            ))}
          </div>
        </div>
        <span className="testnet-notice-tag">Demo environment</span>
      </div>
      <div className="testnet-notice-copy">
        <p>Stellar Testnet. USDC settlement is real and verifiable. Fiat payout is simulated; no NGN rail is live.</p>
        <p>Test assets have no monetary value. Sending USDC and starting cash-out require Freighter approval.</p>
      </div>
    </aside>
  );
}
