import { createClient } from '@/lib/supabase/server';
import { FolderRail } from '@/components/app-shell/folder-rail';
import {
  NotificationBell,
  type NotificationData,
  type NotificationActor,
} from '@/components/notifications/notification-bell';

/**
 * The authenticated shell. See `.impeccable/surfaces/
 * app-locale-main-layout-tsx.md` for the direction contract this
 * implements.
 *
 * The rail is fixed, so the content column is inset by the rail's width
 * on desktop and by the mobile bar's height at the bottom on phones.
 * Every child surface uses `PageBody` for its gutter rather than
 * setting its own, which is what keeps the content column aligned from
 * page to page.
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let notifications: NotificationData[] = [];
  const actors: Record<string, NotificationActor> = {};
  const tripTitles: Record<string, string> = {};
  let isAdmin = false;
  let myAgencyId: string | null = null;

  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = myProfile?.role === 'admin';

    const { data: myMembership } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    myAgencyId = myMembership?.agency_id ?? null;

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

    const actorIds = [
      ...new Set(notifications.map((n) => n.actorId).filter(Boolean)),
    ] as string[];
    const tripIds = [
      ...new Set(notifications.map((n) => n.tripId).filter(Boolean)),
    ] as string[];

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
    <div className="min-h-[100dvh] bg-[color:var(--page)]">
      <FolderRail
        isAuthenticated={!!user}
        isAdmin={isAdmin}
        myAgencyId={myAgencyId}
        bell={
          user ? (
            <NotificationBell
              currentUserId={user.id}
              initialNotifications={notifications}
              initialActors={actors}
              initialTripTitles={tripTitles}
            />
          ) : null
        }
      />

      {/* pb-24 clears the fixed mobile bar; lg:pl-[228px] clears the rail. */}
      <main className="pb-24 lg:pb-0 lg:pl-[228px]">{children}</main>
    </div>
  );
}
