import { NextResponse } from "next/server";
import { legal } from "@/lib/legal";

export const dynamic = "force-dynamic";

/**
 * Publisher contact address, served on demand (never written in the page HTML) so that e-mail harvesters
 * that only read the markup do not find it. Called by the "Show e-mail address" button of the legal page.
 */
export async function GET(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (!legal.contactEmail || (fetchSite && fetchSite !== "same-origin")) {
    return NextResponse.json({}, { status: 404 });
  }
  return NextResponse.json({ email: legal.contactEmail }, { headers: { "Cache-Control": "no-store" } });
}
