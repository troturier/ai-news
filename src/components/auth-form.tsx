"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { authClient } from "@/lib/auth-client";

type Texts = {
  name: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  google: string;
  or: string;
  switchPrompt: string;
  switchLabel: string;
  captchaRequired: string;
  forgotLink: string;
  checkEmail: string;
  genericError: string;
};

export function AuthForm({
  mode,
  lang,
  t,
}: {
  mode: "sign-in" | "sign-up";
  lang: string;
  t: Texts;
}) {
  const router = useRouter();
  const turnstile = useRef<TurnstileInstance>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = `/${lang}/onboarding`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) return setError(t.captchaRequired);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const fetchOptions = { headers: { "x-captcha-response": token } };
    setPending(true);
    const res =
      mode === "sign-up"
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get("name")),
            locale: lang,
            callbackURL: next,
            fetchOptions,
          })
        : await authClient.signIn.email({ email, password, fetchOptions });
    setPending(false);
    // A Turnstile token can only be used once.
    turnstile.current?.reset();
    setToken(null);
    if (res.error) return setError(res.error.message ?? t.genericError);
    if (mode === "sign-up") return setInfo(t.checkEmail);
    router.push(next);
    router.refresh();
  }

  const input =
    "w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/25";

  if (info) return <p role="status">{info}</p>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/25"
        onClick={() =>
          authClient.signIn.social({ provider: "google", callbackURL: next })
        }
      >
        {t.google}
      </button>
      <p className="text-center text-sm opacity-60">{t.or}</p>
      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "sign-up" && (
          <label className="block text-sm">
            {t.name}
            <input name="name" required autoComplete="name" className={input} />
          </label>
        )}
        <label className="block text-sm">
          {t.email}
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="block text-sm">
          {t.password}
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            className={input}
          />
          {mode === "sign-up" && (
            <span className="text-xs opacity-60">{t.passwordHint}</span>
          )}
        </label>
        <Turnstile
          ref={turnstile}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          options={{ language: lang }}
          onSuccess={setToken}
          onExpire={() => setToken(null)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {t.submit}
        </button>
      </form>
      {mode === "sign-in" && (
        <p className="text-center text-sm">
          <Link className="underline" href={`/${lang}/forgot-password`}>{t.forgotLink}</Link>
        </p>
      )}
      <p className="text-center text-sm">
        {t.switchPrompt}{" "}
        <Link
          className="underline"
          href={`/${lang}/${mode === "sign-in" ? "sign-up" : "sign-in"}`}
        >
          {t.switchLabel}
        </Link>
      </p>
    </div>
  );
}
