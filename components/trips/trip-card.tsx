import { useTranslations, useLocale } from 'next-intl';
import { CalendarBlank, MapPin } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export function TripCard({ trip }: { trip: TripCardData }) {
  const t = useTranslations('feed');
  const tCategories = useTranslations('categories');
  const tTrips = useTranslations('trips');
  const locale = useLocale();

  const spotsLeft =
    trip.capacity != null ? trip.capacity - trip.confirmedCount : null;
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

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className={cn('h-full transition-transform hover:-translate-y-1', isPast && 'opacity-60')}>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{tCategories(trip.category)}</Badge>
            {trip.visibility === 'private' && (
              <Badge variant="secondary">{tTrips('privatePlanBadge')}</Badge>
            )}
            {trip.type === 'tour' && <Badge variant="secondary">{tTrips('tourBadge')}</Badge>}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {trip.title}
          </h3>

          <p className="mt-3 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <CalendarBlank size={16} weight="regular" strokeWidth={1.5} />
            {formattedDate}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <MapPin size={16} weight="regular" strokeWidth={1.5} />
            {trip.locationName}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-forest-600 dark:text-forest-400">
              {trip.capacity == null
                ? t('openCapacity')
                : isFull
                  ? t('full')
                  : t('spotsLeft', { count: spotsLeft })}
            </p>
            {trip.type === 'tour' && trip.priceCrc != null && (
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {currency.format(trip.priceCrc)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
