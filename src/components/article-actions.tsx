"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconDownload, IconFlag, IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { markRead, reportContent, setReaction } from "@/app/[lang]/interaction-actions";
import { ReadToggle } from "@/components/read-toggle";
import { ListMenu, type ListChoice } from "@/components/list-menu";

export type { ListChoice };

type T = {
  interesting: string; notInteresting: string;
  addToList: string; noLists: string; reportArticle: string; reportPrompt: string; reported: string; error: string;
};

export function ArticleActions({
  articleId, initial, lists, totals, t, readT, exportHref, exportLabel, manageLists,
}: {
  articleId: string;
  initial: { read: boolean; reaction: -1 | 0 | 1; listIds: string[] };
  lists: ListChoice[];
  totals: { up: number; down: number };
  t: T;
  readT: { read: string; unread: string; markRead: string; markUnread: string };
  exportHref: string;
  exportLabel: string;
  manageLists: { href: string; label: string };
}) {
  const [reaction, setReact] = useState(initial.reaction);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const marked = useRef(false);

  // Viewing the article marks it as read (once per display).
  useEffect(() => {
    if (initial.read || marked.current) return;
    marked.current = true;
    markRead(articleId, true).catch(() => {}); // the "Read" state comes back from the server (revalidation)
  }, [articleId, initial.read]);

  const run = (fn: () => Promise<void>, rollback: () => void) =>
    start(async () => {
      setMsg(null);
      try {
        await fn();
      } catch {
        rollback();
        setMsg(t.error);
      }
    });

  function react(value: 1 | -1) {
    const prev = reaction;
    const next = prev === value ? 0 : value;
    setReact(next);
    run(() => setReaction(articleId, next), () => setReact(prev));
  }

  function report() {
    const reason = prompt(t.reportPrompt);
    if (!reason) return;
    run(async () => { await reportContent("article", articleId, reason); setMsg(t.reported); }, () => {});
  }

  // Buttons spread across the full width: 3 columns (2 on mobile), each button fills its cell.
  const btn = "hover-tint flex w-full items-center justify-center gap-1.5 rounded-md border border-black/15 px-2 py-1.5 text-sm sm:px-3 dark:border-white/20";
  const on = "bg-foreground text-background";

  return (
    <div className="my-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ReadToggle articleId={articleId} initialRead={initial.read} t={readT} size="md" block />
        <button type="button" onClick={() => react(1)} aria-pressed={reaction === 1} className={`${btn} ${reaction === 1 ? on : ""}`}>
          <IconThumbUp size={16} /> {t.interesting} · {totals.up + (reaction === 1 && initial.reaction !== 1 ? 1 : 0) - (initial.reaction === 1 && reaction !== 1 ? 1 : 0)}
        </button>
        <button type="button" onClick={() => react(-1)} aria-pressed={reaction === -1} className={`${btn} ${reaction === -1 ? on : ""}`}>
          <IconThumbDown size={16} /> {t.notInteresting} · {totals.down + (reaction === -1 && initial.reaction !== -1 ? 1 : 0) - (initial.reaction === -1 && reaction !== -1 ? 1 : 0)}
        </button>

        <ListMenu articleId={articleId} lists={lists} initialListIds={initial.listIds} label={t.addToList} emptyLabel={t.noLists} manage={manageLists} fullWidth />
        <a href={exportHref} download className={btn}>
          <IconDownload size={16} aria-hidden /> {exportLabel}
        </a>
        <button type="button" onClick={report} className={`${btn} opacity-70`}>
          <IconFlag size={16} /> {t.reportArticle}
        </button>
      </div>
      {(msg || pending) && <p role="status" className="mt-2 text-sm opacity-80">{msg ?? "…"}</p>}
    </div>
  );
}
