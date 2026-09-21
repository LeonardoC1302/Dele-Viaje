import { getTranslations } from 'next-intl/server';
import { UsersThree, SealCheck, LockKey } from '@phosphor-icons/react/dist/ssr';

/**
 * The three ways to use the product, set as a field guide's key rather
 * than as three cards.
 *
 * Two things were wrong with the card version: it numbered them
 * `01 / 02 / 03`, implying a sequence they don't have — these are
 * alternatives, you pick one — and it was three identical boxes, the
 * scaffold every product page in this category reaches for.
 *
 * A key is the right form because the job here is comparison, not
 * instruction: three entries on shared paper, divided by rules, each
 * with its own glyph. The reader's eye moves across them rather than
 * down a stack, which is what choosing between alternatives actually
 * looks like.
 *
 * All three keep equal weight on purpose — PRODUCT.md treats local
 * organizers and tour buyers as co-equal audiences, so neither the
 * social path nor the paid one may read as the real product with the
 * other bolted on.
 */
export async function HowItWorks() {
  const t = await getTranslations('howItWorks');

  const entries = [
    { key: 'social', Icon: UsersThree, glyph: 'text-forest-600 dark:text-forest-400' },
    { key: 'tour', Icon: SealCheck, glyph: 'text-dawn-600 dark:text-dawn-400' },
    { key: 'private', Icon: LockKey, glyph: 'text-forest-500 dark:text-forest-300' },
  ] as const;

  return (
    <section
      id="how-it-works"
      className="border-t border-sand-200 py-20 dark:border-sand-800 sm:py-24"
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-7">
        <h2 className="max-w-[18ch] text-display-sm font-extrabold text-sand-900 dark:text-sand-50">
          {t('title')}
        </h2>

        {/* Divided by rules, not boxed. `divide-*` draws the rule
            between entries only, so the group reads as one sheet with
            three columns rather than three separate objects. */}
        <dl className="mt-14 grid divide-y divide-sand-200 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-sand-800">
          {entries.map(({ key, Icon, glyph }) => (
            <div key={key} className="py-8 first:pt-0 md:px-8 md:py-0 md:first:pl-0 md:last:pr-0">
              <Icon size={30} weight="duotone" className={glyph} aria-hidden="true" />

              <dt className="mt-5 font-display text-lg font-bold text-sand-900 dark:text-sand-50">
                {t(`${key}.title`)}
              </dt>
              <dd className="mt-3 max-w-[38ch] leading-relaxed text-sand-600 dark:text-sand-400">
                {t(`${key}.body`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
