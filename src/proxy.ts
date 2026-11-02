import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, hasLocale, type Locale } from "@/i18n/config";

/** Sprache für Aufrufe ohne Präfix: zuletzt gewählte (Cookie), sonst Browser-Sprache. */
function pickLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && hasLocale(cookie)) return cookie;
  const accept = request.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (hasLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Nicht für interne Pfade und Dateien (z.B. /_next, /favicon.ico, Screenshots)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
