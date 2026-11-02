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

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Cashflow", icon: ArrowLeftRight },
  { href: "/recurring", label: "Abos & Daueraufträge", icon: Repeat },
  { href: "/portfolio", label: "Portfolio", icon: ChartLine },
  { href: "/dividends", label: "Dividenden", icon: HandCoins },
  { href: "/import", label: "CSV-Import", icon: FileUp },
  { href: "/settings", label: "Einstellungen", icon: Settings },
];

export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

/** Ohne `pathname` (Fallback beim Prerendern) wird kein Link hervorgehoben. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
