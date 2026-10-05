import { PaymentDetails } from "@/components/payment-details";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ txHash: string }>;
  searchParams: Promise<{ operation?: string }>;
}) {
  const { txHash } = await params;
  const { operation } = await searchParams;
  return <PaymentDetails txHash={txHash} operation={operation} />;
}
