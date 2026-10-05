import { SendPanel } from "@/components/send-panel";
import { FaqAccordion } from "@/components/faq-accordion";

export default function Send() {
  return (
    <main className="workspace">
      <div className="page-heading narrow">
        <span className="eyebrow">Across borders. Between people.</span>
        <h1>Send USDC</h1>
        <p>A username is all you need to get started.</p>
      </div>
      <SendPanel />
      <FaqAccordion />
    </main>
  );
}
