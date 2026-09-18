import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  NotificationBell,
  type NotificationData,
  type NotificationActor,
} from '@/components/notifications/notification-bell';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('mainNav');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifications: NotificationData[] = [];
  let actors: Record<string, NotificationActor> = {};
  let tripTitles: Record<string, string> = {};
  let isAdmin = false;

  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = myProfile?.role === 'admin';

    const { data: rows } = await supabase
      .from('notifications')
      .select('id, type, trip_id, actor_id, data, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    notifications = (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      tripId: r.trip_id,
      actorId: r.actor_id,
      data: r.data ?? {},
      readAt: r.read_at,
      createdAt: r.created_at,
    }));

    const actorIds = [...new Set(notifications.map((n) => n.actorId).filter(Boolean))] as string[];
    const tripIds = [...new Set(notifications.map((n) => n.tripId).filter(Boolean))] as string[];

    if (actorIds.length > 0) {
      const { data: actorRows } = await supabase.rpc('profiles_public').in('id', actorIds);
      for (const a of actorRows ?? []) {
        actors[a.id] = { displayName: a.display_name, avatarUrl: a.avatar_url };
      }
    }

    if (tripIds.length > 0) {
      const { data: tripRows } = await supabase
        .from('trips')
        .select('id, title')
        .in('id', tripIds);
      for (const tr of tripRows ?? []) {
        tripTitles[tr.id] = tr.title;
      }
    }
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-neutral-50/80 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Dele Viaje
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/feed"
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-forest-600 dark:text-neutral-300 dark:hover:text-forest-400"
            >
              {t('feed')}
            </Link>
            <Link
              href="/trips/new"
              className={buttonVariants({ size: 'sm', variant: 'primary' })}
            >
              {t('createTrip')}
            </Link>
            {isAdmin && (
              <Link
                href="/admin/reports"
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-forest-600 dark:text-neutral-300 dark:hover:text-forest-400"
              >
                {t('admin')}
              </Link>
            )}
            {user && (
              <NotificationBell
                currentUserId={user.id}
                initialNotifications={notifications}
                initialActors={actors}
                initialTripTitles={tripTitles}
              />
            )}
            {user && (
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'ghost' })
                  )}
                >
                  {t('signOut')}
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
