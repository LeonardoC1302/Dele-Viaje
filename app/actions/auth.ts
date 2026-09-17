'use server';

import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  loginSchema,
  signupSchema,
  type LoginState,
  type SignupState,
} from '@/lib/validators/auth';

async function redirectAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<never> {
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', user.id)
      .single();

    if (!profile?.onboarding_done) {
      return redirect({ href: '/onboarding', locale });
    }
  }

  return redirect({ href: '/', locale });
}

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    const t = await getTranslations('auth.login');
    return { message: t('invalidCredentials') };
  }

  await redirectAfterAuth(supabase);
}

export async function signup(
  _state: SignupState,
  formData: FormData
): Promise<SignupState> {
  const validated = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (formData.get('password') !== formData.get('confirmPassword')) {
    const t = await getTranslations('auth.signup');
    return { errors: { confirmPassword: [t('passwordMismatch')] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { message: error.message };
  }

  const locale = await getLocale();

  // "Confirm email" enabled (default): no session yet, user must click the
  // emailed link. "Confirm email" disabled: signUp already returns a session.
  if (data.session) {
    redirect({ href: '/onboarding', locale });
  }

  redirect({ href: '/signup/check-email', locale });
}
