import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TourTemplateForm } from '@/components/agencies/tour-template-form';
import { mapAdvisoryTypes } from '@/lib/constants/advisories';

export default async function NewTourTemplatePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: agency } = await supabase.from('agencies').select('id').eq('id', id).single();
  if (!agency) {
    notFound();
  }

  const { data: membership } = await supabase
    .from('agency_members')
    .select('id')
    .eq('agency_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    redirect({ href: `/agencies/${id}`, locale });
  }

  const { data: advisoryTypeRows } = await supabase
    .from('trip_advisory_types')
    .select('code, label_es, label_en, icon, severity');

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <TourTemplateForm
        agencyId={id}
        advisoryTypes={mapAdvisoryTypes(advisoryTypeRows ?? [])}
      />
    </main>
  );
}
