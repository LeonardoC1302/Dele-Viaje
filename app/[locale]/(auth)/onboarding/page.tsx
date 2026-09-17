import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/auth/onboarding-form';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .single();

  if (profile?.onboarding_done) {
    redirect({ href: '/', locale });
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <OnboardingForm />
    </main>
  );
}
