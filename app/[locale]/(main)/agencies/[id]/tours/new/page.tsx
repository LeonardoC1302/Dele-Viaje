import { notFound } from 'next/navigation';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TourForm, type TourTemplateValues } from '@/components/agencies/tour-form';

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
        'title, description, category, location_name, lat, lng, waypoints, custom_fields, links, capacity, min_participants, price_crc'
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
        customFields: template.custom_fields ?? [],
        links: template.links ?? [],
        capacity: template.capacity ?? 1,
        minParticipants: template.min_participants,
        priceCrc: template.price_crc ?? 1000,
        exclusiveContent: '',
      };
    }
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <TourForm agencyId={id} templateValues={templateValues} />
    </main>
  );
}
