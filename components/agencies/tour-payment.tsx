'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, UploadSimple } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface TourPaymentProps {
  attendeeId: string;
  sinpePhone: string | null;
  paymentStatus: string;
}

// Manual SINPE Móvil evidence flow (the v1.5 stage the PRD describes): the
// agency's SINPE phone is shown here, the buyer pays bank-to-bank on their
// own banking app (free, instant, no processor), then uploads a screenshot
// as evidence. submit_payment_evidence() (migration 0026) is a SECURITY
// DEFINER RPC rather than a direct attendees update — payment_status/
// payment_evidence_path can't go through a normal column grant the way an
// agency's profile fields can, since a buyer marking their own payment and
// an agency confirming/rejecting it need different column access under
// the same shared `authenticated` DB role.
export function TourPayment({ attendeeId, sinpePhone, paymentStatus: initialStatus }: TourPaymentProps) {
  const t = useTranslations('agencies');
  const [supabase] = useState(() => createClient());
  const [paymentStatus, setPaymentStatus] = useState(initialStatus);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!sinpePhone) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${attendeeId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('payment-evidence').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      setUploading(false);
      setError(t('paymentUploadError'));
      return;
    }

    const { error: rpcError } = await supabase.rpc('submit_payment_evidence', {
      p_attendee_id: attendeeId,
      p_storage_path: path,
    });

    setUploading(false);

    if (rpcError) {
      setError(t('paymentUploadError'));
      return;
    }

    setPaymentStatus('pending');
  };

  if (paymentStatus === 'paid') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-forest-50 p-3 text-sm text-forest-700 dark:bg-forest-600/10 dark:text-forest-400">
        <CheckCircle size={18} weight="fill" />
        {t('paymentConfirmedNotice')}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('paymentTitle')}</h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('paymentHelper')}</p>

      <div className="mt-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('paymentSinpeLabel')}</p>
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{sinpePhone}</p>
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {paymentStatus === 'pending' && (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{t('paymentPendingNotice')}</p>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <div className="mt-3">
        <Button
          size={paymentStatus === 'pending' ? 'xs' : 'sm'}
          variant={paymentStatus === 'pending' ? 'ghost' : 'secondary'}
          isLoading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadSimple size={14} weight="regular" strokeWidth={1.5} />
          {paymentStatus === 'pending' ? t('paymentReupload') : t('paymentUpload')}
        </Button>
      </div>
    </div>
  );
}
