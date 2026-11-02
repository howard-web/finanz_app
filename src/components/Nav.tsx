"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartLine,
  FileUp,
  HandCoins,
  LayoutDashboard,
  Repeat,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { stripLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";

const LINKS: { href: string; key: Exclude<keyof Dictionary["nav"], "label">; icon: LucideIcon }[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/transactions", key: "cashflow", icon: ArrowLeftRight },
  { href: "/recurring", key: "recurring", icon: Repeat },
  { href: "/portfolio", key: "portfolio", icon: ChartLine },
  { href: "/dividends", key: "dividends", icon: HandCoins },
  { href: "/import", key: "import", icon: FileUp },
  { href: "/settings", key: "settings", icon: Settings },
];

export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

/** Ohne `pathname` (Fallback beim Prerendern) wird kein Link hervorgehoben. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  const { t, href: localize } = useI18n();
  const current = pathname === null ? null : stripLocale(pathname);
  return (
    <nav aria-label={t.nav.label} className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {LINKS.map(({ href, key, icon: Icon }) => {
        const active = current !== null && (href === "/" ? current === "/" : current.startsWith(href));
        return (
          <Link
            key={href}
            href={localize(href)}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon
              aria-hidden
              className={`size-[1.1em] shrink-0 ${active ? "text-accent-ink" : "text-ink-4 group-hover:text-ink-2"}`}
              strokeWidth={2}
            />
            {t.nav[key]}
          </Link>
        );
      })}
    </nav>
  );
}
