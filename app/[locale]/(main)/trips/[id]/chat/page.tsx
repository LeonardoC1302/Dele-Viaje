import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatRoom, type ChatMessage, type ChatProfile } from '@/components/chat/chat-room';

export default async function TripChatPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations('chat');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('id, title, owner_id')
    .eq('id', id)
    .single();

  if (!trip) {
    notFound();
  }

  const isOrganizer = user.id === trip.owner_id;

  const { data: myAttendance } = await supabase
    .from('attendees')
    .select('status')
    .eq('trip_id', trip.id)
    .eq('profile_id', user.id)
    .maybeSingle();

  const isParticipant =
    isOrganizer ||
    myAttendance?.status === 'confirmed' ||
    myAttendance?.status === 'waitlisted';

  if (!isParticipant) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 text-center dark:bg-neutral-950">
        <p className="text-neutral-600 dark:text-neutral-400">
          {t('notAllowed')}
        </p>
      </main>
    );
  }

  const { data: messageRows } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at, deleted_at, edited_at, kind, event_type, actor_id')
    .eq('trip_id', trip.id)
    .order('created_at', { ascending: true })
    .limit(200);

  const messages: ChatMessage[] = (messageRows ?? []).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    editedAt: row.edited_at,
    kind: row.kind as 'user' | 'system',
    eventType: row.event_type as 'joined' | 'left' | 'promoted' | null,
    actorId: row.actor_id,
  }));

  const profileIds = Array.from(
    new Set(messages.flatMap((m) => [m.senderId, m.actorId].filter((v): v is string => !!v)))
  );
  const profiles: Record<string, ChatProfile> = {};

  if (profileIds.length > 0) {
    const { data: profileRows } = await supabase
      .rpc('profiles_public')
      .in('id', profileIds);

    for (const row of (profileRows ?? []) as {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    }[]) {
      profiles[row.id] = {
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      };
    }
  }

  const canSend = isOrganizer || myAttendance?.status === 'confirmed';

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8">
        <Link
          href={`/trips/${trip.id}`}
          className="text-sm font-medium text-forest-600 hover:underline dark:text-forest-400"
        >
          &larr; {t('backToTrip')}
        </Link>

        <h1 className="mt-4 text-xl font-bold text-neutral-900 dark:text-neutral-50">
          {trip.title}
        </h1>

        <div className="mt-4">
          <ChatRoom
            tripId={trip.id}
            currentUserId={user.id}
            canSend={canSend}
            isOrganizer={isOrganizer}
            initialMessages={messages}
            profiles={profiles}
          />
        </div>
      </div>
    </main>
  );
}
