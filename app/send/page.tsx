import { PaymentForm } from "@/components/payment-form";
export default function Send() {
  return (
    <main className="workspace">
      <div className="page-heading narrow">
        <span className="eyebrow">Across borders. Between people.</span>
        <h1>Send USDC</h1>
        <p>A username is all you need to get started.</p>
      </div>
      <PaymentForm />
    </main>
  );
}
