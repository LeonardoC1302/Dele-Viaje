import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The way out of a page.
 *
 * Every form and detail surface gets one of these in the same place —
 * top left, above the title — so leaving is always in the spot you
 * already looked. It is a micro-label rather than a button because
 * going back is never the action a surface is for; the dawn primary
 * stays the one thing being asked of you.
 *
 * Long forms pair this with a Cancel beside the submit button: the top
 * link is for "I opened the wrong thing", the bottom one is for "I
 * changed my mind", and by then you are at the bottom of the page.
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'micro-label mb-6 inline-flex items-center gap-1.5 transition-colors hover:text-sand-800 dark:hover:text-sand-200',
        className
      )}
    >
      <ArrowLeft size={13} weight="bold" />
      {children}
    </Link>
  );
}
