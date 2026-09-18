import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/ui/avatar';
import { FollowButton } from '@/components/profile/follow-button';
import { TripCard, type TripCardData } from '@/components/trips/trip-card';
import { BadgeList, type BadgeData } from '@/components/profile/badge-list';
import { BadgeManager } from '@/components/admin/badge-manager';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('profile');
  const supabase = await createClient();

  const { data: profileRows } = await supabase.rpc('profiles_public').eq('id', id);
  const profile = (profileRows ?? [])[0] as
    | { id: string; display_name: string | null; avatar_url: string | null; bio: string | null }
    | undefined;

  if (!profile) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = myProfile?.role === 'admin';
  }

  const [
    followerCountResult,
    followingCountResult,
    isFollowingResult,
    tripsResult,
    userBadgesResult,
    allBadgesResult,
  ] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followed_id', id),
      supabase
        .from('follows')
        .select('followed_id', { count: 'exact', head: true })
        .eq('follower_id', id),
      user && user.id !== id
        ? supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('followed_id', id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('trips')
        .select('id, title, category, location_name, start_at, capacity, confirmed_count')
        .eq('owner_id', id)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('start_at', { ascending: false })
        .limit(24),
      supabase.from('user_badges').select('code, badges (code, label_es, label_en, icon)').eq('profile_id', id),
      isAdmin ? supabase.from('badges').select('code, label_es, label_en') : Promise.resolve({ data: [] }),
    ]);

  const tripCards: TripCardData[] = (tripsResult.data ?? []).map((trip) => ({
    id: trip.id,
    title: trip.title,
    category: trip.category,
    locationName: trip.location_name,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
  }));

  const userBadgeRows = (userBadgesResult.data ?? []) as unknown as {
    code: string;
    badges: { code: string; label_es: string; label_en: string; icon: string } | null;
  }[];
  const badges: BadgeData[] = userBadgeRows
    .filter((row) => row.badges)
    .map((row) => ({
      code: row.badges!.code,
      labelEs: row.badges!.label_es,
      labelEn: row.badges!.label_en,
      icon: row.badges!.icon,
    }));
  const grantedCodes = badges.map((b) => b.code);
  const allBadges = (allBadgesResult.data ?? []).map((b) => ({
    code: b.code,
    labelEs: b.label_es,
    labelEn: b.label_en,
  }));

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-4 rounded-xl border border-neutral-200 bg-white p-8 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-4">
            <Avatar
              src={profile.avatar_url ?? undefined}
              alt={profile.display_name ?? ''}
              fallback={profile.display_name ?? undefined}
              size={64}
            />
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {profile.display_name ?? '—'}
              </h1>
              {profile.bio && (
                <p className="mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
                  {profile.bio}
                </p>
              )}
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {t('followerCount', { count: followerCountResult.count ?? 0 })} ·{' '}
                {t('followingCount', { count: followingCountResult.count ?? 0 })}
              </p>
              <BadgeList badges={badges} />
            </div>
          </div>

          {user && user.id !== id && (
            <FollowButton profileId={id} initialFollowing={!!isFollowingResult.data} />
          )}
        </div>

        {isAdmin && (
          <BadgeManager profileId={id} allBadges={allBadges} grantedCodes={grantedCodes} />
        )}

        <h2 className="mt-10 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {t('tripsTitle')}
        </h2>

        {tripCards.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            {t('noTrips')}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tripCards.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
