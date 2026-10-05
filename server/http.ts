import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "INVALID_REQUEST",
  ) {
    super(message);
  }
}
export function log(
  event: string,
  details: Record<string, string | boolean> = {},
) {
  console.info(
    JSON.stringify({ event, ...details, time: new Date().toISOString() }),
  );
}
export async function safe(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message || "Invalid request." },
        { status: 400 },
      );
    if (e instanceof AppError)
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      );
    log("request_failed", { type: e instanceof Error ? e.name : "Unknown" });
    return NextResponse.json(
      {
        error:
          "This request could not be completed. Check configuration and try again.",
      },
      { status: 503 },
    );
  }
}
export async function json(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 20000)
    throw new AppError("Request too large.", 413);
  const raw = await request.text();
  if (raw.length > 20000) throw new AppError("Request too large.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("Invalid JSON.");
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      throw new AppError("Invalid request origin.", 403);
    return;
  }
  // HTTPS terminates at hosting proxies. Use trusted deployment configuration,
  // not the internal HTTP URL or client-controlled forwarded headers.
  const allowed = new Set<string>();
  for (const value of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RENDER_EXTERNAL_URL,
  ]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && !url.username && !url.password)
        allowed.add(url.origin);
    } catch {
      /* An invalid setting must never authorize an origin. */
    }
  }
  if (process.env.NODE_ENV !== "production")
    allowed.add(new URL(request.url).origin);
  if (!allowed.has(origin)) throw new AppError("Invalid request origin.", 403);
}
