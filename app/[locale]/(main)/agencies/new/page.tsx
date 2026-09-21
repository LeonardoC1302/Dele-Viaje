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
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <AgencyApplyForm />
    </main>
  );
}
