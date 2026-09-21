'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SealCheck } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { PanelHeading } from '@/components/ui/panel-heading';

export interface AllBadgeData {
  code: string;
  labelEs: string;
  labelEn: string;
}

interface BadgeManagerProps {
  profileId: string;
  allBadges: AllBadgeData[];
  grantedCodes: string[];
}

export function BadgeManager({ profileId, allBadges, grantedCodes }: BadgeManagerProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [granted, setGranted] = useState(new Set(grantedCodes));
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (code: string) => {
    setBusyCode(code);
    setError(null);
    const isGranted = granted.has(code);

    const { error: dbError } = isGranted
      ? await supabase
          .from('user_badges')
          .delete()
          .eq('profile_id', profileId)
          .eq('code', code)
      : await supabase.from('user_badges').insert({ profile_id: profileId, code });

    setBusyCode(null);

    if (dbError) {
      setError(t('actionError'));
      return;
    }

    setGranted((prev) => {
      const next = new Set(prev);
      if (isGranted) next.delete(code);
      else next.add(code);
      return next;
    });
    router.refresh();
  };

  return (
    <div className="mt-6 rounded-md border border-dashed border-sand-300 p-4 dark:border-sand-700">
      <PanelHeading as="h3" icon={SealCheck}>{t('manageBadges')}</PanelHeading>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {allBadges.map((badge) => {
          const isGranted = granted.has(badge.code);
          return (
            <Button
              key={badge.code}
              size="xs"
              variant={isGranted ? 'primary' : 'secondary'}
              isLoading={busyCode === badge.code}
              onClick={() => toggle(badge.code)}
            >
              {locale === 'en' ? badge.labelEn : badge.labelEs}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
