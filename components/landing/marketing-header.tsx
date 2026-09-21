'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { List, X } from '@phosphor-icons/react';
import { Link } from '@/i18n/navigation';
import { LocaleSwitch } from '@/components/i18n/locale-switch';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The marketing header — deliberately *not* the app's folder rail.
 *
 * A signed-out visitor has no folders yet, so giving them a rail of
 * places they can't go would be furniture. They get a conventional
 * sticky header instead; the dossier world begins the moment they're
 * inside the app.
 */
export function MarketingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations('nav');
  const tMain = useTranslations('mainNav');
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/feed', label: t('trips') },
    { href: '#how-it-works', label: t('howItWorks') },
    { href: '/agencies/new', label: t('forAgencies') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-sand-200/80 bg-[color:var(--page)]/85 backdrop-blur-md dark:border-sand-800/80">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-7">
        <Link href="/" className="flex items-center gap-2.5">
          <PeakMark />
          <span className="font-display text-[1.0625rem] font-extrabold tracking-tight text-sand-900 dark:text-sand-50">
            Dele Viaje
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-sm font-semibold text-sand-600 transition-colors hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LocaleSwitch />
          </div>

          <Link
            href={isAuthenticated ? '/feed' : '/login'}
            className={cn(buttonVariants({ size: 'sm', variant: 'primary' }), 'hidden sm:inline-flex')}
          >
            {isAuthenticated ? tMain('feed') : t('signIn')}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? tMain('closeMenu') : tMain('openMenu')}
            className="rounded-full p-2 text-sand-700 transition-colors hover:bg-sand-100 lg:hidden dark:text-sand-300 dark:hover:bg-sand-800"
          >
            {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-sand-200 bg-[color:var(--page)] px-4 py-4 lg:hidden dark:border-sand-800">
          <nav className="flex flex-col gap-1" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 font-display text-sm font-semibold text-sand-700 transition-colors hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-sand-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-sand-200 pt-4 dark:border-sand-800">
            <LocaleSwitch />
            <Link
              href={isAuthenticated ? '/feed' : '/login'}
              onClick={() => setOpen(false)}
              className={buttonVariants({ size: 'sm', variant: 'primary' })}
            >
              {isAuthenticated ? tMain('feed') : t('signIn')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function PeakMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M2 20 L9 7 L13.5 14 L16.5 9 L22 20 Z" className="fill-forest-600 dark:fill-forest-400" />
      <circle cx="18" cy="5.5" r="2.5" className="fill-dawn-500" />
    </svg>
  );
}
