'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export interface ReportTicketData {
  id: string;
  reporterId: string;
  reporterName: string | null;
  targetType: 'trip' | 'user' | 'message';
  targetId: string;
  reason: string;
  description: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  adminNote: string | null;
  createdAt: string;
  targetUser: { displayName: string | null; role: string; status: string } | null;
  targetTrip: { title: string; status: string } | null;
  targetMessage: { tripId: string; body: string; senderId: string; deletedAt: string | null } | null;
}

const STATUS_VARIANT: Record<ReportTicketData['status'], 'default' | 'success' | 'warning' | 'outline'> = {
  open: 'warning',
  investigating: 'default',
  resolved: 'success',
  dismissed: 'outline',
};

export function ReportQueue({ tickets: initialTickets }: { tickets: ReportTicketData[] }) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [tickets, setTickets] = useState(initialTickets);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  const updateStatus = async (id: string, status: ReportTicketData['status']) => {
    setBusyId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from('report_tickets')
      .update({ status, resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null })
      .eq('id', id);
    setBusyId(null);
    if (updateError) {
      setError(t('actionError'));
      return;
    }
    setTickets((prev) => prev.map((tk) => (tk.id === id ? { ...tk, status } : tk)));
  };

  const saveNote = async (id: string) => {
    const note = noteDrafts[id] ?? '';
    setBusyId(id);
    setError(null);
    const { error: updateError } = await supabase
      .from('report_tickets')
      .update({ admin_note: note || null })
      .eq('id', id);
    setBusyId(null);
    if (updateError) {
      setError(t('actionError'));
      return;
    }
    setTickets((prev) => prev.map((tk) => (tk.id === id ? { ...tk, adminNote: note || null } : tk)));
  };

  const setUserStatus = async (ticketId: string, userId: string, status: 'active' | 'banned' | 'suspended') => {
    setBusyId(ticketId);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId);
    setBusyId(null);
    if (updateError) {
      setError(t('actionError'));
      return;
    }
    setTickets((prev) =>
      prev.map((tk) =>
        tk.targetType === 'user' && tk.targetId === userId && tk.targetUser
          ? { ...tk, targetUser: { ...tk.targetUser, status } }
          : tk
      )
    );
  };

  if (tickets.length === 0) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        {t('reportsEmpty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[ticket.status]}>
                {t(`status${ticket.status.charAt(0).toUpperCase()}${ticket.status.slice(1)}`)}
              </Badge>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {ticket.reason}
              </span>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {dateFormatter.format(new Date(ticket.createdAt))}
            </span>
          </div>

          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t('reportedBy', { name: ticket.reporterName ?? '—' })}
          </p>

          {ticket.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
              {ticket.description}
            </p>
          )}

          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-950">
            {ticket.targetType === 'trip' && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {t('targetTrip')}: {ticket.targetTrip?.title ?? ticket.targetId}
                </span>
                <Link
                  href={`/trips/${ticket.targetId}`}
                  className="text-forest-600 hover:underline dark:text-forest-400"
                >
                  {t('viewTarget')}
                </Link>
              </div>
            )}

            {ticket.targetType === 'user' && ticket.targetUser && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {t('targetUser')}: {ticket.targetUser.displayName ?? ticket.targetId} (
                  {ticket.targetUser.status})
                </span>
                <div className="flex gap-2">
                  {ticket.targetUser.status !== 'suspended' && (
                    <Button
                      size="xs"
                      variant="secondary"
                      isLoading={busyId === ticket.id}
                      onClick={() => setUserStatus(ticket.id, ticket.targetId, 'suspended')}
                    >
                      {t('suspendUser')}
                    </Button>
                  )}
                  {ticket.targetUser.status !== 'banned' && (
                    <Button
                      size="xs"
                      variant="destructive"
                      isLoading={busyId === ticket.id}
                      onClick={() => setUserStatus(ticket.id, ticket.targetId, 'banned')}
                    >
                      {t('banUser')}
                    </Button>
                  )}
                  {ticket.targetUser.status !== 'active' && (
                    <Button
                      size="xs"
                      variant="ghost"
                      isLoading={busyId === ticket.id}
                      onClick={() => setUserStatus(ticket.id, ticket.targetId, 'active')}
                    >
                      {t('reactivateUser')}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {ticket.targetType === 'message' && ticket.targetMessage && (
              <div className="flex flex-col gap-2">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {t('targetMessage')}:{' '}
                  {ticket.targetMessage.deletedAt ? (
                    <em>—</em>
                  ) : (
                    `"${ticket.targetMessage.body}"`
                  )}
                </span>
                {ticket.targetTrip && (
                  <Link
                    href={`/trips/${ticket.targetMessage.tripId}/chat`}
                    className="text-forest-600 hover:underline dark:text-forest-400"
                  >
                    {t('viewTarget')} — {ticket.targetTrip.title}
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ticket.status !== 'investigating' && (
              <Button
                size="xs"
                variant="secondary"
                isLoading={busyId === ticket.id}
                onClick={() => updateStatus(ticket.id, 'investigating')}
              >
                {t('markInvestigating')}
              </Button>
            )}
            {ticket.status !== 'resolved' && (
              <Button
                size="xs"
                variant="ghost"
                isLoading={busyId === ticket.id}
                onClick={() => updateStatus(ticket.id, 'resolved')}
              >
                {t('resolve')}
              </Button>
            )}
            {ticket.status !== 'dismissed' && (
              <Button
                size="xs"
                variant="ghost"
                isLoading={busyId === ticket.id}
                onClick={() => updateStatus(ticket.id, 'dismissed')}
              >
                {t('dismiss')}
              </Button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Textarea
              label={t('adminNoteLabel')}
              placeholder={t('adminNotePlaceholder')}
              value={noteDrafts[ticket.id] ?? ticket.adminNote ?? ''}
              onChange={(e) =>
                setNoteDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
              }
              className="min-h-16"
            />
            <Button
              size="xs"
              variant="secondary"
              className="self-start"
              isLoading={busyId === ticket.id}
              onClick={() => saveNote(ticket.id)}
            >
              {t('saveNote')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
