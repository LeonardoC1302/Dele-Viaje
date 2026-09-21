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
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
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
    // Sits above the mobile rail (bottom-24), never over it.
    <div className="fixed inset-x-4 bottom-24 z-50 flex items-center gap-3 rounded-md border border-sand-200 bg-[color:var(--raised)] px-4 py-3 text-sm text-sand-700 shadow-pop dark:border-sand-800 dark:text-sand-300">
      <ShareFat size={20} className="shrink-0 text-dawn-600 dark:text-dawn-400" />
      <p className="flex-1 leading-snug">{t('installHint')}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dismiss')}
        className="shrink-0 rounded-full p-1 text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-700 dark:hover:bg-sand-800 dark:hover:text-sand-200"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}
