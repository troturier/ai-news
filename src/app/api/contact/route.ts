import { NextResponse } from "next/server";
import { legal } from "@/lib/legal";

export const dynamic = "force-dynamic";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Publisher contact address, served on demand (never written in the page HTML) and only against a valid
 * Cloudflare Turnstile token, so that neither markup harvesters nor scripts calling the endpoint directly get it.
 * Called by the "Show e-mail address" button of the legal page.
 */
export async function POST(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (!legal.contactEmail || !process.env.TURNSTILE_SECRET_KEY || (fetchSite && fetchSite !== "same-origin")) {
    return NextResponse.json({}, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (typeof body?.token !== "string" || body.token.length === 0 || body.token.length > 4096) {
    return NextResponse.json({}, { status: 400 });
  }
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: body.token }),
      signal: AbortSignal.timeout(8_000),
    });
    const verdict = (await res.json()) as { success?: boolean };
    if (!verdict.success) return NextResponse.json({}, { status: 403 });
  } catch {
    return NextResponse.json({}, { status: 502 });
  }
  return NextResponse.json({ email: legal.contactEmail }, { headers: { "Cache-Control": "no-store" } });
}
