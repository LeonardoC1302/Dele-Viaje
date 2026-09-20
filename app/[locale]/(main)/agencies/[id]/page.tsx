import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SealCheck, Gear } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';

export default async function AgencyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations('agencies');

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, business_name, description, location_name, status, owner_id')
    .eq('id', id)
    .single();

  if (!agency) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [staffResult, toursResult] = await Promise.all([
    user
      ? supabase
          .from('agency_members')
          .select('id')
          .eq('agency_id', id)
          .eq('profile_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('trips')
      .select('id, title, category, location_name, start_at, capacity, confirmed_count, type, price_crc')
      .eq('agency_id', id)
      .eq('status', 'published')
      .order('start_at', { ascending: true }),
  ]);

  const isStaff = !!staffResult.data;
  const tours: TripCardData[] = (toursResult.data ?? []).map((trip) => ({
    id: trip.id,
    title: trip.title,
    category: trip.category,
    locationName: trip.location_name,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
    type: trip.type,
    priceCrc: trip.price_crc,
  }));

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
                {agency.business_name}
              </h1>
              {agency.status === 'approved' && (
                <SealCheck size={24} weight="fill" className="text-forest-600 dark:text-forest-400" />
              )}
            </div>
            {isStaff && (
              <Link
                href={`/agencies/${agency.id}/panel`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                <Gear size={16} weight="regular" strokeWidth={1.5} />
                {t('managePanel')}
              </Link>
            )}
          </div>

          {agency.status === 'approved' && (
            <Badge variant="secondary" className="mt-2">
              {t('verifiedBadge')}
            </Badge>
          )}

          {agency.location_name && (
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{agency.location_name}</p>
          )}
          {agency.description && (
            <p className="mt-4 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
              {agency.description}
            </p>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t('toursTitle')}</h2>
          {tours.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('publicToursEmpty')}</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <TripCard key={tour.id} trip={tour} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
