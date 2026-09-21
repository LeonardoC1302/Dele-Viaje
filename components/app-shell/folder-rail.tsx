'use client';

import { useTranslations } from 'next-intl';
import {
  Compass,
  Backpack,
  Storefront,
  ShieldCheck,
  Plus,
  SignOut,
  type Icon,
} from '@phosphor-icons/react';
import { Link, usePathname } from '@/i18n/navigation';
import { Ridgeline } from '@/components/cordillera/ridgeline';
import { cn } from '@/lib/utils';

/**
 * The rail the folders hang in.
 *
 * This replaces the previous top-bar-over-a-scrolling-plane shell, and
 * it is the single most load-bearing structural decision in the
 * redesign: a persistent rail gives the product a fixed place to stand
 * while the folder face changes, which is what lets a trip read as one
 * object rather than as a series of pages.
 *
 * On a phone the rail becomes a bottom bar — same items, same active
 * marking, thumb-reachable — because a 228px rail on a 390px screen is
 * not a rail, it is the page.
 */

interface RailItem {
  href: string;
  label: string;
  icon: Icon;
  /** Match child routes too (`/agencies/x/panel` lights the Agency item). */
  prefix?: string;
}

export function FolderRail({
  isAuthenticated,
  isAdmin,
  myAgencyId,
  bell,
}: {
  isAuthenticated: boolean;
  isAdmin: boolean;
  myAgencyId: string | null;
  /** The notification bell, passed in so the rail stays presentational. */
  bell?: React.ReactNode;
}) {
  const t = useTranslations('mainNav');
  const pathname = usePathname();

  const items: RailItem[] = [
    { href: '/feed', label: t('feed'), icon: Compass },
  ];

  if (isAuthenticated) {
    items.push({ href: '/my-trips', label: t('myTrips'), icon: Backpack });
    items.push({
      href: myAgencyId ? `/agencies/${myAgencyId}/panel` : '/agencies/new',
      label: myAgencyId ? t('myAgency') : t('becomeAgency'),
      icon: Storefront,
      prefix: '/agencies',
    });
    if (isAdmin) {
      items.push({ href: '/admin', label: t('admin'), icon: ShieldCheck, prefix: '/admin' });
    }
  }

  const isActive = (item: RailItem) =>
    item.prefix ? pathname.startsWith(item.prefix) : pathname === item.href;

  return (
    <>
      {/* ---------------------------------------------------------------
          Desktop rail
          --------------------------------------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col bg-forest-700 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-5 py-6 text-white transition-opacity hover:opacity-80"
        >
          <PeakMark />
          <span className="font-display text-[1.0625rem] font-extrabold tracking-tight">
            Dele Viaje
          </span>
        </Link>

        {isAuthenticated && (
          <div className="px-4 pb-5">
            <Link
              href="/trips/new"
              className="flex items-center justify-center gap-2 rounded-full bg-dawn-500 px-4 py-2.5 font-display text-sm font-semibold text-sand-950 transition-colors hover:bg-dawn-400"
            >
              <Plus size={16} weight="bold" />
              {t('createTrip')}
            </Link>
          </div>
        )}

        <nav className="flex-1 px-3" aria-label="Main">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = isActive(item);
              const ItemIcon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md border-l-2 py-2.5 pl-3 pr-3 font-display text-sm font-semibold transition-colors',
                      active
                        ? // The active folder is pulled forward: a lighter
                          // face plus the dawn edge that marks it.
                          'border-l-dawn-500 bg-forest-600 text-white'
                        : 'border-l-transparent text-forest-100/70 hover:bg-forest-600/50 hover:text-white'
                    )}
                  >
                    <ItemIcon size={19} weight={active ? 'fill' : 'regular'} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative">
          {/* The ridge signs the rail off — the same silhouette the hero
              and every page header use, at rail scale. */}
          <div className="pointer-events-none h-16">
            <Ridgeline profile="valle" tone="onDark" showSun={false} />
          </div>

          <div className="relative flex items-center gap-2 px-4 pb-5 pt-1">
            {bell}
            {isAuthenticated && (
              <form action="/api/auth/signout" method="POST" className="flex-1">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 font-display text-sm font-semibold text-forest-100/70 transition-colors hover:bg-forest-600/50 hover:text-white"
                >
                  <SignOut size={18} />
                  {t('signOut')}
                </button>
              </form>
            )}
            {!isAuthenticated && (
              <Link
                href="/login"
                className="flex-1 rounded-md px-2 py-2 font-display text-sm font-semibold text-forest-100/70 transition-colors hover:bg-forest-600/50 hover:text-white"
              >
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------------
          Mobile bar — same rail, same active marking, thumb-reachable.
          `pb-[env(safe-area-inset-bottom)]` keeps the row clear of the
          iOS home indicator.
          --------------------------------------------------------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-forest-800 bg-forest-700 pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Main"
      >
        {items.map((item) => {
          const active = isActive(item);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 border-t-2 px-1 pb-2 pt-2.5 text-[0.6875rem] font-semibold transition-colors',
                active
                  ? 'border-t-dawn-500 bg-forest-600 text-white'
                  : 'border-t-transparent text-forest-100/65'
              )}
            >
              <ItemIcon size={21} weight={active ? 'fill' : 'regular'} />
              <span className="font-display leading-none">{item.label}</span>
            </Link>
          );
        })}

        {isAuthenticated && (
          <Link
            href="/trips/new"
            className="flex flex-1 flex-col items-center gap-1 border-t-2 border-t-transparent px-1 pb-2 pt-2.5 text-[0.6875rem] font-semibold text-dawn-300"
          >
            <Plus size={21} weight="bold" />
            <span className="font-display leading-none">{t('createTrip')}</span>
          </Link>
        )}
      </nav>
    </>
  );
}

/**
 * The brand mark: the ridgeline reduced to the one peak that still
 * reads at 22px.
 */
function PeakMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M2 20 L9 7 L13.5 14 L16.5 9 L22 20 Z" className="fill-dawn-500" />
      <circle cx="18" cy="5.5" r="2.5" className="fill-dawn-300" />
    </svg>
  );
}
