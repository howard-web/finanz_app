import Link from "next/link";
import { currentMonth, formatMonth, shiftMonth } from "@/lib/dates";

export function MonthFilter({ month, basePath }: { month: string; basePath: string }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-1">
      <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} className="btn-secondary px-3" aria-label="Vorheriger Monat">
        ←
      </Link>
      <span className="min-w-36 text-center text-sm font-medium">{formatMonth(month)}</span>
      <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} className="btn-secondary px-3" aria-label="Nächster Monat">
        →
      </Link>
      {!isCurrent && (
        <Link href={basePath} className="btn-ghost ml-1">
          Heute
        </Link>
      )}
    </div>
  );
}
