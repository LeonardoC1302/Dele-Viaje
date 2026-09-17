import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-forest-600 text-white shadow-md shadow-black/15 hover:bg-forest-700 active:scale-95 focus-visible:ring-forest-600',
        secondary:
          'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 active:scale-95 focus-visible:ring-neutral-400',
        ghost:
          'text-forest-600 hover:bg-forest-50 dark:text-forest-400 dark:hover:bg-neutral-800 focus-visible:ring-forest-600',
        outline:
          'border-2 border-forest-600 bg-white text-forest-700 shadow-md shadow-black/10 hover:bg-forest-50 active:scale-95 dark:border-forest-400 dark:bg-neutral-900 dark:text-forest-300 dark:hover:bg-neutral-800 focus-visible:ring-forest-600',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
      },
      size: {
        xs: 'h-8 px-3 text-xs',
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6',
        xl: 'h-12 px-8',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
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
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
