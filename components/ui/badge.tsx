import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Chips — one of the three places the pill radius is allowed.
 *
 * Semantic variants (`success`, `warning`, `error`) stay on the sand
 * ramp's neighbours rather than reaching for stock Tailwind greens and
 * ambers: a `bg-green-100` chip next to forest green reads as a second,
 * unrelated green. Use `StatusStamp` from the dossier components for a
 * record's *state*; a badge is for classification (category, type,
 * role), which is a different job.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-sand-100 text-sand-700 dark:bg-sand-800 dark:text-sand-300',
        /** Quieter than `default` — for a classification that shouldn't
         *  compete with the record's own title. */
        secondary:
          'bg-transparent text-sand-500 ring-1 ring-inset ring-sand-200 dark:text-sand-400 dark:ring-sand-700',
        primary: 'bg-forest-600 text-white dark:bg-forest-500',
        accent: 'bg-dawn-100 text-dawn-800 dark:bg-dawn-900/50 dark:text-dawn-200',
        outline:
          'border border-sand-300 text-sand-700 dark:border-sand-600 dark:text-sand-300',
        success:
          'bg-forest-100 text-forest-700 dark:bg-forest-900/40 dark:text-forest-300',
        warning:
          'bg-dawn-100 text-dawn-800 dark:bg-dawn-900/40 dark:text-dawn-200',
        error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
