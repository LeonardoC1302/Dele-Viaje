'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ListBullets, MapTrifold, Compass } from '@phosphor-icons/react';
import { Link } from '@/i18n/navigation';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';
import { TripMap } from '@/components/trips/trip-map';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedViewProps {
  trips: TripCardData[];
  emptyTitle: string;
  emptyBody: string;
  emptyCtaHref: string;
  emptyCtaLabel: string;
}

export function FeedView({
  trips,
  emptyTitle,
  emptyBody,
  emptyCtaHref,
  emptyCtaLabel,
}: FeedViewProps) {
  const t = useTranslations('feed');
  const [view, setView] = useState<'list' | 'map'>('list');

  if (trips.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center rounded-xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
        <Compass
          size={40}
          weight="regular"
          strokeWidth={1.5}
          className="text-neutral-400 dark:text-neutral-600"
        />
        <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {emptyTitle}
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {emptyBody}
        </p>
        <Link
          href={emptyCtaHref}
          className={cn(buttonVariants({ size: 'md', variant: 'primary' }), 'mt-6')}
        >
          {emptyCtaLabel}
        </Link>
      </div>
    );
  }

  const pins = trips
    .filter((trip) => trip.lat != null && trip.lng != null)
    .map((trip) => ({ id: trip.id, title: trip.title, lat: trip.lat!, lng: trip.lng! }));

  return (
    <div className="mt-8">
      <div className="mb-4 inline-flex rounded-full border border-neutral-300 p-1 dark:border-neutral-700">
        <button
          type="button"
          onClick={() => setView('list')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            view === 'list'
              ? 'bg-forest-600 text-white'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
          )}
        >
          <ListBullets size={16} weight="regular" strokeWidth={1.5} />
          {t('viewList')}
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            view === 'map'
              ? 'bg-forest-600 text-white'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
          )}
        >
          <MapTrifold size={16} weight="regular" strokeWidth={1.5} />
          {t('viewMap')}
        </button>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : pins.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          {t('noMapPins')}
        </p>
      ) : (
        <TripMap pins={pins} />
      )}
    </div>
  );
}
