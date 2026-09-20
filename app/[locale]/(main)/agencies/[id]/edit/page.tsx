import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { AgencyApplyForm, type AgencyProfileInitialValues } from '@/components/agencies/agency-apply-form';

export default async function EditAgencyProfilePage({
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

  const { data: membership } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    redirect({ href: `/agencies/${id}`, locale });
  }

  const { data: agency } = await supabase
    .from('agencies')
    .select('business_name, legal_name, legal_id, description, location_name, sinpe_phone')
    .eq('id', id)
    .single();

  if (!agency) {
    notFound();
  }

  const initialValues: AgencyProfileInitialValues = {
    businessName: agency.business_name,
    legalName: agency.legal_name ?? '',
    legalId: agency.legal_id ?? '',
    description: agency.description ?? '',
    locationName: agency.location_name ?? '',
    sinpePhone: agency.sinpe_phone ?? '',
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <AgencyApplyForm mode="edit" agencyId={id} initialValues={initialValues} />
    </main>
  );
}
