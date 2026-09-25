import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeAdvisories, normalizeLinks } from '@/lib/template-values';
import { BackLink } from '@/components/ui/back-link';
import { TourForm, type TourTemplateValues } from '@/components/agencies/tour-form';
import { mapAdvisoryTypes } from '@/lib/constants/advisories';

export default async function NewTourPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id, locale } = await params;
  const { template: templateId } = await searchParams;
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

  let templateValues: TourTemplateValues | undefined;
  if (templateId) {
    const { data: template } = await supabase
      .from('tour_templates')
      .select(
        'title, description, category, location_name, lat, lng, waypoints, custom_fields, links, advisories, capacity, min_participants, price_crc'
      )
      .eq('id', templateId)
      .eq('agency_id', id)
      .single();

    if (template) {
      templateValues = {
        title: template.title,
        description: template.description,
        category: template.category,
        locationName: template.location_name,
        lat: template.lat,
        lng: template.lng,
        waypoints: template.waypoints ?? [],
        // See lib/template-values: blank optional text is absent from
        // the stored jsonb, not empty, and the editors take strings.
        advisories: normalizeAdvisories(template.advisories),
        customFields: template.custom_fields ?? [],
        links: normalizeLinks(template.links),
        capacity: template.capacity ?? 1,
        minParticipants: template.min_participants,
        priceCrc: template.price_crc ?? 1000,
        exclusiveContent: '',
      };
    }
  }

  const { data: advisoryTypeRows } = await supabase
    .from('trip_advisory_types')
    .select('code, label_es, label_en, icon, severity');

  const t = await getTranslations('agencies');

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <BackLink href={`/agencies/${id}/panel`}>{t('backToPanel')}</BackLink>
      <TourForm agencyId={id} advisoryTypes={mapAdvisoryTypes(advisoryTypeRows ?? [])} templateValues={templateValues} />
    </main>
  );
}
