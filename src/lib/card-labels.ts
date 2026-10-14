import type { Dictionary } from "@/i18n/dictionaries";
import type { CardLabels } from "@/components/article-card";

/** Labels of an article card, built from the dictionary. */
export const cardLabels = (t: Dictionary): CardLabels => ({ minRead: t.home.minRead, ...t.card });
