import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Gear } from '@phosphor-icons/react/dist/ssr';
import { redirect, Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { AgencyStatusBanner, type AgencyStatus } from '@/components/agencies/agency-status-banner';
import { AgencyTourList, type AgencyTourData } from '@/components/agencies/agency-tour-list';
import { AgencyStaffManager, type AgencyMemberData } from '@/components/agencies/agency-staff-manager';

export default async function AgencyPanelPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations('agencies');
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
  }

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, business_name, status')
    .eq('id', id)
    .single();

  if (!agency) {
    notFound();
  }

  const { data: myMembership } = await supabase
    .from('agency_members')
    .select('role')
    .eq('agency_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!myMembership) {
    redirect({ href: `/agencies/${id}`, locale });
  }

  const isAdminRole = myMembership.role === 'owner' || myMembership.role === 'admin';

  const [toursResult, membersResult] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, status, start_at, capacity, confirmed_count, price_crc')
      .eq('agency_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('agency_members')
      .select('id, profile_id, role')
      .eq('agency_id', id)
      .eq('status', 'active'),
  ]);

  const tours: AgencyTourData[] = (toursResult.data ?? []).map((trip) => ({
    id: trip.id,
    title: trip.title,
    status: trip.status,
    startAt: trip.start_at,
    capacity: trip.capacity,
    confirmedCount: trip.confirmed_count,
    priceCrc: trip.price_crc,
  }));

  const memberProfileIds = (membersResult.data ?? []).map((m) => m.profile_id);
  const { data: memberProfiles } =
    memberProfileIds.length > 0
      ? await supabase.rpc('profiles_public').in('id', memberProfileIds)
      : { data: [] };
  const profiles = (memberProfiles ?? []) as { id: string; display_name: string | null }[];
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

  const members: AgencyMemberData[] = (membersResult.data ?? []).map((m) => ({
    id: m.id,
    profileId: m.profile_id,
    displayName: nameById.get(m.profile_id) ?? null,
    role: m.role as AgencyMemberData['role'],
  }));

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">
            {agency.business_name}
          </h1>
          {isAdminRole && (
            <Link href={`/agencies/${id}/edit`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              <Gear size={16} weight="regular" strokeWidth={1.5} />
              {t('editProfile')}
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('panelSubtitle')}</p>

        <div className="mt-6 flex flex-col gap-6">
          <AgencyStatusBanner status={agency.status as AgencyStatus} />
          <AgencyTourList agencyId={id} canPublish={isAdminRole} initialTours={tours} />
          {isAdminRole && (
            <AgencyStaffManager agencyId={id} currentProfileId={user.id} initialMembers={members} />
          )}
        </div>
      </div>
    </main>
  );
}
