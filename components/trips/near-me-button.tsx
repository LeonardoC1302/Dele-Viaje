'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NavigationArrow } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { chipClasses } from '@/components/ui/chip';

// A plain <Link> (like the category/verified chips) can't work here —
// this needs an async browser geolocation prompt to resolve *before*
// navigating anywhere, not just a different URL.
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
        aria-pressed={active}
        className={chipClasses({ active })}
      >
        <NavigationArrow size={15} weight={active ? 'fill' : 'regular'} />
        {loading ? t('nearMeLoading') : t('nearMeTab')}
      </button>
      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
