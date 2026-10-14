// LOCAL test account (never in production): reads DEV_USER_EMAIL / DEV_USER_PASSWORD from the environment.
import { loadEnvFile, exit } from "node:process";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

for (const f of [".env.local", ".env"]) {
  try {
    loadEnvFile(f);
  } catch {}
}

async function main() {
  const email = process.env.DEV_USER_EMAIL;
  const password = process.env.DEV_USER_PASSWORD;
  if (!email || !password || !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) {
    console.error("DEV_USER_EMAIL / DEV_USER_PASSWORD are required, and DATABASE_URL must be local.");
    exit(1);
  }
  const { db } = await import("./index");
  const { account, readingLists, user } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  await db.delete(user).where(eq(user.email, email)); // cascade: sessions, accounts, lists…
  const id = randomUUID();
  await db.insert(user).values({ id, name: "Compte de test", email, emailVerified: true });
  await db.insert(account).values({
    id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password),
  });
  await db.insert(readingLists).values({
    userId: id, name: "À lire plus tard", color: "#6366f1", icon: "clock", isDefault: true,
  });
  console.log("Test account (re)created:", email);
  exit(0);
}
main();
