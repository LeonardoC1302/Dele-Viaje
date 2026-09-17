'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { login } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/auth/google-button';

export function LoginForm() {
  const t = useTranslations('auth');
  const tLogin = useTranslations('auth.login');
  const [state, action, pending] = useActionState(login, undefined);
  // Controlled so it survives React's automatic form reset after the action
  // runs (which otherwise clears every field, even on a failed login).
  const [email, setEmail] = useState('');

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {tLogin('title')}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {tLogin('subtitle')}
      </p>

      <div className="mt-6">
        <GoogleButton />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        <span className="text-xs text-neutral-500">{t('or')}</span>
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Input
          type="email"
          name="email"
          label={tLogin('emailLabel')}
          placeholder={tLogin('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={!!state?.errors?.email}
          errorText={state?.errors?.email?.[0]}
        />
        <Input
          type="password"
          name="password"
          label={tLogin('passwordLabel')}
          required
          error={!!state?.errors?.password}
          errorText={state?.errors?.password?.[0]}
        />

        {state?.message && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.message}
          </p>
        )}

        <Button type="submit" size="lg" isLoading={pending} className="mt-2">
          {tLogin('submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        {tLogin('noAccount')}{' '}
        <Link
          href="/signup"
          className="font-medium text-forest-600 dark:text-forest-400"
        >
          {tLogin('createAccount')}
        </Link>
      </p>
    </div>
  );
}
