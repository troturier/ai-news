"use client";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTransition } from "react";
import { setHideRead } from "@/app/[lang]/interaction-actions";

export function HideReadToggle({ hidden, hideLabel, showLabel }: { hidden: boolean; hideLabel: string; showLabel: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={hidden}
      onClick={() => start(async () => { await setHideRead(!hidden); })}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 ${
        hidden ? "border-foreground bg-foreground text-background" : "border-black/15 dark:border-white/20"
      }`}
    >
      {hidden ? <IconEye size={16} /> : <IconEyeOff size={16} />}
      {hidden ? showLabel : hideLabel}
    </button>
  );
}
