'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { List, X } from '@phosphor-icons/react';
import { Link } from '@/i18n/navigation';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  myAgencyId: string | null;
}

// The header outgrew a single horizontal row a while back (feed, my
// trips, my agency, create trip, admin, notifications, sign out — up to
// 7 items when logged in as admin) — collapses below `lg` into this
// instead of continuing to squeeze. Reuses the same Popover primitive
// NotificationBell already uses rather than pulling in a dedicated sheet/
// drawer component for what's still just an anchored dropdown.
export function MobileNav({ isAuthenticated, isAdmin, myAgencyId }: MobileNavProps) {
  const t = useTranslations('mainNav');
  const [open, setOpen] = useState(false);

  const linkClass =
    'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={open ? t('closeMenu') : t('openMenu')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900 lg:hidden"
        >
          {open ? (
            <X size={20} weight="regular" strokeWidth={1.5} />
          ) : (
            <List size={20} weight="regular" strokeWidth={1.5} />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} className="w-64 p-2 lg:hidden">
        <nav className="flex flex-col gap-1">
          <Link href="/feed" onClick={() => setOpen(false)} className={linkClass}>
            {t('feed')}
          </Link>
          {isAuthenticated && (
            <Link href="/my-trips" onClick={() => setOpen(false)} className={linkClass}>
              {t('myTrips')}
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href={myAgencyId ? `/agencies/${myAgencyId}/panel` : '/agencies/new'}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              {myAgencyId ? t('myAgency') : t('becomeAgency')}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className={linkClass}>
              {t('admin')}
            </Link>
          )}

          <Link
            href="/trips/new"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ size: 'sm', variant: 'primary' }), 'mt-2 justify-center')}
          >
            {t('createTrip')}
          </Link>

          {isAuthenticated && (
            <form action="/api/auth/signout" method="POST" className="mt-1">
              <button
                type="submit"
                className={cn(linkClass, 'w-full text-left text-red-600 dark:text-red-400')}
              >
                {t('signOut')}
              </button>
            </form>
          )}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
