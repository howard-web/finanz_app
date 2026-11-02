import type { Dictionary } from "./dictionaries/de";

/** Ersetzt Platzhalter wie {name} in einem Text. */
export function tf(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/**
 * Meldung aus einer Server Action: Schlüssel in `t.msg` plus optionale Werte.
 * Actions kennen die Sprache nicht (next/root-params gibt es dort nicht),
 * daher übersetzt der Browser.
 */
export type Msg = { key: string; params?: Record<string, string | number> };

export function translateMsg(t: Dictionary, msg: Msg | string | undefined): string {
  if (!msg) return "";
  const m = typeof msg === "string" ? { key: msg } : msg;
  const template = (t.msg as Record<string, string>)[m.key] ?? t.msg.invalid;
  return tf(template, m.params);
}

/** Anzeigename einer gespeicherten Kategorie (gespeichert wird immer der deutsche Schlüssel). */
export function categoryLabel(t: Dictionary, category: string): string {
  return (t.categories as Record<string, string>)[category] ?? category;
}
