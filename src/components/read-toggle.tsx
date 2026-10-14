"use client";

import { IconCircleCheck, IconCircleFilled } from "@tabler/icons-react";
import { useOptimistic, useTransition } from "react";
import { markRead } from "@/app/[lang]/interaction-actions";

/** "Read" / "Unread" badge that is also the button to toggle the state. */
export function ReadToggle({
  articleId,
  initialRead,
  t,
  size = "sm",
  block = false,
}: {
  articleId: string;
  initialRead: boolean;
  size?: "sm" | "md";
  block?: boolean; // fills its cell (button grid)
  t: { read: string; unread: string; markRead: string; markUnread: string };
}) {
  const [read, setRead] = useOptimistic(initialRead);
  const [pending, start] = useTransition();
  const next = !read;
  const hint = read ? t.markUnread : t.markRead;

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={read}
      aria-label={hint}
      title={hint}
      onClick={() =>
        start(async () => {
          setRead(next); // immediate display, automatically reverted if the action fails
          await markRead(articleId, next);
        })
      }
      className={`${block ? "flex w-full justify-center" : "inline-flex"} items-center gap-1.5 rounded-md border disabled:opacity-60 ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"
      } ${
        read
          ? "border-black/15 dark:border-white/20"
          : "border-foreground bg-foreground font-medium text-background"
      }`}
    >
      {read ? <IconCircleCheck size={size === "md" ? 16 : 14} /> : <IconCircleFilled size={size === "md" ? 12 : 10} />}
      {read ? t.read : t.unread}
    </button>
  );
}
