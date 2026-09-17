import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border border-forest-600 bg-forest-50 text-forest-700 dark:border-forest-400 dark:bg-forest-950 dark:text-forest-400',
        primary:
          'bg-forest-600 text-white dark:bg-forest-700',
        secondary:
          'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
        outline:
          'border border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300',
        success:
          'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        warning:
          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        error:
          'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
