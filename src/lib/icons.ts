import "server-only";
import * as Tabler from "@tabler/icons-react";
import type { ComponentType } from "react";

type IconCmp = ComponentType<{ size?: number; stroke?: number; className?: string }>;

/** "IconChartDots3" -> "chart-dots-3" */
const toKebab = (key: string) =>
  key
    .slice(4)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();

// Catalog: "outline" icons only (the *Filled variants are excluded).
const catalog = new Map<string, IconCmp>(
  Object.entries(Tabler as unknown as Record<string, unknown>)
    .filter(
      ([k, v]) =>
        /^Icon[A-Z0-9]/.test(k) && !k.endsWith("Filled") && (typeof v === "function" || typeof v === "object"),
    )
    .map(([k, v]) => [toKebab(k), v as IconCmp]),
);

export const iconNames = [...catalog.keys()].sort();
export const isValidIcon = (name: string) => catalog.has(name);
export const getIcon = (name: string) => catalog.get(name);

/* --------------------- SVG serialization (icon picker) --------------------- */
// Tabler components are forwardRefs: `render` returns the <svg> element. We
// serialize it by hand (Next forbids react-dom/server in routes).

type El = { type?: unknown; props?: Record<string, unknown> } | string | number | boolean | null | undefined | El[];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const attrName = (k: string) =>
  k === "className" ? "class" : k === "viewBox" ? "viewBox" : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

function serialize(node: El): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return esc(String(node));
  if (Array.isArray(node)) return node.map(serialize).join("");
  if (typeof node.type !== "string") return "";
  const { children, ...attrs } = node.props ?? {};
  const a = Object.entries(attrs)
    .filter(([k, v]) => v != null && k !== "ref" && k !== "key")
    .map(([k, v]) => ` ${attrName(k)}="${esc(String(v))}"`)
    .join("");
  return `<${node.type}${a}>${serialize(children as El)}</${node.type}>`;
}

export function iconSvg(name: string, size = 22): string | null {
  const cmp = catalog.get(name) as unknown as { render?: (p: object, r: null) => El } | undefined;
  if (typeof cmp?.render !== "function") return null;
  return serialize(cmp.render({ size, stroke: 1.75 }, null));
}
