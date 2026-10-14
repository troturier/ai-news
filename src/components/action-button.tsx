"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Button that runs a server action already bound to its arguments (`action.bind(null, …)`). */
export function ActionButton({
  action,
  label,
  confirmText,
  tone = "default",
}: {
  action: () => Promise<void>;
  label: string;
  confirmText?: string;
  tone?: "default" | "danger";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          setError(false);
          start(async () => {
            try {
              await action();
              router.refresh();
            } catch {
              setError(true);
            }
          });
        }}
        className={`rounded-md border px-3 py-1 text-sm disabled:opacity-50 ${
          tone === "danger" ? "border-red-600 text-red-600" : "border-black/20 dark:border-white/25"
        }`}
      >
        {label}
      </button>
      {error && <span role="alert" className="ml-2 text-xs text-red-600">Échec</span>}
    </>
  );
}
