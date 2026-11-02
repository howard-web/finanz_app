import Link from "next/link";
import { currentMonth, shiftMonth } from "@/lib/dates";
import { getI18n } from "@/i18n/server";

/** Monatsauswahl; `basePath` ohne Sprachpräfix, z.B. "/transactions". */
export async function MonthFilter({ month, basePath }: { month: string; basePath: string }) {
  const { t, fmt, href } = await getI18n();
  const base = href(basePath);
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-1">
      <Link href={`${base}?month=${shiftMonth(month, -1)}`} className="btn-secondary px-3" aria-label={t.common.prevMonth}>
        ←
      </Link>
      <span className="min-w-36 text-center text-sm font-medium">{fmt.month(month)}</span>
      <Link href={`${base}?month=${shiftMonth(month, 1)}`} className="btn-secondary px-3" aria-label={t.common.nextMonth}>
        →
      </Link>
      {!isCurrent && (
        <Link href={base} className="btn-ghost ml-1">
          {t.common.today}
        </Link>
      )}
    </div>
  );
}
