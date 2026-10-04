import { ClaimForm } from "@/components/claim-form";
export default function Claim() {
  return (
    <main className="workspace">
      <div className="page-heading narrow">
        <span className="eyebrow">Make it yours</span>
        <h1>One name. Every payment.</h1>
        <p>Claim your payment identity on Stellar.</p>
      </div>
      <ClaimForm />
    </main>
  );
}
