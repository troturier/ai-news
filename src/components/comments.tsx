"use client";

import { useState, useTransition } from "react";
import { addComment, deleteComment, reportContent } from "@/app/[lang]/interaction-actions";

type T = {
  placeholder: string; send: string; delete: string; report: string;
  rateLimited: string; error: string; reportPrompt: string; reported: string;
};

export function CommentForm({ articleId, t }: { articleId: string; t: T }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          try {
            await addComment(articleId, body);
            setBody("");
          } catch (err) {
            setError((err as Error).message.includes("rate_limited") ? t.rateLimited : t.error);
          }
        });
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        required
        rows={3}
        placeholder={t.placeholder}
        className="w-full rounded-md border border-black/20 bg-transparent px-3 py-2 dark:border-white/25"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending || !body.trim()} className="rounded-md bg-foreground px-4 py-1.5 text-background disabled:opacity-50">
        {t.send}
      </button>
    </form>
  );
}

export function CommentActions({ commentId, canDelete, t }: { commentId: string; canDelete: boolean; t: T }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex items-center gap-3 text-xs opacity-70">
      {canDelete && (
        <button type="button" disabled={pending} className="btn-plain underline" onClick={() => start(async () => { try { await deleteComment(commentId); } catch { setMsg(t.error); } })}>
          {t.delete}
        </button>
      )}
      {!canDelete && (
        <button
          type="button"
          className="btn-plain underline"
          onClick={() => {
            const reason = prompt(t.reportPrompt);
            if (!reason) return;
            start(async () => { try { await reportContent("comment", commentId, reason); setMsg(t.reported); } catch { setMsg(t.error); } });
          }}
        >
          {t.report}
        </button>
      )}
      {msg && <span role="status">{msg}</span>}
    </span>
  );
}
