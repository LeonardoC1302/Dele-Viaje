import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading placeholders shimmer along the sand ramp (see the `.shimmer`
 * utility) rather than through gray — a gray skeleton on warm paper
 * announces itself as a different material.
 */
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('shimmer animate-shimmer rounded-md', className)}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
