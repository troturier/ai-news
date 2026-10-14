import { createHmac, timingSafeEqual } from "node:crypto";

// Unsubscribe token: HMAC of the identifier (no expiry, like an e-mail link).
const sign = (userId: string) =>
  createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update(`digest-unsubscribe:${userId}`)
    .digest("base64url");

export const unsubscribeToken = sign;

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  if (!process.env.BETTER_AUTH_SECRET) return false;
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
