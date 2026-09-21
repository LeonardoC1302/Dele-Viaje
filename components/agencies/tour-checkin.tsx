'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Circle, Receipt, ClipboardText } from '@phosphor-icons/react';
import { PanelHeading } from '@/components/ui/panel-heading';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface CheckinAttendeeData {
  attendeeId: string;
  profileId: string;
  displayName: string | null;
  attendance: string | null;
  paymentStatus: string;
  paymentEvidencePath: string | null;
}

// Manual check-in — a roster with a tap-to-toggle button, not a camera/QR
// scanner. The mechanic a QR scan buys you (confirm the right person
// without typing a name) doesn't add much at the scale a staff member
// manually running a tour departure list already handles fine, and it
// would mean pulling in a new scanning-library dependency for that.
// attendees.attendance already existed (migration 0004) — this is its
// first real write path, gated by RLS on host-team-or-admin (migration
// 0025, since the original attendees-manage policy was organizer-only and
// didn't cover agency staff).
//
// Also doubles as the payment review roster (migration 0026, SINPE Móvil
// flow) — same attendee list either way, no reason to split it into two
// separate cards the staff would have to cross-reference against each
// other.
export function TourCheckin({
  tripId,
  initialAttendees,
}: {
  tripId: string;
  initialAttendees: CheckinAttendeeData[];
}) {
  const t = useTranslations('agencies');
  const [supabase] = useState(() => createClient());
  const [attendees, setAttendees] = useState(initialAttendees);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (attendeeId: string, currentlyAttended: boolean) => {
    setBusyId(attendeeId);
    setError(null);
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ attendance: currentlyAttended ? null : 'attended' })
      .eq('id', attendeeId);
    setBusyId(null);

    if (updateError) {
      setError(t('checkinError'));
      return;
    }

    setAttendees((prev) =>
      prev.map((a) =>
        a.attendeeId === attendeeId ? { ...a, attendance: currentlyAttended ? null : 'attended' } : a
      )
    );
  };

  const viewEvidence = async (path: string) => {
    setError(null);
    const { data, error: signError } = await supabase.storage.from('payment-evidence').createSignedUrl(path, 60);
    if (signError || !data) {
      setError(t('paymentEvidenceError'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const confirmPayment = async (attendeeId: string) => {
    setBusyId(attendeeId);
    setError(null);
    const { error: rpcError } = await supabase.rpc('confirm_payment', { p_attendee_id: attendeeId });
    setBusyId(null);
    if (rpcError) {
      setError(t('paymentActionError'));
      return;
    }
    setAttendees((prev) => prev.map((a) => (a.attendeeId === attendeeId ? { ...a, paymentStatus: 'paid' } : a)));
  };

  const rejectPayment = async (attendeeId: string) => {
    setBusyId(attendeeId);
    setError(null);
    const { error: rpcError } = await supabase.rpc('reject_payment', { p_attendee_id: attendeeId });
    setBusyId(null);
    if (rpcError) {
      setError(t('paymentActionError'));
      return;
    }
    setAttendees((prev) =>
      prev.map((a) => (a.attendeeId === attendeeId ? { ...a, paymentStatus: 'none', paymentEvidencePath: null } : a))
    );
  };

  const attendedCount = attendees.filter((a) => a.attendance === 'attended').length;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between">
        <PanelHeading icon={ClipboardText}>{t('checkinTitle')}</PanelHeading>
        <span className="text-xs text-sand-500 dark:text-sand-400">
          {t('checkinCount', { attended: attendedCount, total: attendees.length })}
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {attendees.length === 0 ? (
        <p className="mt-4 text-sm text-sand-500 dark:text-sand-400">{t('checkinEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {attendees.map((attendee) => {
            const attended = attendee.attendance === 'attended';
            return (
              <li
                key={attendee.attendeeId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-sand-200 p-2 dark:border-sand-800"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-sand-800 dark:text-sand-200">
                  {attendee.displayName ?? '—'}
                </span>

                {attendee.paymentStatus === 'paid' && (
                  <Badge variant="success">{t('paymentStatus_paid')}</Badge>
                )}
                {attendee.paymentStatus === 'pending' && (
                  <>
                    <Badge variant="warning">{t('paymentStatus_pending')}</Badge>
                    {attendee.paymentEvidencePath && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => viewEvidence(attendee.paymentEvidencePath!)}
                        aria-label={t('paymentViewEvidence')}
                        title={t('paymentViewEvidence')}
                      >
                        <Receipt size={14} weight="regular" strokeWidth={1.5} />
                      </Button>
                    )}
                    <Button
                      size="xs"
                      isLoading={busyId === attendee.attendeeId}
                      onClick={() => confirmPayment(attendee.attendeeId)}
                    >
                      {t('paymentConfirm')}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      isLoading={busyId === attendee.attendeeId}
                      onClick={() => rejectPayment(attendee.attendeeId)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {t('paymentReject')}
                    </Button>
                  </>
                )}
                {attendee.paymentStatus === 'none' && (
                  <Badge variant="secondary">{t('paymentStatus_none')}</Badge>
                )}

                <Button
                  size="xs"
                  variant={attended ? 'secondary' : 'outline'}
                  isLoading={busyId === attendee.attendeeId}
                  onClick={() => toggle(attendee.attendeeId, attended)}
                >
                  {attended ? (
                    <CheckCircle size={14} weight="fill" className="text-forest-600 dark:text-forest-400" />
                  ) : (
                    <Circle size={14} weight="regular" strokeWidth={1.5} />
                  )}
                  {attended ? t('checkinDone') : t('checkinMark')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
