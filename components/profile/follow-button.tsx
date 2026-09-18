'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

interface FollowButtonProps {
  profileId: string;
  initialFollowing: boolean;
  size?: 'sm' | 'md';
}

export function FollowButton({ profileId, initialFollowing, size = 'md' }: FollowButtonProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/follows/${profileId}`, {
      method: following ? 'DELETE' : 'POST',
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.code === 'ERR_ACCOUNT_NOT_ACTIVE'
          ? t('accountNotActive')
          : t('followError')
      );
      return;
    }

    setFollowing(!following);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size={size}
        variant={following ? 'secondary' : 'primary'}
        isLoading={loading}
        onClick={toggle}
      >
        {following ? t('unfollow') : t('follow')}
      </Button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
