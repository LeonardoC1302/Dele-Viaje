'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  initials?: string;
}

const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, alt, fallback, initials, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);

    const initial = initials || fallback?.split(' ').map(n => n[0]).join('') || '?';

    return (
      <div className={cn('relative inline-flex', className)}>
        {!error && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external avatar URLs (Google, future user uploads) can't be pre-registered in next.config.ts remotePatterns.
          <img
            ref={ref}
            alt={alt || 'Avatar'}
            className={cn(
              'h-10 w-10 rounded-full bg-neutral-200 object-cover dark:bg-neutral-800',
              !isLoaded && 'invisible'
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => setError(true)}
            {...props}
          />
        )}
        {(!isLoaded || error) && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-600 text-xs font-semibold text-white">
            {initial}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
