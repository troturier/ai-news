"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";

type Mode = "light" | "dark";

const stored = (): Mode | null => {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
};

// Actual page state: attribute set on <html>, otherwise system preference.
const read = (): Mode => {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * Next.js rewrites the attributes of <html> when the language changes (navigation between
 * /fr and /en) and clears `data-theme`. We observe the attribute: if it disappears while a choice is
 * stored, we reapply it; the button updates in all cases.
 */
function subscribe(onChange: () => void) {
  const html = document.documentElement;
  const observer = new MutationObserver(() => {
    const saved = stored();
    if (saved && html.getAttribute("data-theme") !== saved) html.setAttribute("data-theme", saved);
    onChange();
  });
  observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  // Case where the attribute already disappeared before subscribing.
  const saved = stored();
  if (saved && html.getAttribute("data-theme") !== saved) html.setAttribute("data-theme", saved);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/**
 * Theme switch: light and dark are both visible. The highlight of the active option is handled by
 * CSS based on the page's `data-theme` attribute (see globals.css): it is correct from the first render.
 * React state is only used for `aria-pressed`.
 */
export function ThemeToggle({
  label,
  lightLabel,
  darkLabel,
}: {
  label: string;
  lightLabel: string;
  darkLabel: string;
}) {
  const mode = useSyncExternalStore(subscribe, read, () => "light" as Mode);
  const choose = (m: Mode) => {
    document.documentElement.setAttribute("data-theme", m);
    try {
      localStorage.setItem("theme", m);
    } catch {}
  };
  const base = "flex items-center px-1.5 py-1.5 hover-tint sm:px-2";

  return (
    <div role="group" aria-label={label} className="flex items-stretch overflow-hidden rounded-md border border-black/15 dark:border-white/20">
      <button type="button" data-theme-option="light" aria-pressed={mode === "light"} aria-label={lightLabel} title={lightLabel} onClick={() => choose("light")} className={base}>
        <IconSun size={16} aria-hidden />
      </button>
      <button type="button" data-theme-option="dark" aria-pressed={mode === "dark"} aria-label={darkLabel} title={darkLabel} onClick={() => choose("dark")} className={`${base} border-l border-black/15 dark:border-white/20`}>
        <IconMoon size={16} aria-hidden />
      </button>
    </div>
  );
}
