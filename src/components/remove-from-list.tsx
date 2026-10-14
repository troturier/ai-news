"use client";

import { IconBookmarkOff } from "@tabler/icons-react";
import { useTransition } from "react";
import { toggleInList } from "@/app/[lang]/interaction-actions";

export function RemoveFromList({ listId, articleId, label }: { listId: string; articleId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-black/15 px-2.5 py-1 text-xs disabled:opacity-50 dark:border-white/20"
      onClick={() => start(async () => { await toggleInList(listId, articleId, false); })}
    >
      <IconBookmarkOff size={14} aria-hidden /> {label}
    </button>
  );
}
