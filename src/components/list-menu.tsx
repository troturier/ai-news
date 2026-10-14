"use client";

import { IconBookmark, IconSettings } from "@tabler/icons-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toggleInList } from "@/app/[lang]/interaction-actions";

export type ListChoice = { id: string; name: string; color: string; icon: React.ReactNode };

/** "Reading lists" menu: checks / unchecks the article in each of the user's lists. */
export function ListMenu({
  articleId,
  lists,
  initialListIds,
  label,
  emptyLabel,
  compact = false,
  fullWidth = false,
  manage,
}: {
  articleId: string;
  lists: ListChoice[];
  initialListIds: string[];
  label: string;
  emptyLabel: string;
  compact?: boolean;
  fullWidth?: boolean; // fills its cell (button grid)
  manage?: { href: string; label: string }; // link to the lists page
}) {
  const [inLists, setInLists] = useState(new Set(initialListIds));
  const [error, setError] = useState(false);
  const [, start] = useTransition();
  const box = useRef<HTMLDetailsElement>(null);

  // Closes the menu on outside click or on Escape.
  useEffect(() => {
    const close = (e: Event) => {
      const el = box.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  function toggle(id: string) {
    const on = !inLists.has(id);
    const prev = new Set(inLists);
    setError(false);
    setInLists((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    start(async () => {
      try {
        await toggleInList(id, articleId, on);
      } catch {
        setInLists(prev);
        setError(true);
      }
    });
  }

  const active = inLists.size > 0;
  return (
    <details ref={box} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <summary
        className={`hover-tint ${fullWidth ? "flex w-full justify-center" : "inline-flex"} cursor-pointer list-none items-center gap-1.5 rounded-md border border-black/15 text-sm dark:border-white/20 ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-1.5"
        } ${active ? "bg-foreground text-background" : ""}`}
      >
        <IconBookmark size={compact ? 14 : 16} /> {label}
      </summary>
      <ul className="absolute z-10 mt-1 min-w-56 rounded-md border border-black/15 bg-background p-2 shadow-lg dark:border-white/20">
        {lists.length === 0 && <li className="px-2 py-1 text-sm opacity-70">{emptyLabel}</li>}
        {lists.map((l) => (
          <li key={l.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              <input type="checkbox" checked={inLists.has(l.id)} onChange={() => toggle(l.id)} />
              <span style={{ color: l.color }}>{l.icon}</span>
              <span className="truncate">{l.name}</span>
            </label>
          </li>
        ))}
        {error && <li role="alert" className="px-2 py-1 text-xs text-red-600">!</li>}
        {manage && (
          <li className="mt-1 border-t border-black/10 pt-1 dark:border-white/15">
            <a href={manage.href} className="hover-tint flex items-center gap-2 rounded px-2 py-1.5 text-sm">
              <IconSettings size={16} aria-hidden /> {manage.label}
            </a>
          </li>
        )}
      </ul>
    </details>
  );
}
