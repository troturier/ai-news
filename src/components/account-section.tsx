"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount, updateAccount } from "@/app/[lang]/account-actions";
import { authClient } from "@/lib/auth-client";

type T = {
  displayName: string; language: string; digest: string; save: string; saved: string; error: string;
  export: string; dangerTitle: string; dangerText: string; typeEmail: string; deleteBtn: string; lastAdmin: string; reauth: string;
};

const field = "w-full rounded-md border border-black/20 bg-transparent px-3 py-1.5 dark:border-white/25";

export function AccountSection({
  lang, name, email, locale, digest, t,
}: { lang: string; name: string; email: string; locale: "fr" | "en"; digest: boolean; t: T }) {
  const router = useRouter();
  const [form, setForm] = useState({ name, locale, digestEnabled: digest });
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-8">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            try {
              await updateAccount(form);
              setMsg(t.saved);
              router.refresh();
            } catch {
              setMsg(t.error);
            }
          });
        }}
      >
        <label className="block text-sm">
          {t.displayName}
          <input className={field} value={form.name} maxLength={80} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block text-sm">
          {t.language}
          <select className={field} value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value as "fr" | "en" })}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.digestEnabled} onChange={(e) => setForm({ ...form, digestEnabled: e.target.checked })} />
          {t.digest}
        </label>
        <button type="submit" disabled={pending} className="rounded-md bg-foreground px-4 py-1.5 text-background disabled:opacity-50">{t.save}</button>
        {msg && <span role="status" className="ml-3 text-sm">{msg}</span>}
      </form>

      <p>
        <a href="/api/account/export" download className="text-sm underline">{t.export}</a>
      </p>

      <section className="rounded-lg border border-red-600/40 p-4">
        <h3 className="font-semibold text-red-600">{t.dangerTitle}</h3>
        <p className="my-2 text-sm opacity-80">{t.dangerText}</p>
        <label className="block text-sm">
          {t.typeEmail} (<code>{email}</code>)
          <input className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </label>
        {delMsg && <p role="alert" className="mt-2 text-sm text-red-600">{delMsg}</p>}
        <button
          type="button"
          disabled={pending || confirm.trim().toLowerCase() !== email.toLowerCase()}
          className="mt-3 rounded-md border border-red-600 px-4 py-1.5 text-red-600 disabled:opacity-40"
          onClick={() =>
            start(async () => {
              setDelMsg(null);
              try {
                await deleteAccount(confirm);
                await authClient.signOut().catch(() => {});
                router.push(`/${lang}`);
                router.refresh();
              } catch (err) {
                setDelMsg(
                  (err as Error).message.includes("last_admin") ? t.lastAdmin
                  : (err as Error).message.includes("reauth_required") ? t.reauth
                  : t.error,
                );
              }
            })
          }
        >
          {t.deleteBtn}
        </button>
      </section>
    </div>
  );
}
