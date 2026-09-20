'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Trash, PencilSimple, Check, X } from '@phosphor-icons/react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ReportButton } from '@/components/reports/report-button';

export type ChatEventType = 'joined' | 'left' | 'promoted';

export interface ChatMessage {
  id: string;
  senderId: string | null;
  body: string | null;
  createdAt: string;
  deletedAt: string | null;
  editedAt: string | null;
  kind: 'user' | 'system';
  eventType: ChatEventType | null;
  actorId: string | null;
}

export interface ChatProfile {
  displayName: string | null;
  avatarUrl: string | null;
}

interface ChatRoomProps {
  tripId: string;
  currentUserId: string;
  canSend: boolean;
  isOrganizer: boolean;
  initialMessages: ChatMessage[];
  profiles: Record<string, ChatProfile>;
}

export function ChatRoom({
  tripId,
  currentUserId,
  canSend,
  isOrganizer,
  initialMessages,
  profiles,
}: ChatRoomProps) {
  const t = useTranslations('chat');
  const locale = useLocale();
  // One client for the component's lifetime. A fresh client per call (as
  // this previously did) races the realtime websocket against the async
  // session/auth attachment (supabase.realtime.setAuth()), so subscribing
  // immediately after creating a client can connect as anonymous and never
  // receive RLS-protected postgres_changes events.
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState(initialMessages);
  const [profileCache, setProfileCache] = useState<Record<string, ChatProfile>>({});
  const allProfiles = { ...profiles, ...profileCache };
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Make sure the client has a resolved session (and has therefore
    // called realtime.setAuth()) before opening the channel.
    supabase.auth.getSession().then(() => {
      if (cancelled) return;

      channel = supabase
        .channel(`trip-chat:${tripId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `trip_id=eq.${tripId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              sender_id: string | null;
              body: string | null;
              created_at: string;
              deleted_at: string | null;
              edited_at: string | null;
              kind: 'user' | 'system';
              event_type: ChatEventType | null;
              actor_id: string | null;
            };
            setMessages((prev) =>
              prev.some((m) => m.id === row.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: row.id,
                      senderId: row.sender_id,
                      body: row.body,
                      createdAt: row.created_at,
                      deletedAt: row.deleted_at,
                      editedAt: row.edited_at,
                      kind: row.kind,
                      eventType: row.event_type,
                      actorId: row.actor_id,
                    },
                  ]
            );

            const missingProfileId = row.sender_id ?? row.actor_id;
            if (missingProfileId) {
              setProfileCache((prev) => {
                if (prev[missingProfileId]) return prev;
                supabase
                  .rpc('profiles_public')
                  .eq('id', missingProfileId)
                  .single()
                  .then(({ data }) => {
                    const p = data as { display_name: string | null; avatar_url: string | null } | null;
                    if (p) {
                      setProfileCache((cur) => ({
                        ...cur,
                        [missingProfileId]: { displayName: p.display_name, avatarUrl: p.avatar_url },
                      }));
                    }
                  });
                return prev;
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `trip_id=eq.${tripId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              body: string | null;
              deleted_at: string | null;
              edited_at: string | null;
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id
                  ? { ...m, body: row.body, deletedAt: row.deleted_at, editedAt: row.edited_at }
                  : m
              )
            );
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tripId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({ trip_id: tripId, sender_id: currentUserId, body: trimmed })
      .select('id, sender_id, body, created_at, deleted_at, edited_at')
      .single();

    if (insertError) {
      console.error('Failed to send message:', insertError);
      setError(`${t('sendError')} (${insertError.message})`);
    } else {
      // Optimistic append so the sender sees it immediately; the INSERT
      // realtime handler dedupes by id if the event also arrives.
      setMessages((prev) =>
        prev.some((m) => m.id === inserted.id)
          ? prev
          : [
              ...prev,
              {
                id: inserted.id,
                senderId: inserted.sender_id,
                body: inserted.body,
                createdAt: inserted.created_at,
                deletedAt: inserted.deleted_at,
                editedAt: inserted.edited_at,
                kind: 'user' as const,
                eventType: null,
                actorId: null,
              },
            ]
      );
      setBody('');
    }
    setSending(false);
  };

  const handleDelete = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (message: ChatMessage) => {
    setEditingId(message.id);
    setEditingBody(message.body ?? '');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingBody('');
  };

  const saveEdit = async () => {
    const trimmed = editingBody.trim();
    if (!editingId || !trimmed) return;
    setEditError(null);

    const { error: editErr } = await supabase.rpc('edit_message', {
      p_message_id: editingId,
      p_body: trimmed,
    });

    if (editErr) {
      setEditError(t('editError'));
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === editingId ? { ...m, body: trimmed, editedAt: new Date().toISOString() } : m))
    );
    setEditingId(null);
    setEditingBody('');
  };

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {t('empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((message) => {
              if (message.kind === 'system') {
                const actor = message.actorId ? allProfiles[message.actorId] : undefined;
                const name = actor?.displayName ?? t('someone');
                const text =
                  message.eventType === 'joined'
                    ? t('eventJoined', { name })
                    : message.eventType === 'promoted'
                      ? t('eventPromoted', { name })
                      : t('eventLeft', { name });

                return (
                  <li key={message.id} className="flex justify-center">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {text} · {timeFormatter.format(new Date(message.createdAt))}
                    </span>
                  </li>
                );
              }

              const profile = message.senderId ? allProfiles[message.senderId] : undefined;
              const isOwn = message.senderId === currentUserId;
              const canDelete = isOwn || isOrganizer;

              return (
                <li key={message.id} className="flex items-start gap-3">
                  <Link href={`/users/${message.senderId}`} className="shrink-0">
                    <Avatar
                      src={profile?.avatarUrl ?? undefined}
                      alt={profile?.displayName ?? ''}
                      fallback={profile?.displayName ?? undefined}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/users/${message.senderId}`}
                        className="text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {profile?.displayName ?? '—'}
                      </Link>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {timeFormatter.format(new Date(message.createdAt))}
                      </span>
                    </div>
                    {message.deletedAt ? (
                      <p className="text-sm italic text-neutral-400 dark:text-neutral-600">
                        {t('deletedMessage')}
                      </p>
                    ) : editingId === message.id ? (
                      <div className="mt-1 flex flex-col gap-2">
                        <textarea
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          maxLength={2000}
                          rows={2}
                          autoFocus
                          className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 dark:border-neutral-700 dark:bg-neutral-950"
                        />
                        {editError && (
                          <p className="text-xs text-red-600 dark:text-red-400">{editError}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            aria-label={t('editSave')}
                            className="flex items-center gap-1 text-xs font-medium text-forest-600 hover:text-forest-700 dark:text-forest-400"
                          >
                            <Check size={14} weight="bold" />
                            {t('editSave')}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            aria-label={t('editCancel')}
                            className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                          >
                            <X size={14} weight="bold" />
                            {t('editCancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300">
                        {message.body}
                        {message.editedAt && (
                          <span className="ml-1.5 text-xs text-neutral-400 dark:text-neutral-600">
                            {t('editedTag')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {!message.deletedAt && editingId !== message.id && (
                    <div className="flex shrink-0 items-center gap-2">
                      {!isOwn && (
                        <ReportButton
                          targetType="message"
                          targetId={message.id}
                          className="text-neutral-300 hover:text-red-600 dark:text-neutral-600 dark:hover:text-red-400"
                          label=""
                          ariaLabel={t('reportMessage')}
                        />
                      )}
                      {isOwn && (
                        <button
                          type="button"
                          onClick={() => startEdit(message)}
                          aria-label={t('editMessage')}
                          className="text-neutral-300 hover:text-forest-600 dark:text-neutral-600 dark:hover:text-forest-400"
                        >
                          <PencilSimple size={16} weight="regular" strokeWidth={1.5} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(message.id)}
                          aria-label={t('deleteMessage')}
                          className="text-neutral-300 hover:text-red-600 dark:text-neutral-600 dark:hover:text-red-400"
                        >
                          <Trash size={16} weight="regular" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        {canSend ? (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('placeholder')}
              maxLength={2000}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 dark:border-neutral-700 dark:bg-neutral-950 dark:placeholder:text-neutral-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" size="md" isLoading={sending} disabled={!body.trim()}>
              {t('send')}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('readOnlyNote')}
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
