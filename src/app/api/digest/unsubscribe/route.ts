import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { verifyUnsubscribeToken } from "@/lib/digest-token";

/** "One-click" unsubscribe (RFC 8058): POST sent by the mail client. */
export async function POST(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!u || !verifyUnsubscribeToken(u, t)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await db.update(user).set({ digestEnabled: false }).where(eq(user.id, u));
  return NextResponse.json({ ok: true });
}
