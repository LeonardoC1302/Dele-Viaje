import { getTranslations } from 'next-intl/server';
import { Prohibit } from '@phosphor-icons/react/dist/ssr';

/**
 * The cancellation notice, at the very top of a cancelled trip's
 * overview — above the advisories and the description.
 *
 * This is the one place in the system that gets a filled red field
 * rather than the restrained icon-and-hairline treatment advisories use.
 * The reasoning is the same in both cases: colour should be proportional
 * to consequence. An advisory changes how you prepare; a cancellation
 * means the trip is not happening, and someone who skims must not be
 * able to miss it.
 */
export async function CancelledNotice({ reason }: { reason: string | null }) {
  const t = await getTranslations('trips');

  return (
    <section className="rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold text-red-800 dark:text-red-300">
        <Prohibit size={16} weight="fill" className="shrink-0" />
        {t('cancelledTitle')}
      </h2>

      {reason && (
        <p className="mt-2 text-sm leading-relaxed text-red-900/90 dark:text-red-200/90">
          {reason}
        </p>
      )}
    </section>
  );
}
