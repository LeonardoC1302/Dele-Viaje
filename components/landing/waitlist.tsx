'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function Waitlist() {
  const t = useTranslations('waitlist');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    // TODO: wire to the real waitlist endpoint once it exists.
    await new Promise((resolve) => setTimeout(resolve, 500));
    setStatus('success');
  };

  return (
    <section id="waitlist" className="py-24">
      <div className="mx-auto max-w-[560px] px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl dark:text-neutral-100">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">
          {t('body')}
        </p>

        {status === 'success' ? (
          <p
            role="status"
            className="mt-8 rounded-lg bg-forest-50 px-4 py-3 text-sm font-medium text-forest-700 dark:bg-forest-950 dark:text-forest-400"
          >
            {t('success')}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row"
          >
            <div className="w-full flex-1">
              <Input
                type="email"
                placeholder={t('emailPlaceholder')}
                aria-label={t('emailLabel')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                error={status === 'error'}
                errorText={t('errorInvalidEmail')}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              isLoading={status === 'loading'}
              className="w-full sm:w-auto"
            >
              {t('submit')}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
