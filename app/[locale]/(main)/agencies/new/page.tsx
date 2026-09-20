import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { AgencyApplyForm } from '@/components/agencies/agency-apply-form';

export default async function NewAgencyPage({
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

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <AgencyApplyForm />
    </main>
  );
}
