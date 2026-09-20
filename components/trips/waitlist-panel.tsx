import { getTranslations } from 'next-intl/server';

export interface WaitlistRowData {
  id: string;
  displayName: string | null;
}

// Host-team-only roster — RLS already restricted the query that feeds
// this to rows the host team (or an admin) is allowed to see, so there's
// no eligibility check to do here, same reasoning as
// TourExclusiveContent. Read-only for now: promotion off the waitlist
// still only happens automatically via leave_trip() freeing a seat, no
// manual "promote" action yet.
export async function WaitlistPanel({ rows }: { rows: WaitlistRowData[] }) {
  const t = await getTranslations('trips');

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('waitlistTitle', { count: rows.length })}
      </h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {index + 1}
            </span>
            {row.displayName ?? t('waitlistUnnamed')}
          </li>
        ))}
      </ul>
    </div>
  );
}
