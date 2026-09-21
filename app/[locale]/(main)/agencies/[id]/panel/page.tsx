import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Gear } from '@phosphor-icons/react/dist/ssr';
import { redirect, Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { AgencyStatusBanner, type AgencyStatus } from '@/components/agencies/agency-status-banner';
import { AgencyTourList, type AgencyTourData } from '@/components/agencies/agency-tour-list';
import { AgencyTemplateList, type AgencyTemplateData } from '@/components/agencies/agency-template-list';
import { AgencyStaffManager, type AgencyMemberData } from '@/components/agencies/agency-staff-manager';
import {
  Dossier,
  CaseHeader,
  StatusStamp,
  FolderTabs,
  FolderFace,
  PageBody,
  type FolderTab,
} from '@/components/cordillera/folder';

export default async function AgencyPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id, locale } = await params;
  const { tab: requestedTab } = await searchParams;
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

  const [toursResult, templatesResult, membersResult] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, status, start_at, capacity, confirmed_count, price_crc')
      .eq('agency_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tour_templates')
      .select('id, name')
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

  const templates: AgencyTemplateData[] = (templatesResult.data ?? []).map((template) => ({
    id: template.id,
    name: template.name,
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

  // The agency is a folder too: its tours, templates and staff are
  // sections of one object, not three unrelated pages.
  const tabKeys = ['tours', 'templates'];
  if (isAdminRole) tabKeys.push('staff');
  const activeTab = requestedTab && tabKeys.includes(requestedTab) ? requestedTab : 'tours';

  const tabs: FolderTab[] = tabKeys.map((key) => ({
    href: key === 'tours' ? `/agencies/${id}/panel` : `/agencies/${id}/panel?tab=${key}`,
    label: t(`panelTab_${key}` as never),
    active: key === activeTab,
  }));

  const statusTone =
    agency.status === 'approved' ? 'go' : agency.status === 'pending' ? 'hold' : 'void';

  return (
    <PageBody className="max-w-[1000px]">
      <Dossier>
        <CaseHeader
          title={agency.business_name}
          description={t('panelSubtitle')}
          stamp={
            <StatusStamp tone={statusTone}>
              {t(`status_${agency.status}_stamp` as never)}
            </StatusStamp>
          }
          action={
            isAdminRole && (
              <Link
                href={`/agencies/${id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                <Gear size={15} />
                {t('editProfile')}
              </Link>
            )
          }
        />

        {/* The status banner sits above the tabs, not inside one: a
            suspended agency needs to see why on every section. */}
        <div className="mb-5 empty:mb-0">
          <AgencyStatusBanner status={agency.status as AgencyStatus} />
        </div>

        <FolderTabs tabs={tabs} />

        <FolderFace seam>
          <div key={activeTab} className="animate-leaf">
            {activeTab === 'tours' && (
              <AgencyTourList agencyId={id} canPublish={isAdminRole} initialTours={tours} />
            )}
            {activeTab === 'templates' && (
              <AgencyTemplateList agencyId={id} initialTemplates={templates} />
            )}
            {activeTab === 'staff' && isAdminRole && (
              <AgencyStaffManager
                agencyId={id}
                currentProfileId={user.id}
                initialMembers={members}
              />
            )}
          </div>
        </FolderFace>
      </Dossier>
    </PageBody>
  );
}
