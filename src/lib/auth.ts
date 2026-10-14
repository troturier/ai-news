import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { captcha } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/lib/email";

const lien = (url: string, texte: string) =>
  `<p><a href="${url}">${texte}</a></p>`;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe / Password reset",
        html: lien(url, "Réinitialiser mon mot de passe / Reset my password"),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirmez votre adresse e-mail / Confirm your email",
        html: lien(url, "Confirmer mon adresse / Confirm my address"),
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "reader", input: false },
      locale: { type: "string", defaultValue: "fr" },
      onboardedAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Default reading list, created with the account.
        after: async (user) => {
          await db.insert(schema.readingLists).values({
            userId: user.id,
            name: "À lire plus tard",
            color: "#6366f1",
            icon: "clock",
            isDefault: true,
          });
        },
      },
    },
  },
  rateLimit: {
    // Resending the verification e-mail is not covered by the captcha: cap it per IP (protects the sender reputation).
    customRules: { "/send-verification-email": { window: 3600, max: 5 } },
  },
  plugins: [
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
      endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
    }),
    nextCookies(), // must stay last
  ],
});
