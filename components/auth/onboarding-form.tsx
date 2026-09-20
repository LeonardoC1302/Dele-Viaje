'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { extractErrorMessage } from '@/lib/format-validation-error';

type Status = 'idle' | 'loading' | 'error';

export function OnboardingForm() {
  const t = useTranslations('auth.onboarding');
  const tCategories = useTranslations('categories');
  const currentLocale = useLocale();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [locale, setLocale] = useState<'es' | 'en'>(
    currentLocale === 'en' ? 'en' : 'es'
  );
  const [categoryPrefs, setCategoryPrefs] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setCategoryPrefs((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    const res = await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, locale, categoryPrefs }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, t('genericError')));
      setStatus('error');
      return;
    }

    router.push('/', { locale });
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[440px] rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {t('title')}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {t('subtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Input
          label={t('displayNameLabel')}
          placeholder={t('displayNamePlaceholder')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
        />

        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t('languageLabel')}
          </p>
          <div className="mt-2 flex gap-2">
            {(['es', 'en'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  locale === option
                    ? 'border-forest-600 bg-forest-600 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                )}
              >
                {option === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t('categoriesTitle')}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('categoriesSubtitle')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((key) => {
              const active = categoryPrefs.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-forest-600 bg-forest-50 text-forest-700 dark:border-forest-400 dark:bg-forest-950 dark:text-forest-400'
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  )}
                >
                  {tCategories(key)}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          isLoading={status === 'loading'}
          disabled={displayName.trim().length < 2}
        >
          {t('continue')}
        </Button>
      </div>
    </form>
  );
}
