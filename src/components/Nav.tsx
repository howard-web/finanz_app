"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Cashflow" },
  { href: "/recurring", label: "Abos & Daueraufträge" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/import", label: "CSV-Import" },
] as const;

export function Nav() {
  return <NavLinks pathname={usePathname()} />;
}

/** Ohne `pathname` (Fallback beim Prerendern) wird kein Link hervorgehoben. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
              active ? "bg-blue-50 text-blue-700" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
