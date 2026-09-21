import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SealCheck, Gear } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';
import { Stars } from '@/components/agencies/tour-reviews';
import { cn } from '@/lib/utils';

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

  // Two queries rather than an embedded-resource filter (reviews!inner
  // joined through trips) — same reasoning as My Trips/Verified feed tab
  // elsewhere in this codebase: simpler, no dependency on PostgREST
  // embedded-filter syntax. All of an agency's tours (not just currently
  // published ones) count toward its rating — a suspended/past tour's
  // reviews shouldn't quietly vanish from the average.
  const { data: agencyTourIds } = await supabase.from('trips').select('id').eq('agency_id', id).eq('type', 'tour');
  const tourIds = (agencyTourIds ?? []).map((t) => t.id);
  const { data: ratingRows } =
    tourIds.length > 0 ? await supabase.from('reviews').select('rating').in('trip_id', tourIds) : { data: [] };
  const ratingCount = ratingRows?.length ?? 0;
  const ratingSum = (ratingRows ?? []).reduce((sum: number, r: { rating: number }) => sum + r.rating, 0);
  const ratingAverage = ratingCount > 0 ? ratingSum / ratingCount : 0;

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
    <main>
      {/* Cordillera profile banner — the same ridgeline silhouette as the
          home hero, scaled down, so an agency page still reads as part of
          the same world instead of falling back to a plain white card. */}
      <div className="relative overflow-hidden bg-forest-600 pb-16 pt-14 dark:bg-forest-800">
        <svg
          viewBox="0 0 1200 220"
          preserveAspectRatio="xMidYMin slice"
          className="absolute inset-x-0 bottom-0 h-full w-full opacity-25"
          aria-hidden="true"
        >
          <polygon points="0,220 0,140 220,60 420,120 620,20 900,110 1200,50 1200,220" fill="#ffffff" opacity=".25" />
          <polygon points="0,220 0,180 260,110 520,170 780,90 1050,160 1200,120 1200,220" fill="#ffffff" opacity=".4" />
        </svg>

        <div className="relative mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-3xl font-extrabold text-white md:text-4xl">
                {agency.business_name}
              </h1>
              {agency.status === 'approved' && (
                <SealCheck size={26} weight="fill" className="text-dawn-300" />
              )}
            </div>
            {isStaff && (
              <Link
                href={`/agencies/${agency.id}/panel`}
                className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }), 'font-display shrink-0')}
              >
                <Gear size={16} weight="regular" strokeWidth={1.5} />
                {t('managePanel')}
              </Link>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {agency.status === 'approved' && (
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                {t('verifiedBadge')}
              </span>
            )}
            {ratingCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-forest-50">
                <Stars value={ratingAverage} size={16} />
                <span>
                  {t('agencyRatingAverage', {
                    average: ratingAverage.toFixed(1),
                    count: ratingCount,
                  })}
                </span>
              </div>
            )}
            {agency.location_name && (
              <span className="text-sm text-forest-50/90">{agency.location_name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-7 sm:py-10">
        {agency.description && (
          <div className="-mt-8 rounded-md border border-sand-200 bg-[color:var(--raised)] p-6 dark:border-sand-800">
            <p className="whitespace-pre-wrap text-sand-700 dark:text-sand-300">{agency.description}</p>
          </div>
        )}

        <div className="mt-10 pb-12">
          <h2 className="font-display text-xl font-bold text-sand-900 dark:text-sand-100">
            {t('toursTitle')}
          </h2>
          {tours.length === 0 ? (
            <p className="mt-4 text-sm text-sand-500 dark:text-sand-400">{t('publicToursEmpty')}</p>
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
