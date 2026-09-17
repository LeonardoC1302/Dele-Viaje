'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, ShareFat } from '@phosphor-icons/react';

const DISMISS_KEY = 'dv-ios-install-hint-dismissed';

export function IosInstallHint() {
  const t = useTranslations('pwa');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';

    if (isIos && !isStandalone && !dismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on navigator/matchMedia/localStorage, unavailable during SSR so it can't be computed during render.
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private browsing or storage disabled; just hide for this session.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      <ShareFat
        size={20}
        weight="regular"
        strokeWidth={1.5}
        className="shrink-0 text-forest-600 dark:text-forest-400"
      />
      <p className="flex-1">{t('installHint')}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <X size={18} weight="regular" strokeWidth={1.5} />
      </button>
    </div>
  );
}
