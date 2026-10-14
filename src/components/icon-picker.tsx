"use client";

import { useEffect, useState } from "react";

type Found = { name: string; svg: string };

export const PALETTE = [
  "#6366f1", "#2563eb", "#0891b2", "#16a34a", "#ca8a04", "#ea580c",
  "#dc2626", "#db2777", "#7c3aed", "#475569",
];

/** Search in the Tabler catalog (server side, ~5,000 icons). */
export function IconPicker({
  value,
  color,
  onChange,
  placeholder,
  resultsLabel,
}: {
  value: string;
  color: string;
  onChange: (name: string) => void;
  placeholder: string;
  resultsLabel: string;
}) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ total: number; icons: Found[] }>({ total: 0, icons: [] });

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/icons?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setFound(d))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="mb-2 w-full rounded-md border border-black/20 bg-transparent px-3 py-1.5 text-sm dark:border-white/25"
      />
      {q && <p className="mb-1 text-xs opacity-60">{found.total} {resultsLabel}</p>}
      <div className="grid max-h-44 grid-cols-7 gap-1 overflow-y-auto sm:grid-cols-10" role="listbox">
        {found.icons.map((i) => (
          <button
            key={i.name}
            type="button"
            role="option"
            aria-selected={i.name === value}
            title={i.name}
            onClick={() => onChange(i.name)}
            className="flex h-9 items-center justify-center rounded-md border"
            style={{
              color,
              borderColor: i.name === value ? color : "transparent",
              background: i.name === value ? `${color}22` : undefined,
            }}
            // SVG generated server side from the icon package (never from user input).
            dangerouslySetInnerHTML={{ __html: i.svg }}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          className="h-7 w-7 rounded-full border-2"
          style={{ background: c, borderColor: c === value ? "currentColor" : "transparent" }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Couleur personnalisée"
        className="h-7 w-9 cursor-pointer rounded border border-black/20 bg-transparent dark:border-white/25"
      />
    </div>
  );
}
