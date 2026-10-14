"use client";

import { IconDownload, IconPencil, IconTrash } from "@tabler/icons-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteList, updateList } from "@/app/[lang]/interaction-actions";
import { ListForm, type ListFormTexts } from "@/components/list-form";

/** List actions: edit (name, color, icon), delete (except the default list), export. */
export function ListToolbar({
  list,
  lang,
  exportHref,
  t,
}: {
  list: { id: string; name: string; color: string; icon: string; isDefault: boolean };
  lang: string;
  exportHref: string;
  t: ListFormTexts & { edit: string; delete: string; export: string; confirmDelete: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const btn = "inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          <IconPencil size={16} aria-hidden /> {t.edit}
        </button>
        <a href={exportHref} download className={`${btn} hover-tint`}>
          <IconDownload size={16} aria-hidden /> {t.export}
        </a>
        {!list.isDefault && (
          <button
            type="button"
            className={`${btn} text-red-600`}
            disabled={pending}
            onClick={() => {
              if (!confirm(t.confirmDelete)) return;
              setError(null);
              start(async () => {
                try {
                  await deleteList(list.id);
                  router.push(`/${lang}/lists`);
                  router.refresh();
                } catch {
                  setError(t.error);
                }
              });
            }}
          >
            <IconTrash size={16} aria-hidden /> {t.delete}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {editing && (
        <div className="mt-3">
          <ListForm
            initial={{ name: list.name, color: list.color, icon: list.icon }}
            t={t}
            fixedIdentity={list.isDefault}
            onCancel={() => setEditing(false)}
            onSubmit={async (v) => {
              await updateList(list.id, v);
              setEditing(false);
              router.refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}
