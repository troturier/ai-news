import type { Locale } from "@/i18n/config";

/** The default list is stored under a neutral name: its displayed name depends on the interface language. */
const DEFAULT_LIST_NAMES: Record<Locale, string> = { fr: "À lire plus tard", en: "Read later" };

export const localizeList = <T extends { name: string; isDefault: boolean }>(list: T, lang: Locale): T =>
  list.isDefault ? { ...list, name: DEFAULT_LIST_NAMES[lang] } : list;
