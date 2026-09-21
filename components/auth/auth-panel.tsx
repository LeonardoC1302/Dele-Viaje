import { cn } from '@/lib/utils';

/**
 * The sheet every auth screen is set on — one definition so login,
 * signup, check-email and onboarding can't drift apart in width,
 * padding or heading scale, which is exactly what happened to them
 * before (three different max-widths, two different title sizes).
 */
export function AuthPanel({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    // No eyebrow here either: "BIENVENIDO DE NUEVO" above a subtitle
    // that already said "Bienvenido de nuevo a Dele Viaje" was the
    // pattern at its worst — a tracked-caps label restating the
    // sentence directly beneath it.
    <div
      className={cn(
        'w-full max-w-[26rem] rounded-md border border-sand-200 bg-[color:var(--raised)] p-7 sm:p-8 dark:border-sand-800',
        className
      )}
    >
      <h1 className="text-2xl font-extrabold text-sand-900 dark:text-sand-50">{title}</h1>

      {subtitle && (
        <p className="mt-2 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
          {subtitle}
        </p>
      )}

      {children}

      {footer && (
        <div className="mt-7 border-t border-sand-200 pt-5 text-center text-sm text-sand-600 dark:border-sand-800 dark:text-sand-400">
          {footer}
        </div>
      )}
    </div>
  );
}

/** The "or" rule between the OAuth button and the credential form. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-sand-200 dark:bg-sand-700" />
      <span className="micro-label">{label}</span>
      <div className="h-px flex-1 bg-sand-200 dark:bg-sand-700" />
    </div>
  );
}
