import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * A chunk of a long form.
 *
 * The trip, tour, template and agency forms are all long enough that an
 * undivided column of fields becomes unreadable. Sectioning them under
 * micro-labels gives the eye somewhere to rest and makes "what am I
 * still missing" answerable at a glance.
 *
 * The section rule is drawn *above* each section rather than below, so
 * the last section doesn't end on a stray line above the submit button.
 */
export function FormSection({
  icon: SectionIcon,
  title,
  description,
  children,
  className,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'border-t border-sand-200 pt-6 first:border-t-0 first:pt-0 dark:border-sand-800',
        className
      )}
    >
      <h2 className="micro-label flex items-center gap-2">
        {SectionIcon && (
          <SectionIcon size={14} weight="fill" className="text-dawn-600 dark:text-dawn-400" />
        )}
        {title}
      </h2>

      {description && (
        <p className="mt-2 text-xs leading-relaxed text-sand-500 dark:text-sand-400">
          {description}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}
