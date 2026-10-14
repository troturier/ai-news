import "server-only";
import { createElement } from "react";
import { getIcon } from "@/lib/icons";

/** Server component: never import it from a client component (it bundles the whole catalog). */
export function ThemeIcon({ name, size = 20 }: { name: string; size?: number }) {
  const icon = getIcon(name);
  return icon ? createElement(icon, { size, stroke: 1.75 }) : null;
}
