"use client";

import { useState, useTransition } from "react";
import { unsubscribeDigest } from "@/app/[lang]/account-actions";

export function UnsubscribeButton({
  userId, token, t,
}: { userId: string; token: string; t: { unsubText: string; unsubConfirm: string; unsubDone: string; error: string } }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [pending, start] = useTransition();
  if (state === "done") return <p role="status">{t.unsubDone}</p>;
  return (
    <>
      <p className="mb-4 opacity-80">{t.unsubText}</p>
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        onClick={() => start(async () => { try { await unsubscribeDigest(userId, token); setState("done"); } catch { setState("error"); } })}
      >
        {t.unsubConfirm}
      </button>
      {state === "error" && <p role="alert" className="mt-3 text-sm text-red-600">{t.error}</p>}
    </>
  );
}
