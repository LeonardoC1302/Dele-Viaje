import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The dossier: the composition every signed-in surface is built from.
 *
 * A trip is one case folder. Its itinerary, chat, packing list and
 * expenses are tabs cut into that folder's top edge — not a nav menu
 * above a page, and not separate pages that happen to share a URL
 * prefix. The point is that the identity of the thing being read never
 * reloads: the case label and status stamp hold still while only the
 * tab strip moves.
 *
 * The pieces compose in one fixed order, and they are not independently
 * useful — a `FolderTabs` without a `FolderFace` under it is a row of
 * floating rectangles, because the seam between the active tab and the
 * face is the entire illusion:
 *
 *   <Dossier>
 *     <CaseHeader ... />        // case label, status stamp, action
 *     <FolderTabs tabs={...} /> // cut tabs, optional
 *     <FolderFace> ... </FolderFace>
 *   </Dossier>
 */

export function Dossier({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn('min-w-0', className)}>{children}</section>;
}

/* -------------------------------------------------------------------------- */

const STAMP_TONES = {
  /** Live, healthy, confirmed. */
  go: 'border-forest-600 text-forest-700 dark:border-forest-400 dark:text-forest-300',
  /** Awaiting someone's action — pending payment, pending approval. */
  hold: 'border-dawn-600 text-dawn-700 dark:border-dawn-400 dark:text-dawn-300',
  /** Cancelled, rejected, suspended, banned. */
  void: 'border-red-600 text-red-700 dark:border-red-400 dark:text-red-300',
  /** Draft, archived, past — real but inert. */
  inert: 'border-sand-400 text-sand-600 dark:border-sand-600 dark:text-sand-400',
} as const;

export type StampTone = keyof typeof STAMP_TONES;

/**
 * The status stamp. Deliberately not a filled pill — a case file is
 * stamped in outline, and an outline also keeps the one filled, dawn-
 * colored thing on the surface unambiguously the primary action.
 */
export function StatusStamp({
  tone = 'inert',
  children,
  className,
}: {
  tone?: StampTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'micro-label inline-flex shrink-0 items-center border px-2 py-1',
        STAMP_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The case label: what this folder is, stamped with its state, with the
 * surface's single primary action to its right.
 *
 * `action` is for exactly one control. Where a surface genuinely has a
 * second action, it belongs inside the face near what it acts on, not
 * up here competing with the primary — the dawn accent only works as a
 * signal while it is scarce.
 */
export function CaseHeader({
  title,
  stamp,
  description,
  action,
  meta,
}: {
  title: string;
  stamp?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  /** Small facts that belong to the label itself — dates, location, owner. */
  meta?: React.ReactNode;
}) {
  return (
    // No eyebrow. A tracked-caps kicker above a title is the one thing
    // that reads as generic no matter how good the rest is: it restates
    // the page you are already on, and here it was duplicating the
    // category the card's own tab already carries. The `Leaf` label and
    // the trip card's cut tab stay — those carry data, not decoration.
    <header className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        {/* `basis-full` below `sm` gives the case label the whole width
            on a phone, so the action drops to its own row instead of
            squeezing the title into two or three lines. Putting a
            primary button beside the label was right on desktop and
            wrong at 390px — the label is meant to read as one held-still
            object, not as a stack. */}
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-display-sm font-extrabold text-sand-900 dark:text-sand-50">
              {title}
            </h1>
            {stamp}
          </div>

          {description && (
            <p className="mt-3 max-w-[64ch] leading-relaxed text-sand-600 dark:text-sand-400">
              {description}
            </p>
          )}

          {meta && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-sand-600 dark:text-sand-400">
              {meta}
            </div>
          )}
        </div>

        {action && (
          <div className="shrink-0 [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto max-sm:w-full">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

export interface FolderTab {
  href: string;
  label: string;
  active?: boolean;
  /** Rendered after the label — a count, an unread dot. */
  badge?: React.ReactNode;
}

/**
 * The cut tabs.
 *
 * The seam is the whole trick: the active tab shares the face's exact
 * background and pulls itself down one pixel (`-mb-px`) so its bottom
 * border lands on top of the face's top border and erases it. The tab
 * and the face become one continuous piece of paper; every inactive tab
 * keeps its bottom border and sits a step darker on the sand ramp, so
 * it reads as a sheet behind the front one.
 *
 * The strip scrolls horizontally rather than wrapping. A wrapped second
 * row of tabs stops reading as a folder and starts reading as a broken
 * toolbar — which matters most on a private plan, the busiest surface
 * in the app.
 */
export function FolderTabs({ tabs }: { tabs: FolderTab[] }) {
  if (tabs.length === 0) return null;

  return (
    <div className="relative">
      <nav
        className="flex items-end gap-1 overflow-x-auto pl-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Sections"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md border px-4 py-2.5',
              'font-display text-sm font-semibold transition-colors',
              tab.active
                ? // Same ground as the face, and its bottom border is
                  // painted in the face's color so the seam disappears.
                  'z-10 border-sand-200 border-b-[color:var(--raised)] bg-[color:var(--raised)] text-sand-900 dark:border-sand-800 dark:text-sand-50'
                : 'border-transparent bg-sand-100 text-sand-600 hover:bg-sand-50 hover:text-sand-800 dark:bg-sand-800/60 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-200'
            )}
          >
            {tab.label}
            {tab.badge}
          </Link>
        ))}
      </nav>

      {/* On a phone the strip scrolls, and a tab clipped flat at the
          edge reads as broken layout rather than as "there is more".
          This fades the last few pixels into the page ground so the
          cut looks deliberate. Sits above the tabs but below nothing
          interactive, hence pointer-events-none. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[color:var(--page)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The folder face — the sheet everything is read on.
 *
 * `seam` tells the face a tab strip sits above it, which squares off
 * its top-left corner so the strip's first tab meets it flush. Without
 * a strip the face is rounded on all four corners like a loose sheet.
 */
export function FolderFace({
  children,
  className,
  seam = false,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  seam?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative border border-sand-200 bg-[color:var(--raised)] dark:border-sand-800',
        seam ? 'rounded-b-md rounded-tr-md' : 'rounded-md',
        padded && 'p-5 sm:p-7',
        className
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A titled region inside a folder face. The micro-label above a hairline
 * is the system's repeating structural unit — it is what makes an
 * expenses panel and an admin queue read as the same product.
 */
export function Leaf({
  label,
  action,
  children,
  className,
}: {
  label?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0', className)}>
      {label && (
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-sand-200 pb-2.5 dark:border-sand-800">
          <h2 className="micro-label">{label}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The page gutter. Every surface inside the shell uses it, so the
 * content column lines up from page to page and the rail never has to
 * account for per-page padding.
 */
export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-7 sm:py-10', className)}>
      {children}
    </div>
  );
}
