"use client";

import { IconMail } from "@tabler/icons-react";
import { useState } from "react";

/** E-mail address revealed on click: it is fetched from the API, so it is absent from the HTML served to crawlers. */
export function RevealEmail({ label, reveal }: { label: string; reveal: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function show() {
    try {
      const res = await fetch("/api/contact", { cache: "no-store" });
      if (!res.ok) throw new Error("unavailable");
      setEmail(((await res.json()) as { email: string }).email);
    } catch {
      setFailed(true);
    }
  }

  return (
    <p className="flex flex-wrap items-center gap-2">
      <strong>{label}</strong> :
      {email ? (
        <a href={`mailto:${email}`} className="underline">{email}</a>
      ) : (
        <button type="button" onClick={show} className="inline-flex items-center gap-1.5 rounded-md border border-black/20 px-2.5 py-1 text-sm dark:border-white/25">
          <IconMail size={16} aria-hidden /> {reveal}
        </button>
      )}
      {failed && <span role="alert" className="text-sm text-red-600">!</span>}
    </p>
  );
}
