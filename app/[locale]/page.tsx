import { Navbar } from '@/components/landing/navbar';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { AgenciesCta } from '@/components/landing/agencies-cta';
import { Waitlist } from '@/components/landing/waitlist';
import { Footer } from '@/components/landing/footer';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen">
      <Navbar isAuthenticated={!!user} />
      <Hero />
      <HowItWorks />
      <AgenciesCta />
      <Waitlist />
      <Footer />
    </main>
  );
}
