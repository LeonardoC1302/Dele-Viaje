'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NavigationArrow } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// A plain <Link> (like the category/verified pills) can't work here — this
// needs an async browser geolocation prompt to resolve *before* navigating
// anywhere, not just a different URL.
export function NearMeButton({ active, category }: { active: boolean; category?: string }) {
  const t = useTranslations('feed');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (active) {
      router.push({ pathname: '/feed', query: category ? { category } : {} });
      return;
    }

    if (!navigator.geolocation) {
      setError(t('nearMeUnsupported'));
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        router.push({
          pathname: '/feed',
          query: {
            ...(category ? { category } : {}),
            lat: String(position.coords.latitude),
            lng: String(position.coords.longitude),
          },
        });
      },
      () => {
        setLoading(false);
        setError(t('nearMeDenied'));
      },
      { timeout: 10_000 }
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          active
            ? 'border-forest-600 bg-forest-600 text-white'
            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
        )}
      >
        <NavigationArrow size={14} weight={active ? 'fill' : 'regular'} strokeWidth={1.5} />
        {loading ? t('nearMeLoading') : t('nearMeTab')}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
