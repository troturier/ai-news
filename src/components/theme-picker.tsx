"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveThemes } from "@/app/[lang]/actions";

export type ThemeOption = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode; // rendered server side
  color: string;
};

export function ThemePicker({
  themes,
  initial,
  saveLabel,
  pickOneLabel,
  savedLabel,
  redirectTo,
  digest,
}: {
  themes: ThemeOption[];
  initial: string[];
  saveLabel: string;
  pickOneLabel: string;
  savedLabel?: string;
  redirectTo?: string;
  digest?: { label: string; hint: string }; // onboarding only: opt-in/out of the weekly digest
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(initial));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [digestOn, setDigestOn] = useState(false);
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  function submit() {
    if (selected.size === 0) return setError(pickOneLabel);
    setError(null);
    setSaved(false);
    start(async () => {
      await saveThemes({ themeIds: [...selected], ...(digest ? { digestEnabled: digestOn } : {}) });
      if (redirectTo) router.push(redirectTo);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {themes.map((t) => {
          const on = selected.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(t.id)}
                className="flex w-full items-start gap-3 rounded-lg border p-4 text-left transition"
                style={{
                  borderColor: on ? t.color : undefined,
                  background: on ? `${t.color}18` : undefined,
                }}
              >
                <span style={{ color: t.color }}>
                  {t.icon}
                </span>
                <span>
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-sm opacity-70">{t.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {digest && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border p-4">
          <input type="checkbox" className="mt-1" checked={digestOn} onChange={(e) => setDigestOn(e.target.checked)} />
          <span>
            <span className="block font-medium">{digest.label}</span>
            <span className="block text-sm opacity-70">{digest.hint}</span>
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="mt-6 rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {saveLabel}
      </button>
      {saved && savedLabel && (
        <p role="status" className="mt-2 text-sm">
          {savedLabel}
        </p>
      )}
    </div>
  );
}
