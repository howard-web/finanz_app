export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
/** Cookie mit der zuletzt gewählten Sprache (für die Weiterleitung von "/"). */
export const LOCALE_COOKIE = "lang";

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** "/transactions" -> "/en/transactions", "/" -> "/en" */
export function localizePath(lang: Locale, path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** "/en/transactions" -> "/transactions" */
export function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(de|en)(?=\/|$)/);
  if (!m) return pathname;
  return pathname.slice(m[0].length) || "/";
}
