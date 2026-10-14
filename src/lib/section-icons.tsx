import {
  IconAlertTriangle,
  IconBook2,
  IconBulb,
  IconChartBar,
  IconChecklist,
  IconCpu,
  IconFileText,
  IconNews,
  IconTag,
  IconTelescope,
  IconUsers,
} from "@tabler/icons-react";
import { createElement, type ComponentType } from "react";

type Icon = ComponentType<{ size?: number; stroke?: number; "aria-hidden"?: boolean }>;

/**
 * Subheadings recur from one article to the next (what happened, why it matters, points of
 * caution…): we associate an icon with them based on keywords, in French and English. First pattern that
 * matches; neutral icon otherwise. Text is compared without accents or case.
 */
const RULES: [RegExp, Icon][] = [
  [/vigilance|caution|limit|risque|risk|attention|reserve|critique|concern|warning|bemol|drawback|downside/, IconAlertTriangle],
  [/pourquoi|why|matters|importan|enjeu|impact|portee|significan|signification|implication/, IconBulb],
  [/contexte|context|background|historique|rappel/, IconBook2],
  [/prix|tarif|pricing|price|cout|cost|disponibilit|availability|acces|access|offre/, IconTag],
  [/benchmark|performance|resultat|result|chiffre|figure|mesure|metric/, IconChartBar],
  [/detail|technique|technical|fonctionn|works|architecture|capacit|capabilit|fonctionnalit|feature|how /, IconCpu],
  [/reaction|marche|market|concurren|compet|industr|secteur|communaute|community|avis|opinion|analyst/, IconUsers],
  [/suite|next|prochain|a suivre|outlook|perspective|futur|future|calendrier|timeline|roadmap|et ensuite/, IconTelescope],
  [/conclusion|bilan|summary|resume|retenir|takeaway|en bref|tl;dr/, IconChecklist],
  [/annonc|announc|happen|passe|nouveaut|new|lancement|launch|release|sortie|ce qui|what/, IconNews],
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

export function SectionIcon({ text, size = 22 }: { text: string; size?: number }) {
  const t = normalize(text);
  const icon = RULES.find(([re]) => re.test(t))?.[1] ?? IconFileText;
  return createElement(icon, { size, stroke: 1.75, "aria-hidden": true });
}
