import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Buttons take the pill radius — one of the three places roundness is
 * allowed in this system (buttons, chips, avatars), which is what keeps
 * it meaningful against the crisp 6px geometry everywhere else.
 *
 * The variant names encode scarcity, not just color:
 *
 *  - `primary` is dawn, and a surface gets exactly one. It is the thing
 *    the user came to do. Two dawn buttons on a screen means one of
 *    them is not primary.
 *  - `secondary` is forest — strong, structural, repeatable.
 *  - `outline` / `ghost` carry everything else.
 *
 * No drop shadows: depth in this system comes from ground tint, and a
 * shadowed pill on warm paper is the generic-SaaS tell the redesign
 * exists to remove.
 */
const buttonVariants = cva(
  'font-display inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--page)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-dawn-500 text-sand-950 hover:bg-dawn-400 focus-visible:ring-dawn-500',
        secondary:
          'bg-forest-600 text-white hover:bg-forest-500 focus-visible:ring-forest-600 dark:bg-forest-500 dark:hover:bg-forest-400',
        outline:
          'border border-sand-300 bg-transparent text-sand-800 hover:border-sand-400 hover:bg-sand-100 focus-visible:ring-forest-600 dark:border-sand-600 dark:text-sand-100 dark:hover:border-sand-500 dark:hover:bg-sand-800',
        ghost:
          'text-sand-700 hover:bg-sand-100 focus-visible:ring-forest-600 dark:text-sand-300 dark:hover:bg-sand-800',
        destructive:
          'bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-700',
      },
      size: {
        xs: 'h-8 px-3 text-xs',
        sm: 'h-9 px-3.5',
        md: 'h-10 px-4',
        lg: 'h-11 px-6',
        xl: 'h-12 px-8 text-[0.9375rem]',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || props.disabled}
      ref={ref}
      {...props}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
