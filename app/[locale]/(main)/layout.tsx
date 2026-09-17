import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('mainNav');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-neutral-50/80 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Dele Viaje
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/feed"
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-forest-600 dark:text-neutral-300 dark:hover:text-forest-400"
            >
              {t('feed')}
            </Link>
            <Link
              href="/trips/new"
              className={buttonVariants({ size: 'sm', variant: 'primary' })}
            >
              {t('createTrip')}
            </Link>
            {user && (
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'ghost' })
                  )}
                >
                  {t('signOut')}
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
