import * as React from 'react';
import { cn } from '@/lib/utils';

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'animate-pulse rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800',
      'bg-[length:200%_100%] animation-[shimmer_2s_infinite]',
      className
    )}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

export { Skeleton };
