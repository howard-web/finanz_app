"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";

type Theme = "system" | "light" | "dark";
const KEY = "theme";
const EVENT = "themechange";

/** Inline-Skript für <head>: setzt die Klasse vor dem ersten Rendern (kein Aufblitzen). */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {}
  applyTheme(theme);
  window.dispatchEvent(new Event(EVENT));
}

const OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  // Bei "System" auf Wechsel des Betriebssystem-Modus reagieren
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <div role="radiogroup" aria-label={t.theme.label} className={`inline-flex rounded-xl border border-line bg-surface-2 p-0.5 ${className}`}>
      {OPTIONS.map(({ value, icon: Icon }) => {
        const label = t.theme[value];
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-1.5 rounded-[0.6rem] px-2 py-1 text-xs font-medium transition-colors ${
              active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
            }`}
          >
            <Icon aria-hidden className="size-[1.1em]" />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
