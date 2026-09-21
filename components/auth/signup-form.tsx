'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { signup } from '@/app/actions/auth';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/auth/google-button';
import { AuthPanel, AuthDivider } from '@/components/auth/auth-panel';

export function SignupForm() {
  const t = useTranslations('auth');
  const tSignup = useTranslations('auth.signup');
  const [state, action, pending] = useActionState(signup, undefined);
  // Controlled for the same reason as the login form — React resets the
  // form after the action, so an uncontrolled field loses its value on
  // every validation error.
  const [email, setEmail] = useState('');

  return (
    <AuthPanel
      title={tSignup('title')}
      subtitle={tSignup('subtitle')}
      footer={
        <>
          {tSignup('haveAccount')}{' '}
          <Link href="/login" className="link font-semibold">
            {tSignup('logIn')}
          </Link>
        </>
      }
    >
      <div className="mt-6">
        <GoogleButton />
      </div>

      <AuthDivider label={t('or')} />

      <form action={action} className="flex flex-col gap-4">
        <Input
          type="email"
          name="email"
          autoComplete="email"
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
          autoComplete="new-password"
          label={tSignup('passwordLabel')}
          helperText={tSignup('passwordHelper')}
          required
          error={!!state?.errors?.password}
          errorText={state?.errors?.password?.[0]}
        />
        <Input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          label={tSignup('confirmPasswordLabel')}
          required
          error={!!state?.errors?.confirmPassword}
          errorText={state?.errors?.confirmPassword?.[0]}
        />

        {state?.message && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" isLoading={pending} className="mt-2">
          {tSignup('submit')}
        </Button>
      </form>
    </AuthPanel>
  );
}
