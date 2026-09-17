'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { signup } from '@/app/actions/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/auth/google-button';

export function SignupForm() {
  const t = useTranslations('auth');
  const tSignup = useTranslations('auth.signup');
  const [state, action, pending] = useActionState(signup, undefined);
  // Controlled so it survives React's automatic form reset after the action
  // runs (which otherwise clears every field, even on a validation error).
  const [email, setEmail] = useState('');

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {tSignup('title')}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {tSignup('subtitle')}
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
          label={tSignup('emailLabel')}
          placeholder={tSignup('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={!!state?.errors?.email}
          errorText={state?.errors?.email?.[0]}
        />
        <Input
          type="password"
          name="password"
          label={tSignup('passwordLabel')}
          helperText={tSignup('passwordHelper')}
          required
          error={!!state?.errors?.password}
          errorText={state?.errors?.password?.[0]}
        />
        <Input
          type="password"
          name="confirmPassword"
          label={tSignup('confirmPasswordLabel')}
          required
          error={!!state?.errors?.confirmPassword}
          errorText={state?.errors?.confirmPassword?.[0]}
        />

        {state?.message && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.message}
          </p>
        )}

        <Button type="submit" size="lg" isLoading={pending} className="mt-2">
          {tSignup('submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        {tSignup('haveAccount')}{' '}
        <Link
          href="/login"
          className="font-medium text-forest-600 dark:text-forest-400"
        >
          {tSignup('logIn')}
        </Link>
      </p>
    </div>
  );
}
