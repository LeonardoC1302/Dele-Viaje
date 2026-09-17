import { useTranslations } from 'next-intl';
import { InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';

export function Footer() {
  const t = useTranslations('footer');

  const columns = [
    {
      heading: t('explore.title'),
      links: [
        t('explore.socialTrips'),
        t('explore.verifiedTours'),
        t('explore.privatePlans'),
      ],
    },
    {
      heading: t('company.title'),
      links: [t('company.about'), t('company.safety'), t('company.contact')],
    },
    {
      heading: t('agencies.title'),
      links: [t('agencies.listTours'), t('agencies.dashboard')],
    },
  ];

  return (
    <footer className="border-t border-neutral-200 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Dele Viaje
            </p>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              {t('tagline')}
            </p>
            <div className="mt-5 flex gap-4">
              <a
                href="#"
                aria-label="Instagram"
                className="text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
              >
                <InstagramLogo size={20} weight="regular" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
              >
                <TiktokLogo size={20} weight="regular" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {col.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
