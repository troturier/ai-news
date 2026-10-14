export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const hasLocale = (v: string): v is Locale =>
  (locales as readonly string[]).includes(v);
