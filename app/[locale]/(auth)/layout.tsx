import { Link } from '@/i18n/navigation';
import { Ridgeline } from '@/components/cordillera/ridgeline';
import { LocaleSwitch } from '@/components/i18n/locale-switch';

/**
 * The auth shell: one folder laid on the page, with the ridge along the
 * bottom of the viewport.
 *
 * Signing in is the one moment a user has no folders yet, so there's no
 * rail and no tabs — just the brand, a single sheet, and the mountains.
 * The locale switch is here rather than buried in the form because
 * choosing a language before typing anything is the whole point of
 * being bilingual by default.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[color:var(--page)]">
      <header className="relative z-10 flex items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
            <path
              d="M2 20 L9 7 L13.5 14 L16.5 9 L22 20 Z"
              className="fill-forest-600 dark:fill-forest-400"
            />
            <circle cx="18" cy="5.5" r="2.5" className="fill-dawn-500" />
          </svg>
          <span className="font-display text-[1.0625rem] font-extrabold tracking-tight text-sand-900 dark:text-sand-50">
            Dele Viaje
          </span>
        </Link>

        <LocaleSwitch />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>

      <div
        className="pointer-events-none relative h-[130px] shrink-0 sm:h-[170px]"
        aria-hidden="true"
      >
        <Ridgeline profile="valle" />
      </div>
    </div>
  );
}
