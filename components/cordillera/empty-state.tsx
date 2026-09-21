import { Ridgeline } from '@/components/cordillera/ridgeline';
import { cn } from '@/lib/utils';

/**
 * The empty drawer.
 *
 * Empty states are where a product most often gives up and ships a gray
 * dashed box with a shrug in it. This one is a real surface: the
 * ridgeline sits behind the message at low contrast, so an empty feed
 * still looks like this product rather than like a missing component.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-sand-200 bg-[color:var(--raised)] px-6 py-14 text-center dark:border-sand-800',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-[0.13]">
        <Ridgeline profile="valle" showSun={false} />
      </div>

      <div className="relative mx-auto max-w-[44ch]">
        <h2 className="font-display text-lg font-bold text-sand-900 dark:text-sand-50">
          {title}
        </h2>
        {body && (
          <p className="mt-2 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
            {body}
          </p>
        )}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
