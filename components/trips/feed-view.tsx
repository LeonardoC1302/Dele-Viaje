'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ListBullets, MapTrifold } from '@phosphor-icons/react';
import { Link } from '@/i18n/navigation';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';
import { TripMap } from '@/components/trips/trip-map';
import { EmptyState } from '@/components/cordillera/empty-state';
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
      <EmptyState
        className="mt-8"
        title={emptyTitle}
        body={emptyBody}
        action={
          <Link href={emptyCtaHref} className={buttonVariants({ variant: 'primary' })}>
            {emptyCtaLabel}
          </Link>
        }
      />
    );
  }

  const pins = trips
    .filter((trip) => trip.lat != null && trip.lng != null)
    .map((trip) => ({ id: trip.id, title: trip.title, lat: trip.lat!, lng: trip.lng! }));

  return (
    <div className="mt-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="micro-label">{t('resultsCount', { count: trips.length })}</p>

        {/* A segmented control, squared to match the folder geometry —
            the pill radius belongs to buttons and chips, and this is a
            view switch, not either. */}
        <div className="inline-flex overflow-hidden rounded-md border border-sand-300 dark:border-sand-700">
          {(
            [
              { key: 'list', label: t('viewList'), Icon: ListBullets },
              { key: 'map', label: t('viewMap'), Icon: MapTrifold },
            ] as const
          ).map(({ key, label, Icon }, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 font-display text-sm font-semibold transition-colors',
                i > 0 && 'border-l border-sand-300 dark:border-sand-700',
                view === key
                  ? 'bg-forest-600 text-white'
                  : 'text-sand-600 hover:bg-sand-100 dark:text-sand-400 dark:hover:bg-sand-800'
              )}
            >
              <Icon size={15} weight={view === key ? 'fill' : 'regular'} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : pins.length === 0 ? (
        <EmptyState title={t('noMapPins')} />
      ) : (
        <div className="overflow-hidden rounded-md border border-sand-200 dark:border-sand-800">
          <TripMap pins={pins} />
        </div>
      )}
    </div>
  );
}
