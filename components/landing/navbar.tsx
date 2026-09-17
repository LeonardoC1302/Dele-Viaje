'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { List, X } from '@phosphor-icons/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavbarProps {
  isAuthenticated: boolean;
}

export function Navbar({ isAuthenticated }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');
  const tMainNav = useTranslations('mainNav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { label: t('howItWorks'), href: '#how-it-works' },
    { label: t('forAgencies'), href: '#agencies' },
    { label: t('waitlist'), href: '#waitlist' },
  ];

  const switchLocale = (next: string) => {
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-neutral-50/80 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Dele Viaje
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-forest-600 dark:text-neutral-300 dark:hover:text-forest-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <div className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {routing.locales.map((loc, i) => (
              <span key={loc} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                <button
                  type="button"
                  onClick={() => switchLocale(loc)}
                  aria-current={locale === loc}
                  className={cn(
                    'uppercase transition-colors hover:text-forest-600 dark:hover:text-forest-400',
                    locale === loc && 'text-forest-600 dark:text-forest-400'
                  )}
                >
                  {loc}
                </button>
              </span>
            ))}
          </div>

          {isAuthenticated ? (
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                {tMainNav('signOut')}
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              {t('signIn')}
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 lg:hidden dark:text-neutral-300"
        >
          {open ? (
            <X size={22} weight="regular" strokeWidth={1.5} />
          ) : (
            <List size={22} weight="regular" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full border-t border-neutral-200 bg-neutral-50 px-4 pb-6 pt-2 shadow-lg lg:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                {link.label}
              </a>
            ))}

            <div className="flex items-center gap-3 px-2 py-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {routing.locales.map((loc, i) => (
                <span key={loc} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  <button
                    type="button"
                    onClick={() => switchLocale(loc)}
                    aria-current={locale === loc}
                    className={cn(
                      'uppercase transition-colors',
                      locale === loc && 'text-forest-600 dark:text-forest-400'
                    )}
                  >
                    {loc}
                  </button>
                </span>
              ))}
            </div>

            {isAuthenticated ? (
              <form action="/api/auth/signout" method="POST" className="mt-3">
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'outline' }),
                    'w-full'
                  )}
                >
                  {tMainNav('signOut')}
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ size: 'sm', variant: 'outline' }),
                  'mt-3 w-full'
                )}
              >
                {t('signIn')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
