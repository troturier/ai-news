"use client";

import { IconListDetails } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode; // rendered server side
  level?: 0 | 1; // 1 = article part (slightly indented)
  count?: number;
};

/**
 * Article table of contents tracking the displayed section. The same component serves the side panel
 * (large screen) and the collapsible list (mobile).
 */
export function ArticleNav({
  items,
  title,
  onNavigate,
  hideTitle = false,
}: {
  items: NavItem[];
  title: string;
  onNavigate?: () => void;
  hideTitle?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!targets.length) return;
    // Active section = the last one whose top has passed the upper third of the screen.
    const update = () => {
      const line = window.innerHeight * 0.33;
      let current: string | null = targets[0].id;
      for (const el of targets) if (el.getBoundingClientRect().top <= line) current = el.id;
      // At the very bottom, the page can no longer scroll: the last item would never cross the line.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = targets[targets.length - 1].id;
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  return (
    <nav aria-label={title}>
      {!hideTitle && <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">{title}</p>}
      <ul className="space-y-0.5 border-l border-black/10 dark:border-white/15">
        {items.map((i) => {
          const on = active === i.id;
          return (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                onClick={() => {
                  setActive(i.id); // immediate reaction, the scroll position takes over afterwards
                  onNavigate?.();
                }}
                aria-current={on ? "location" : undefined}
                className={`-ml-px flex items-start gap-2 border-l-2 py-1 pr-1 text-sm leading-snug transition-colors ${
                  i.level === 1 ? "pl-5" : "pl-3"
                } ${
                  on
                    ? "border-foreground font-semibold"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <span className="mt-0.5 shrink-0">{i.icon}</span>
                <span className="min-w-0">
                  {i.label}
                  {typeof i.count === "number" && <span className="ml-1 opacity-60">({i.count})</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Collapsible table of contents for small screens: closes after a section is chosen. */
export function MobileNav({ items, title, label }: { items: NavItem[]; title: string; label: string }) {
  const box = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={box} className="mb-6 rounded-lg border border-black/10 p-3 lg:hidden dark:border-white/15">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <IconListDetails size={16} aria-hidden /> {label}
      </summary>
      <div className="mt-3">
        <ArticleNav items={items} title={title} hideTitle onNavigate={() => box.current?.removeAttribute("open")} />
      </div>
    </details>
  );
}
