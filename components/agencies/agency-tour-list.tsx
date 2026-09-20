'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, PencilSimple, BookmarkSimple } from '@phosphor-icons/react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { extractErrorMessage } from '@/lib/format-validation-error';

export interface AgencyTourData {
  id: string;
  title: string;
  status: string;
  startAt: string;
  capacity: number | null;
  confirmedCount: number;
  priceCrc: number | null;
}

export function AgencyTourList({
  agencyId,
  canPublish,
  initialTours,
}: {
  agencyId: string;
  canPublish: boolean;
  initialTours: AgencyTourData[];
}) {
  const t = useTranslations('agencies');
  const locale = useLocale();
  const router = useRouter();
  const [tours, setTours] = useState(initialTours);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [savedTemplateIds, setSavedTemplateIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const currency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  const publish = async (tripId: string) => {
    setPublishingId(tripId);
    setError(null);
    const res = await fetch(`/api/agencies/${agencyId}/tours/${tripId}/publish`, { method: 'POST' });
    setPublishingId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, t('tourPublishError')));
      return;
    }

    setTours((prev) => prev.map((tour) => (tour.id === tripId ? { ...tour, status: 'published' } : tour)));
  };

  const saveAsTemplate = async (tripId: string) => {
    setSavingTemplateId(tripId);
    setError(null);
    const res = await fetch(`/api/agencies/${agencyId}/tours/${tripId}/save-as-template`, { method: 'POST' });
    setSavingTemplateId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, t('templateSaveError')));
      return;
    }

    setSavedTemplateIds((prev) => new Set(prev).add(tripId));
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('toursTitle')}</h2>
        <Link href={`/agencies/${agencyId}/tours/new`} className={buttonVariants({ size: 'xs', variant: 'secondary' })}>
          <Plus size={14} weight="bold" />
          {t('tourCreate')}
        </Link>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {tours.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('toursEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {tours.map((tour) => (
            <li
              key={tour.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <div className="min-w-0">
                <Link href={`/trips/${tour.id}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-100">
                  {tour.title}
                </Link>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {dateFormatter.format(new Date(tour.startAt))}
                  {' · '}
                  {tour.priceCrc != null ? currency.format(tour.priceCrc) : ''}
                  {' · '}
                  {t('tourSpots', { confirmed: tour.confirmedCount, capacity: tour.capacity ?? 0 })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={tour.status === 'published' ? 'default' : 'secondary'}>
                  {t(`tourStatus_${tour.status}` as const)}
                </Badge>
                {canPublish && tour.status === 'draft' && (
                  <Button size="xs" isLoading={publishingId === tour.id} onClick={() => publish(tour.id)}>
                    {t('tourPublish')}
                  </Button>
                )}
                {canPublish && (
                  <>
                    <Button
                      size="xs"
                      variant="ghost"
                      isLoading={savingTemplateId === tour.id}
                      disabled={savedTemplateIds.has(tour.id)}
                      onClick={() => saveAsTemplate(tour.id)}
                      aria-label={t('templateSaveFromTour')}
                      title={t('templateSaveFromTour')}
                    >
                      <BookmarkSimple
                        size={14}
                        weight={savedTemplateIds.has(tour.id) ? 'fill' : 'regular'}
                        strokeWidth={1.5}
                      />
                    </Button>
                    <Link
                      href={`/agencies/${agencyId}/tours/${tour.id}/edit`}
                      aria-label={t('tourEdit')}
                      title={t('tourEdit')}
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <PencilSimple size={14} weight="regular" strokeWidth={1.5} />
                    </Link>
                    <DeleteTripButton tripId={tour.id} redirectTo={`/agencies/${agencyId}/panel`} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
