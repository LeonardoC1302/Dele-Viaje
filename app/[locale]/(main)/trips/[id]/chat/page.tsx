import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { BackLink } from '@/components/ui/back-link';
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
      <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10 text-center">
        <p className="text-sand-600 dark:text-sand-400">
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
    <main>
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-7 sm:py-10">
        {/* Was an ad-hoc forest link with a literal arrow entity — the
            same affordance, drawn differently from every other page. */}
        <BackLink href={`/trips/${trip.id}`} className="mb-0">
          {t('backToTrip')}
        </BackLink>

        <h1 className="mt-4 text-xl font-extrabold text-sand-900 dark:text-sand-50">
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
