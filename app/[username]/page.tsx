import { notFound } from "next/navigation";
import { usernameSchema } from "@/lib/validation";
import { PublicProfile } from "@/components/public-profile";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ amount?: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  if (!username.startsWith("@")) notFound();
  const r = usernameSchema.safeParse(username);
  if (!r.success) notFound();
  const { amount } = await searchParams;
  return <PublicProfile username={r.data} amount={amount} />;
}
