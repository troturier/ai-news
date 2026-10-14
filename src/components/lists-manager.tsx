"use client";

import { IconArrowDown, IconArrowUp, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createList, deleteList, reorderLists, updateList } from "@/app/[lang]/interaction-actions";
import { ListForm, type ListFormTexts } from "@/components/list-form";

export type ListRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  count: number;
  unread: number;
  iconNode: React.ReactNode; // rendered server side
};

type T = ListFormTexts & {
  newList: string; edit: string; delete: string; confirmDelete: string;
  defaultList: string; articles: string; open: string;
  unread: string; allRead: string; emptyList: string; none: string;
  moveUp: string; moveDown: string;
};

type Draft = { id: string | null; name: string; color: string; icon: string };

/** Overview of the lists: cards tinted with the list color, creation, editing, deletion. */
export function ListsManager({ lists: serverLists, lang, t }: { lists: ListRow[]; lang: string; t: T }) {
  const [lists, setLists] = useOptimistic(serverLists);
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setError(null);
    start(async () => {
      try {
        await deleteList(id);
        router.refresh();
      } catch {
        setError(t.error);
      }
    });
  }

  // The default list stays on top: only the others move, among themselves.
  function move(id: string, delta: -1 | 1) {
    const custom = lists.filter((l) => !l.isDefault);
    const from = custom.findIndex((l) => l.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= custom.length) return;
    const next = [...custom];
    [next[from], next[to]] = [next[to], next[from]];
    setError(null);
    start(async () => {
      setLists([...lists.filter((l) => l.isDefault), ...next]);
      try {
        await reorderLists(next.map((l) => l.id));
        router.refresh();
      } catch {
        setError(t.error);
      }
    });
  }

  const customIds = lists.filter((l) => !l.isDefault).map((l) => l.id);
  const small = "inline-flex items-center gap-1.5 rounded-md border border-black/15 px-2.5 py-1 text-xs dark:border-white/20";

  return (
    <div>
      {lists.length === 0 && <p className="mb-4 opacity-70">{t.none}</p>}
      <ul className="grid gap-3">
        {lists.map((l) => (
          <li
            key={l.id}
            className="flex flex-col rounded-lg border border-l-4 p-4"
            style={{ borderColor: `${l.color}66`, borderLeftColor: l.color, background: `${l.color}14` }}
          >
            <Link href={`/${lang}/lists/${l.id}`} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" style={{ color: l.color, background: `${l.color}26` }}>
                {l.iconNode}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold leading-tight hover:underline">{l.name}</span>
                <span className="block text-sm opacity-80">
                  {l.count} {t.articles}
                  {l.count > 0 && <> · {l.unread > 0 ? `${l.unread} ${t.unread}` : t.allRead}</>}
                  {l.isDefault && ` · ${t.defaultList}`}
                </span>
              </span>
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/${lang}/lists/${l.id}`} className={`${small} hover-tint`}>{t.open}</Link>
              <button type="button" className={small} onClick={() => setDraft({ id: l.id, name: l.name, color: l.color, icon: l.icon })}>
                <IconPencil size={14} aria-hidden /> {t.edit}
              </button>
              {!l.isDefault && customIds.length > 1 && (
                <span className="inline-flex gap-1">
                  <button type="button" className={small} disabled={pending || customIds[0] === l.id} aria-label={`${t.moveUp} : ${l.name}`} title={t.moveUp} onClick={() => move(l.id, -1)}>
                    <IconArrowUp size={14} aria-hidden />
                  </button>
                  <button type="button" className={small} disabled={pending || customIds[customIds.length - 1] === l.id} aria-label={`${t.moveDown} : ${l.name}`} title={t.moveDown} onClick={() => move(l.id, 1)}>
                    <IconArrowDown size={14} aria-hidden />
                  </button>
                </span>
              )}
              {!l.isDefault && (
                <button type="button" className={`${small} text-red-600`} disabled={pending} onClick={() => remove(l.id)}>
                  <IconTrash size={14} aria-hidden /> {t.delete}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="mt-4">
          <ListForm
            key={draft.id ?? "new"}
            initial={{ name: draft.name, color: draft.color, icon: draft.icon }}
            t={t}
            fixedIdentity={lists.find((l) => l.id === draft.id)?.isDefault}
            onCancel={() => setDraft(null)}
            onSubmit={async (v) => {
              if (draft.id) await updateList(draft.id, v);
              else await createList(v);
              setDraft(null);
              router.refresh();
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-black/20 px-4 py-1.5 text-sm dark:border-white/25"
          onClick={() => setDraft({ id: null, name: "", color: "#6366f1", icon: "bookmark" })}
        >
          <IconPlus size={16} aria-hidden /> {t.newList}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
