import { loadEnvFile } from "node:process";
import { eq } from "drizzle-orm";

try {
  loadEnvFile(".env");
} catch {}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- address@example.com");
    process.exit(1);
  }
  const { db } = await import("./index");
  const { user } = await import("./schema");
  const rows = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email.toLowerCase()))
    .returning({ email: user.email });
  console.log(rows.length ? `${rows[0].email} is now an admin.` : "No account with this address.");
  process.exit(rows.length ? 0 : 1);
}
main();
