import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripForm } from '@/components/trips/trip-form';
import { mapAdvisoryTypes } from '@/lib/constants/advisories';

export default async function NewTripPage({
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

  if (!profile?.onboarding_done) {
    redirect({ href: '/onboarding', locale });
  }

  const { data: advisoryTypes } = await supabase
    .from('trip_advisory_types')
    .select('code, label_es, label_en, icon, severity');

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-7 sm:py-10">
      <TripForm advisoryTypes={mapAdvisoryTypes(advisoryTypes ?? [])} />
    </main>
  );
}
