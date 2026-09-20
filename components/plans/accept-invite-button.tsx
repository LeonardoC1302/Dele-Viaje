'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      setError(t('inviteAcceptError'));
      setLoading(false);
      return;
    }

    const { tripId } = await res.json();
    // A full navigation, not router.push()/refresh(): the trip you can now
    // see is gated by RLS on membership that only just became true (the
    // accept above is what created it). The client Router Cache can hold
    // an earlier not-found render for this exact path from before you
    // accepted (e.g. a previewed/typed link visited pre-join) — push()
    // + refresh() doesn't reliably invalidate that for a path you're
    // navigating to for the first time this render, so this forces a
    // fresh server request instead of risking a stale cached 404.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation, see comment above.
    window.location.href = `/${locale}/trips/${tripId}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" isLoading={loading} onClick={handleAccept}>
        {t('inviteAccept')}
      </Button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
