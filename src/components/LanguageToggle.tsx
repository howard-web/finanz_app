"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE, localizePath, stripLocale, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/** Merkt die Sprache für Aufrufe ohne Präfix (wird vom Proxy gelesen). */
function rememberLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

/** Umschalter DE/EN: gleiche Seite in der anderen Sprache, Wahl wird im Cookie gemerkt. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === lang) return;
    rememberLocale(next);
    const query = searchParams.toString();
    const target = localizePath(next, stripLocale(pathname)) + (query ? `?${query}` : "");
    // Bewusst ein vollständiger Seitenaufruf: Das Wurzel-Layout (<html lang>, Theme-Skript)
    // wird so frisch vom Server geliefert statt im Browser neu gerendert.
    startTransition(() => window.location.assign(target));
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.language.label}
      className={`inline-flex rounded-xl border border-line bg-surface-2 p-0.5 ${pending ? "opacity-60" : ""} ${className}`}
    >
      {LOCALES.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l}
            title={t.language[l]}
            onClick={() => switchTo(l)}
            className={`rounded-[0.6rem] px-2 py-1 text-xs font-semibold tracking-wide uppercase transition-colors ${
              active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
