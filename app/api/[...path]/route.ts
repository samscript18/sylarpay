import { handleGet, handlePost } from "@/server/routes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handleGet(req);
}
export async function POST(req: Request) {
  return handlePost(req);
}
