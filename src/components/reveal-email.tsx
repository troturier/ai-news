"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { IconMail } from "@tabler/icons-react";
import { useState } from "react";

type Texts = { label: string; reveal: string; error: string };

/**
 * E-mail address revealed on demand: the button loads a Cloudflare Turnstile challenge (nothing is loaded from
 * Cloudflare before the click) and the address is then fetched from the API against the token, so it is absent
 * from the HTML served to crawlers and cannot be retrieved by a script that skips the challenge.
 */
export function RevealEmail({ label, reveal, error, lang }: Texts & { lang: string }) {
  const [challenge, setChallenge] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function fetchEmail(token: string) {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("refused");
      setEmail(((await res.json()) as { email: string }).email);
    } catch {
      setFailed(true);
      setChallenge(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <strong>{label}</strong> :
      {email ? (
        <a href={`mailto:${email}`} className="underline">{email}</a>
      ) : challenge ? (
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          options={{ language: lang }}
          onSuccess={fetchEmail}
          onError={() => { setFailed(true); setChallenge(false); }}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setFailed(false); setChallenge(true); }}
          className="inline-flex items-center gap-1.5 rounded-md border border-black/20 px-2.5 py-1 text-sm dark:border-white/25"
        >
          <IconMail size={16} aria-hidden /> {reveal}
        </button>
      )}
      {failed && <span role="alert" className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
