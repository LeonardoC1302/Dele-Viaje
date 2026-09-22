'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Prohibit } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Cancel-with-reason, for the host team.
 *
 * Distinct from `DeleteTripButton`, and the distinction matters: delete
 * erases the trip and its roster, cancel keeps both and tells everyone
 * why. Deleting used to be the only option, so a rained-out hike just
 * vanished from everyone's My Trips with no explanation.
 *
 * The reason is required (min 3 characters, enforced again in the route
 * and in `cancel_trip()`), because a cancellation with no reason is the
 * thing this feature exists to stop.
 */
export function CancelTripButton({ tripId }: { tripId: string }) {
  const t = useTranslations('trips');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/trips/${tripId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.code === 'ERR_RATE_LIMITED' ? t('rateLimited') : t('cancelError')
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Prohibit size={15} />
          {t('cancelTrip')}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelTripTitle')}</DialogTitle>
          <DialogDescription>{t('cancelTripBody')}</DialogDescription>
        </DialogHeader>

        <Textarea
          label={t('cancelReasonLabel')}
          placeholder={t('cancelReasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          required
          className="min-h-24"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('confirmLeaveCancel')}
          </Button>
          <Button
            variant="destructive"
            isLoading={loading}
            disabled={reason.trim().length < 3}
            onClick={submit}
          >
            {t('cancelTripConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
