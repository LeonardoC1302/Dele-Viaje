import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * The footer sits on the darkest step of the sand ramp rather than on
 * forest, so the agencies band above it stays the page's one inverted
 * region and the page ends on paper's own dark end instead of on a
 * second green block.
 */
export async function Footer() {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t('explore.title'),
      links: [
        { href: '/feed', label: t('explore.socialTrips') },
        { href: { pathname: '/feed', query: { verified: '1' } }, label: t('explore.verifiedTours') },
        { href: '/my-trips', label: t('explore.privatePlans') },
      ],
    },
    {
      title: t('company.title'),
      links: [
        { href: '/', label: t('company.about') },
        { href: '/', label: t('company.safety') },
        { href: '/', label: t('company.contact') },
      ],
    },
    {
      title: t('agencies.title'),
      links: [
        { href: '/agencies/new', label: t('agencies.listTours') },
        { href: '/agencies/new', label: t('agencies.dashboard') },
      ],
    },
  ];

  return (
    <footer className="bg-sand-900 py-16 text-sand-300 dark:bg-sand-950">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-7">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
                <path d="M2 20 L9 7 L13.5 14 L16.5 9 L22 20 Z" className="fill-forest-400" />
                <circle cx="18" cy="5.5" r="2.5" className="fill-dawn-500" />
              </svg>
              <span className="font-display text-base font-extrabold tracking-tight text-sand-50">
                Dele Viaje
              </span>
            </div>
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-sand-400">
              {t('tagline')}
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="micro-label text-sand-500">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={`${col.title}-${i}`}>
                    <Link
                      href={link.href as never}
                      className="text-sm text-sand-400 transition-colors hover:text-sand-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-sand-800 pt-7">
          <p className="text-xs text-sand-500">{t('copyright', { year })}</p>
        </div>
      </div>
    </footer>
  );
}
