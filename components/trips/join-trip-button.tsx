'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SignOut } from '@phosphor-icons/react';
import { useRouter, Link } from '@/i18n/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export type AttendeeStatus = 'confirmed' | 'waitlisted' | null;

interface JoinTripButtonProps {
  tripId: string;
  initialStatus: AttendeeStatus;
  isAuthenticated: boolean;
  isOwner: boolean;
  isFull: boolean;
  hasStarted: boolean;
  waitlistPosition?: number | null;
  /** True when the trip carries at least one danger-level advisory. */
  requiresAck?: boolean;
}

export function JoinTripButton({
  tripId,
  initialStatus,
  isAuthenticated,
  isOwner,
  isFull,
  hasStarted,
  waitlistPosition,
  requiresAck = false,
}: JoinTripButtonProps) {
  const t = useTranslations('trips');
  const tAdvisories = useTranslations('advisories');
  const router = useRouter();
  const [status, setStatus] = useState<AttendeeStatus>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/join`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.code === 'ERR_ACCOUNT_NOT_ACTIVE'
          ? t('accountNotActive')
          : t('joinError')
      );
      setLoading(false);
      return;
    }
    const body = await res.json();

    if (requiresAck) {
      // Fire-and-forget: the join succeeded and must not be rolled back
      // if stamping the acknowledgement fails. ack_trip_advisories() is
      // idempotent, so a retry on the next join attempt is harmless.
      await fetch(`/api/trips/${tripId}/ack-advisories`, { method: 'POST' }).catch(() => {});
    }

    setStatus(body.status);
    setLoading(false);
    router.refresh();
  };

  const handleLeave = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/leave`, { method: 'POST' });
    if (!res.ok) {
      setError(t('joinError'));
      setLoading(false);
      return;
    }
    setStatus(null);
    setLoading(false);
    setConfirmOpen(false);
    router.refresh();
  };

  if (isOwner) {
    return (
      <p className="text-sm font-medium text-sand-600 dark:text-sand-400">
        {t('youAreOrganizer')}
      </p>
    );
  }

  if (!isAuthenticated) {
    // A signed-out visitor is the one most likely to act, so this is a
    // real primary button, not a text link. It rendered as a plain
    // sentence before, which left the trip page with no visible call to
    // action at all for exactly the audience the page exists to convert.
    return (
      <Link href="/login" className={buttonVariants({ variant: 'primary' })}>
        {t('loginToJoin')}
      </Link>
    );
  }

  if (hasStarted && !status) {
    return (
      <p className="text-sm text-sand-500 dark:text-sand-400">
        {t('tripStarted')}
      </p>
    );
  }

  if (status === 'confirmed' || status === 'waitlisted') {
    return (
      <>
        <div className="flex flex-col gap-2">
          <p
            className={
              status === 'confirmed'
                ? 'text-sm font-medium text-forest-600 dark:text-forest-400'
                : 'text-sm font-medium text-sand-600 dark:text-sand-400'
            }
          >
            {status === 'confirmed'
              ? t('youAreGoing')
              : waitlistPosition
                ? t('youAreWaitlistedAt', { position: waitlistPosition })
                : t('youAreWaitlisted')}
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute bottom-6 right-6 flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <SignOut size={16} weight="regular" strokeWidth={1.5} />
              {status === 'confirmed' ? t('leave') : t('leaveWaitlist')}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t('confirmLeaveTitle')}</DialogTitle>
            <DialogDescription>
              {status === 'confirmed'
                ? t('confirmLeaveBody')
                : t('confirmLeaveWaitlistBody')}
            </DialogDescription>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setConfirmOpen(false)}
              >
                {t('confirmLeaveCancel')}
              </Button>
              <Button
                variant="destructive"
                size="md"
                isLoading={loading}
                onClick={handleLeave}
              >
                {t('confirmLeaveConfirm')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      {/* When the host declared a danger-level advisory, joining asks for
          an explicit confirmation first. The checkbox is a UX gate, not a
          legal waiver — but the timestamp it records (attendees.
          advisories_ack_at, via ack_trip_advisories()) is real evidence
          the warning was shown and confirmed, which is what an agency
          needs when a buyer says nobody told them. */}
      {requiresAck && (
        <label className="flex max-w-[44ch] cursor-pointer items-start gap-2.5 text-sm text-sand-700 dark:text-sand-300">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-sand-400 accent-forest-600 dark:border-sand-600"
          />
          <span className="leading-snug">{tAdvisories('ackConfirm')}</span>
        </label>
      )}

      <Button
        size="md"
        variant="primary"
        isLoading={loading}
        disabled={requiresAck && !acknowledged}
        onClick={handleJoin}
      >
        {isFull ? t('joinWaitlist') : t('join')}
      </Button>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
