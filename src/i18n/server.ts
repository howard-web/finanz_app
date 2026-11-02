import "server-only";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { getFormatters } from "@/lib/format";
import { hasLocale, localizePath, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

/** Sprache, Texte und Formatierer für Server-Komponenten (liest das [lang]-Segment). */
export async function getI18n() {
  const l = await lang();
  if (!hasLocale(l)) notFound();
  return i18nFor(l);
}

export function i18nFor(l: Locale) {
  return {
    lang: l,
    t: dictionaries[l],
    fmt: getFormatters(l),
    /** Pfad mit Sprachpräfix */
    href: (path: string) => localizePath(l, path),
  };
}
