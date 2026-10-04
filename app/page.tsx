import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Globe2,
  ShieldCheck,
  AtSign,
  ArrowDownLeft,
} from "lucide-react";
export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="dot" /> A simpler way to get paid
          </span>
          <h1>
            Get paid globally.
            <br />
            Pay locally.
            <br />
            <span>Just use @username.</span>
          </h1>
          <p className="lead">
            Your work travels the world.
            <br />
            Your payments should, too.
          </p>
          <p className="muted hero-copy">
            Turn your Stellar account into a simple payment identity. Receive
            USDC through a username, link, or QR code, then cash out through a
            compatible local off-ramp.
          </p>
          <div className="actions">
            <Link className="button" href="/claim">
              Claim your @username <ArrowUpRight size={18} />
            </Link>
            <a className="button secondary" href="#how">
              See how it works
            </a>
          </div>
          <div className="hero-proof">
            <ShieldCheck size={18} /> Yours to own. Settled on Stellar.
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-label">ONE NAME. EVERYWHERE.</div>
          <div className="profile-preview">
            <div className="avatar">S</div>
            <h2>@sam</h2>
            <span className="badge">
              <Check size={14} /> Skylar Verified
            </span>
            <p className="muted">Independent designer · Lagos, Nigeria</p>
            <div className="example-payment">
              <span className="round-icon">
                <ArrowDownLeft />
              </span>
              <div>
                <strong>$150.00 USDC</strong>
                <span>Example payment received</span>
              </div>
              <Check size={18} />
            </div>
            <button className="button full" disabled>
              Pay @sam <ArrowUpRight size={18} />
            </button>
            <p className="tiny">Illustrative profile · No funds moved</p>
          </div>
          <div className="link-preview">
            <AtSign size={19} />
            <span>skylarpay.app/@sam</span>
            <span className="dot" />
          </div>
          <span className="orbit-label">
            <Globe2 size={16} /> From anywhere. To you.
          </span>
        </div>
      </section>
      <section className="how" id="how">
        <div className="section-heading">
          <span className="eyebrow">Less friction. More freedom.</span>
          <h2>
            Four steps.
            <br />A world of possibilities.
          </h2>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Claim your name",
              "Connect your wallet and make @username yours.",
            ],
            [
              "02",
              "Share your link",
              "One link or QR code. No long addresses.",
            ],
            [
              "03",
              "Get paid in USDC",
              "Payments settle on Stellar and remain publicly verifiable.",
            ],
            [
              "04",
              "Cash out locally",
              "Use a compatible anchor and its supported local payout rails.",
            ],
          ].map(([n, t, d]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="proof-section">
        <ShieldCheck size={36} />
        <div>
          <span className="eyebrow">
            Simple on the surface. Verifiable underneath.
          </span>
          <h2>
            The blockchain handles settlement.
            <br />
            SkylarPay handles the experience.
          </h2>
          <p>
            Your username lives in a Soroban smart contract. Payments move
            directly between wallets. SkylarPay keeps your private payment notes
            inside the app while the underlying Stellar transaction remains
            publicly verifiable.
          </p>
        </div>
      </section>
      <section className="final-cta">
        <h2>
          Your next payment
          <br />
          starts with your name.
        </h2>
        <Link href="/claim" className="button">
          Get your @username <ArrowUpRight size={18} />
        </Link>
      </section>
    </main>
  );
}
