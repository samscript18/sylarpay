export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Process liveness only; no wallet, database or external provider access. */
export function GET() {
  return Response.json(
    { status: "ok", service: "sylarpay" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
