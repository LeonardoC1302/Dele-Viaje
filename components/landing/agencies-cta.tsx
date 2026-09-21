import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Ridgeline } from '@/components/cordillera/ridgeline';
import { buttonVariants } from '@/components/ui/button';

/**
 * The agency-side call to action.
 *
 * A full forest band with the ridge bleeding along its foot — the one
 * place on the page where the ground inverts, which is what marks this
 * as addressed to a different reader (operators, not travellers)
 * without needing a heading that says so.
 */
export async function AgenciesCta() {
  const t = await getTranslations('agenciesCta');

  return (
    <section className="relative overflow-hidden bg-forest-600">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 sm:h-44">
        <Ridgeline profile="cordillera" tone="deep" showSun={false} />
      </div>

      <div className="relative mx-auto max-w-[1240px] px-4 py-20 sm:px-7 sm:py-24">
        <div className="max-w-[46ch]">

          <h2 className="text-display-sm font-extrabold text-white">{t('title')}</h2>

          <p className="mt-4 leading-relaxed text-forest-100/85">{t('body')}</p>

          <Link
            href="/agencies/new"
            className={buttonVariants({ size: 'lg', variant: 'primary', className: 'mt-8' })}
          >
            {t('cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
