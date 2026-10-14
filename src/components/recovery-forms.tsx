"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { authClient } from "@/lib/auth-client";

const input = "w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/25";

export function ForgotPasswordForm({
  lang, t,
}: {
  lang: string;
  t: { email: string; send: string; sent: string; captchaRequired: string; genericError: string };
}) {
  const turnstile = useRef<TurnstileInstance>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sent" | "error" | "captcha">("idle");
  const [pending, setPending] = useState(false);

  if (status === "sent") return <p role="status">{t.sent}</p>;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!token) return setStatus("captcha");
        setPending(true);
        const email = String(new FormData(e.currentTarget).get("email"));
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: `/${lang}/reset-password`,
          fetchOptions: { headers: { "x-captcha-response": token } },
        });
        setPending(false);
        turnstile.current?.reset();
        setToken(null);
        // Same response whether or not the account exists (no account enumeration).
        setStatus(res.error && res.error.status !== 404 ? "error" : "sent");
      }}
    >
      <label className="block text-sm">
        {t.email}
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <Turnstile
        ref={turnstile}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        options={{ language: lang }}
        onSuccess={setToken}
        onExpire={() => setToken(null)}
      />
      {status === "captcha" && <p role="alert" className="text-sm text-red-600">{t.captchaRequired}</p>}
      {status === "error" && <p role="alert" className="text-sm text-red-600">{t.genericError}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-md bg-foreground px-3 py-2 text-background disabled:opacity-50">
        {t.send}
      </button>
    </form>
  );
}

export function ResetPasswordForm({
  lang, token, t,
}: {
  lang: string;
  token: string | null;
  t: { newPassword: string; passwordHint: string; reset: string; done: string; invalidLink: string; signIn: string };
}) {
  const [state, setState] = useState<"idle" | "done" | "error">(token ? "idle" : "error");
  const [pending, setPending] = useState(false);

  if (state === "done") {
    return (
      <p role="status">
        {t.done}{" "}
        <Link href={`/${lang}/sign-in`} className="underline">{t.signIn}</Link>
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!token) return;
        setPending(true);
        const res = await authClient.resetPassword({
          newPassword: String(new FormData(e.currentTarget).get("password")),
          token,
        });
        setPending(false);
        setState(res.error ? "error" : "done");
      }}
    >
      <label className="block text-sm">
        {t.newPassword}
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
        <span className="text-xs opacity-60">{t.passwordHint}</span>
      </label>
      {state === "error" && <p role="alert" className="text-sm text-red-600">{t.invalidLink}</p>}
      <button type="submit" disabled={pending || !token} className="w-full rounded-md bg-foreground px-3 py-2 text-background disabled:opacity-50">
        {t.reset}
      </button>
    </form>
  );
}
