import { getTranslations } from 'next-intl/server';
import { Warning } from '@phosphor-icons/react/dist/ssr';
import {
  advisoryIcon,
  SEVERITY_TEXT,
  type AdvisorySeverity,
  type TripAdvisory,
} from '@/lib/constants/advisories';
import { cn } from '@/lib/utils';

const ORDER: AdvisorySeverity[] = ['danger', 'caution', 'info'];

/**
 * "Before you go" — the host's declared advisories.
 *
 * Placed above the description on the trip page rather than below it:
 * a snake warning under 400 words of prose is a warning nobody read.
 *
 * WHY GROUPED RATHER THAN A FLAT LIST
 * The first version colored every row's label by severity and separated
 * rows with colored left edges. With five or six tags that reads as a
 * rainbow error log — three shades of urgent text competing, and nothing
 * anchoring them to the page. Here severity is expressed once per group,
 * in the group's own micro-label, and every entry label sits in plain
 * ink. Color then means something: the only red on the surface is the
 * heading of the group that can actually hurt you, plus its icons.
 *
 * The whole thing sits in one sunken well so it reads as a single
 * bounded notice rather than loose rows bleeding into the description.
 */
export async function AdvisoryBlock({ advisories }: { advisories: TripAdvisory[] }) {
  if (advisories.length === 0) return null;

  const t = await getTranslations('advisories');

  const groups = ORDER.map((severity) => ({
    severity,
    items: advisories.filter((a) => a.severity === severity),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="overflow-hidden rounded-md border border-sand-200 bg-[color:var(--sunken)] dark:border-sand-800">
      <h2 className="micro-label flex items-center gap-2 border-b border-sand-200 px-4 py-3 dark:border-sand-800">
        <Warning size={14} weight="fill" className="text-dawn-600 dark:text-dawn-400" />
        {t('blockTitle')}
      </h2>

      <div className="divide-y divide-sand-200 dark:divide-sand-800">
        {groups.map(({ severity, items }) => (
          <div key={severity} className="px-4 py-3.5">
            <p className={cn('micro-label mb-2.5', SEVERITY_TEXT[severity])}>
              {t(`severity_${severity}` as never)}
            </p>

            <ul className="flex flex-col gap-2.5">
              {items.map((advisory) => {
                const AdvisoryIcon = advisoryIcon(advisory.icon);
                return (
                  <li key={advisory.code} className="flex gap-2.5">
                    <AdvisoryIcon
                      size={16}
                      weight="fill"
                      className={cn('mt-0.5 shrink-0', SEVERITY_TEXT[advisory.severity])}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-sand-900 dark:text-sand-100">
                        {advisory.label}
                      </p>
                      {advisory.note && (
                        <p className="mt-0.5 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
                          {advisory.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The compact form for a feed card: `danger` advisories only, as bare
 * icons with an accessible name.
 *
 * Info and caution tags are deliberately excluded here. A card showing
 * "national park", "bring repellent" and "venomous wildlife" as equal
 * chips buries the only one that changes whether you should go.
 */
export function AdvisoryIcons({
  advisories,
  label,
}: {
  advisories: Pick<TripAdvisory, 'code' | 'label' | 'icon' | 'severity'>[];
  /** Accessible group label, passed in because cards render in both locales. */
  label: string;
}) {
  const dangers = advisories.filter((a) => a.severity === 'danger');
  if (dangers.length === 0) return null;

  return (
    <span className="flex items-center gap-1.5" role="group" aria-label={label}>
      {dangers.map((advisory) => {
        const AdvisoryIcon = advisoryIcon(advisory.icon);
        return (
          <AdvisoryIcon
            key={advisory.code}
            size={14}
            weight="fill"
            className="shrink-0 text-red-700 dark:text-red-400"
            aria-label={advisory.label}
          />
        );
      })}
    </span>
  );
}
