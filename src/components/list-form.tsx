"use client";

import { useState, useTransition } from "react";
import { ColorPicker, IconPicker } from "@/components/icon-picker";

export type ListValues = { name: string; color: string; icon: string };

export type ListFormTexts = {
  name: string; color: string; icon: string; searchIcon: string; iconResults: string;
  save: string; cancel: string; error: string;
};

/** List form (name, color, icon), shared by creation and editing. */
export function ListForm({
  initial,
  t,
  onSubmit,
  onCancel,
  fixedIdentity = false,
}: {
  initial: ListValues;
  t: ListFormTexts;
  onSubmit: (values: ListValues) => Promise<void>;
  onCancel: () => void;
  fixedIdentity?: boolean; // default list: name and icon not editable
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const field = "w-full rounded-md border border-black/20 bg-transparent px-3 py-1.5 dark:border-white/25";

  return (
    <form
      className="space-y-3 rounded-lg border border-black/15 p-4 dark:border-white/20"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          try {
            await onSubmit(v);
          } catch {
            setError(t.error);
          }
        });
      }}
    >
      <label className="block text-sm">
        {t.name}
        <input className={field} value={v.name} maxLength={40} required readOnly={fixedIdentity} disabled={fixedIdentity} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </label>
      <div className="text-sm">
        <p className="mb-1">{t.color}</p>
        <ColorPicker value={v.color} onChange={(color) => setV({ ...v, color })} />
      </div>
      {!fixedIdentity && <div className="text-sm">
        <p className="mb-1">{t.icon} : <code>{v.icon}</code></p>
        <IconPicker value={v.icon} color={v.color} onChange={(icon) => setV({ ...v, icon })} placeholder={t.searchIcon} resultsLabel={t.iconResults} />
      </div>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-foreground px-4 py-1.5 text-background disabled:opacity-50">{t.save}</button>
        <button type="button" className="btn-plain underline" onClick={onCancel}>{t.cancel}</button>
      </div>
    </form>
  );
}
