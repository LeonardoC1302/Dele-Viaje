import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { MarketingHeader } from '@/components/landing/marketing-header';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { TripShowcase } from '@/components/landing/trip-showcase';
import { AgenciesCta } from '@/components/landing/agencies-cta';
import { Footer } from '@/components/landing/footer';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-[100dvh] bg-[color:var(--page)]">
      <MarketingHeader isAuthenticated={!!user} />
      <main>
        <Hero />
        <HowItWorks />
        <TripShowcase />
        <AgenciesCta />
      </main>
      <Footer />
    </div>
  );
}
