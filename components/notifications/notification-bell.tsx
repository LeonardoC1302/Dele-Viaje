'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Bell } from '@phosphor-icons/react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type NotificationType =
  | 'trip_joined'
  | 'waitlist_promoted'
  | 'new_message'
  | 'new_follower';

export interface NotificationData {
  id: string;
  type: NotificationType;
  tripId: string | null;
  actorId: string | null;
  data: { preview?: string };
  readAt: string | null;
  createdAt: string;
}

export interface NotificationActor {
  displayName: string | null;
  avatarUrl: string | null;
}

interface NotificationBellProps {
  currentUserId: string;
  initialNotifications: NotificationData[];
  initialActors: Record<string, NotificationActor>;
  initialTripTitles: Record<string, string>;
}

const relativeTime = (iso: string, locale: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffMin < 1) return rtf.format(0, 'minute');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  return rtf.format(-diffDay, 'day');
};

export function NotificationBell({
  currentUserId,
  initialNotifications,
  initialActors,
  initialTripTitles,
}: NotificationBellProps) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState(initialNotifications);
  const [actors, setActors] = useState(initialActors);
  const [tripTitles, setTripTitles] = useState(initialTripTitles);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(() => {
      if (cancelled) return;

      channel = supabase
        .channel(`notifications:${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${currentUserId}`,
          },
          async (payload) => {
            const row = payload.new as {
              id: string;
              type: NotificationType;
              trip_id: string | null;
              actor_id: string | null;
              data: { preview?: string };
              read_at: string | null;
              created_at: string;
            };

            setNotifications((prev) =>
              prev.some((n) => n.id === row.id)
                ? prev
                : [
                    {
                      id: row.id,
                      type: row.type,
                      tripId: row.trip_id,
                      actorId: row.actor_id,
                      data: row.data ?? {},
                      readAt: row.read_at,
                      createdAt: row.created_at,
                    },
                    ...prev,
                  ]
            );

            if (row.actor_id) {
              setActors((prev) => {
                if (prev[row.actor_id!]) return prev;
                supabase
                  .rpc('profiles_public')
                  .eq('id', row.actor_id)
                  .single()
                  .then(({ data }) => {
                    const profile = data as { display_name: string | null; avatar_url: string | null } | null;
                    if (profile) {
                      setActors((p) => ({
                        ...p,
                        [row.actor_id!]: {
                          displayName: profile.display_name,
                          avatarUrl: profile.avatar_url,
                        },
                      }));
                    }
                  });
                return prev;
              });
            }

            if (row.trip_id) {
              setTripTitles((prev) => {
                if (prev[row.trip_id!]) return prev;
                supabase
                  .from('trips')
                  .select('title')
                  .eq('id', row.trip_id)
                  .single()
                  .then(({ data }) => {
                    if (data) {
                      setTripTitles((p) => ({ ...p, [row.trip_id!]: data.title }));
                    }
                  });
                return prev;
              });
            }
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    );

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markAllRead();
  };

  const describe = (n: NotificationData) => {
    const actorName = n.actorId ? actors[n.actorId]?.displayName : null;
    const tripTitle = n.tripId ? tripTitles[n.tripId] : null;

    switch (n.type) {
      case 'trip_joined':
        return t('tripJoined', { actor: actorName ?? t('someone'), trip: tripTitle ?? '' });
      case 'waitlist_promoted':
        return t('waitlistPromoted', { trip: tripTitle ?? '' });
      case 'new_message':
        return t('newMessage', { actor: actorName ?? t('someone'), trip: tripTitle ?? '' });
      case 'new_follower':
        return t('newFollower', { actor: actorName ?? t('someone') });
      default:
        return '';
    }
  };

  const linkFor = (n: NotificationData) => {
    if (n.tripId) return `/trips/${n.tripId}`;
    if (n.type === 'new_follower' && n.actorId) return `/users/${n.actorId}`;
    return null;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('title')}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          <Bell size={20} weight="regular" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-forest-600 ring-2 ring-neutral-50 dark:ring-neutral-950" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
          {t('title')}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {t('empty')}
            </p>
          ) : (
            notifications.map((n) => {
              const actor = n.actorId ? actors[n.actorId] : undefined;
              const content = (
                <div
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900',
                    !n.readAt && 'bg-forest-50/60 dark:bg-forest-950/30'
                  )}
                >
                  <Avatar
                    src={actor?.avatarUrl ?? undefined}
                    fallback={actor?.displayName ?? undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">
                      {describe(n)}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
                      {relativeTime(n.createdAt, locale)}
                    </p>
                  </div>
                </div>
              );

              const href = linkFor(n);
              return href ? (
                <Link key={n.id} href={href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
