"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getFormatters } from "@/lib/format";
import { localizePath, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

const LocaleContext = createContext<Locale>("de");

export function I18nProvider({ lang, children }: { lang: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>;
}

/** Sprache, Texte und Formatierer für Client-Komponenten. */
export function useI18n() {
  const lang = useContext(LocaleContext);
  return {
    lang,
    t: dictionaries[lang],
    fmt: getFormatters(lang),
    href: (path: string) => localizePath(lang, path),
  };
}
