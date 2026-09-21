'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { AuthPanel } from '@/components/auth/auth-panel';
import { chipClasses } from '@/components/ui/chip';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { CATEGORY_ICONS } from '@/lib/constants/category-visuals';
import { extractErrorMessage } from '@/lib/format-validation-error';

type Status = 'idle' | 'loading' | 'error';

export function OnboardingForm() {
  const t = useTranslations('auth.onboarding');
  const tCategories = useTranslations('categories');
  const currentLocale = useLocale();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [locale, setLocale] = useState<'es' | 'en'>(currentLocale === 'en' ? 'en' : 'es');
  const [categoryPrefs, setCategoryPrefs] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setCategoryPrefs((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
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
    <AuthPanel
      title={t('title')}
      subtitle={t('subtitle')}
      className="max-w-[30rem]"
    >
      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-6">
        <Input
          label={t('displayNameLabel')}
          placeholder={t('displayNamePlaceholder')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
        />

        <fieldset>
          <legend className="micro-label mb-2.5">{t('languageLabel')}</legend>
          <div className="flex gap-2">
            {(['es', 'en'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocale(option)}
                aria-pressed={locale === option}
                className={chipClasses({ active: locale === option })}
              >
                {option === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="micro-label mb-1.5">{t('categoriesTitle')}</legend>
          <p className="mb-3 text-xs text-sand-500 dark:text-sand-400">
            {t('categoriesSubtitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((key) => {
              const active = categoryPrefs.includes(key);
              const Icon = CATEGORY_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  aria-pressed={active}
                  className={chipClasses({ active })}
                >
                  <Icon size={15} weight={active ? 'fill' : 'regular'} />
                  {tCategories(key)}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={status === 'loading'}
          disabled={displayName.trim().length < 2}
        >
          {t('continue')}
        </Button>
      </form>
    </AuthPanel>
  );
}
