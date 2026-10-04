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
  if (origin && origin !== new URL(request.url).origin)
    throw new AppError("Invalid request origin.", 403);
}
