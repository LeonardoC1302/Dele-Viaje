import { useTranslations, useLocale } from 'next-intl';
import { CalendarBlank, MapPin, Users } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import {
  CATEGORY_ICONS,
  CATEGORY_TAB,
  DEFAULT_CATEGORY_TAB,
} from '@/lib/constants/category-visuals';
import type { CategoryKey } from '@/lib/constants/categories';
import { cn } from '@/lib/utils';

export interface TripCardData {
  id: string;
  title: string;
  category: string;
  locationName: string;
  startAt: string;
  capacity: number | null;
  confirmedCount: number;
  lat?: number | null;
  lng?: number | null;
  visibility?: 'public' | 'private';
  type?: 'social' | 'tour';
  priceCrc?: number | null;
}

/**
 * A trip is a file in the drawer, so its card is a miniature folder:
 * a category-colored tab cut into the top edge carrying the category
 * icon and name, and the card body as the sheet below it.
 *
 * This is the dossier language at its smallest scale, and it is what
 * makes a feed of these read as a drawer of files rather than as the
 * uniform grid of rounded white boxes every trip app ships. The tab
 * also does real work: category is legible before you read a word of
 * the title, at a glance, across a whole page of them.
 */
export function TripCard({ trip }: { trip: TripCardData }) {
  const t = useTranslations('feed');
  const tCategories = useTranslations('categories');
  const tTrips = useTranslations('trips');
  const locale = useLocale();

  const spotsLeft = trip.capacity != null ? trip.capacity - trip.confirmedCount : null;
  const isFull = spotsLeft != null && spotsLeft <= 0;
  const isPast = new Date(trip.startAt) <= new Date();

  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(trip.startAt));

  const currency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });

  const key = trip.category as CategoryKey;
  const CategoryIcon = CATEGORY_ICONS[key];
  const tabColor = CATEGORY_TAB[key] ?? DEFAULT_CATEGORY_TAB;

  return (
    <Link href={`/trips/${trip.id}`} className="group block">
      <article className={cn('flex h-full flex-col', isPast && 'opacity-60')}>
        {/* The cut tab. Sits on the card's top edge, inset from the
            left, and shares the card's border so the two read as one
            folded sheet. */}
        <div className="flex pl-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-t-md px-2.5 py-1.5 font-display text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white',
              tabColor
            )}
          >
            {CategoryIcon && <CategoryIcon size={13} weight="fill" />}
            {tCategories(trip.category)}
          </span>
        </div>

        <div
          className={cn(
            'flex flex-1 flex-col rounded-b-md rounded-tr-md border border-sand-200 bg-[color:var(--raised)] p-4',
            'transition-colors group-hover:border-sand-400 dark:border-sand-800 dark:group-hover:border-sand-600'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 font-display text-[1.0625rem] font-bold leading-snug text-sand-900 dark:text-sand-50">
              {trip.title}
            </h3>

            {(trip.visibility === 'private' || trip.type === 'tour') && (
              <span className="micro-label shrink-0 border border-sand-300 px-1.5 py-1 dark:border-sand-600">
                {trip.visibility === 'private'
                  ? tTrips('privatePlanBadge')
                  : tTrips('tourBadge')}
              </span>
            )}
          </div>

          <dl className="mt-3 space-y-1.5 text-sm text-sand-600 dark:text-sand-400">
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t('dateLabel')}</dt>
              <CalendarBlank size={15} className="shrink-0 text-sand-400" />
              <dd className="tnum">{formattedDate}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t('locationLabel')}</dt>
              <MapPin size={15} className="shrink-0 text-sand-400" />
              <dd className="truncate">{trip.locationName}</dd>
            </div>
          </dl>

          {/* Pushed to the card's foot so every card in a row lines its
              capacity/price rule up regardless of title length. */}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-sand-200 pt-3 dark:border-sand-800">
            <p
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium',
                isFull
                  ? 'text-sand-500 dark:text-sand-400'
                  : 'text-forest-600 dark:text-forest-400'
              )}
            >
              <Users size={15} className="shrink-0" />
              {trip.capacity == null
                ? t('openCapacity')
                : isFull
                  ? t('full')
                  : t('spotsLeft', { count: spotsLeft })}
            </p>

            {trip.type === 'tour' && trip.priceCrc != null && (
              <p className="tnum font-display text-sm font-bold text-sand-900 dark:text-sand-50">
                {currency.format(trip.priceCrc)}
              </p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
