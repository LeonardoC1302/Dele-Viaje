import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TourTemplateForm } from '@/components/agencies/tour-template-form';
import { mapAdvisoryTypes } from '@/lib/constants/advisories';

export default async function EditTourTemplatePage({
  params,
}: {
  params: Promise<{ id: string; templateId: string; locale: string }>;
}) {
  const { id, templateId, locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login', locale });
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

  const { data: template } = await supabase
    .from('tour_templates')
    .select(
      'name, title, description, category, location_name, lat, lng, waypoints, custom_fields, links, advisories, capacity, min_participants, price_crc'
    )
    .eq('id', templateId)
    .eq('agency_id', id)
    .single();

  if (!template) {
    notFound();
  }

  const { data: advisoryTypeRows } = await supabase
    .from('trip_advisory_types')
    .select('code, label_es, label_en, icon, severity');

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <TourTemplateForm
        agencyId={id}
        advisoryTypes={mapAdvisoryTypes(advisoryTypeRows ?? [])}
        mode="edit"
        templateId={templateId}
        initialValues={{
          name: template.name,
          title: template.title,
          description: template.description,
          category: template.category,
          locationName: template.location_name,
          lat: template.lat,
          lng: template.lng,
          waypoints: template.waypoints ?? [],
          advisories: template.advisories ?? [],
          customFields: template.custom_fields ?? [],
          links: template.links ?? [],
          capacity: template.capacity ?? 1,
          minParticipants: template.min_participants,
          priceCrc: template.price_crc ?? 1000,
        }}
      />
    </main>
  );
}
