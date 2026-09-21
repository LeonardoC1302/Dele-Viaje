'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { login } from '@/app/actions/auth';
import { Input } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/auth/google-button';
import { AuthPanel, AuthDivider } from '@/components/auth/auth-panel';

export function LoginForm() {
  const t = useTranslations('auth');
  const tLogin = useTranslations('auth.login');
  const [state, action, pending] = useActionState(login, undefined);
  // Controlled so it survives React's automatic form reset after the
  // action runs (which otherwise clears every field, even on a failed
  // login — you'd retype your address after every typo'd password).
  const [email, setEmail] = useState('');

  return (
    <AuthPanel
      title={tLogin('title')}
      subtitle={tLogin('subtitle')}
      footer={
        <>
          {tLogin('noAccount')}{' '}
          <Link href="/signup" className="link font-semibold">
            {tLogin('createAccount')}
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
          autoComplete="current-password"
          label={tLogin('passwordLabel')}
          required
          error={!!state?.errors?.password}
          errorText={state?.errors?.password?.[0]}
        />

        {state?.message && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {state.message}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" isLoading={pending} className="mt-2">
          {tLogin('submit')}
        </Button>
      </form>
    </AuthPanel>
  );
}
