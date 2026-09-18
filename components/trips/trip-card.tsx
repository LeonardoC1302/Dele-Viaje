import { useTranslations, useLocale } from 'next-intl';
import { CalendarBlank, MapPin } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
}

export function TripCard({ trip }: { trip: TripCardData }) {
  const t = useTranslations('feed');
  const tCategories = useTranslations('categories');
  const locale = useLocale();

  const spotsLeft =
    trip.capacity != null ? trip.capacity - trip.confirmedCount : null;
  const isFull = spotsLeft != null && spotsLeft <= 0;

  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(trip.startAt));

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="h-full transition-transform hover:-translate-y-1">
        <CardContent className="p-6">
          <Badge variant="default">{tCategories(trip.category)}</Badge>

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

          <p className="mt-3 text-sm font-medium text-forest-600 dark:text-forest-400">
            {trip.capacity == null
              ? t('openCapacity')
              : isFull
                ? t('full')
                : t('spotsLeft', { count: spotsLeft })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
