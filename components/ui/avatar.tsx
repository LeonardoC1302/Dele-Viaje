'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  initials?: string;
  size?: number;
}

const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, alt, fallback, initials, size = 40, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);

    const initial = initials || fallback?.split(' ').map(n => n[0]).join('') || '?';
    const dimension = { width: size, height: size };
    const hasSrc = !!props.src;

    return (
      <div
        className={cn('relative inline-flex shrink-0', className)}
        style={dimension}
      >
        {hasSrc && !error && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external avatar URLs (Google, future user uploads) can't be pre-registered in next.config.ts remotePatterns.
          <img
            ref={ref}
            alt={alt || 'Avatar'}
            className={cn(
              'absolute inset-0 rounded-full bg-neutral-200 object-cover dark:bg-neutral-800',
              !isLoaded && 'invisible'
            )}
            style={dimension}
            onLoad={() => setIsLoaded(true)}
            onError={() => setError(true)}
            {...props}
          />
        )}
        {(!hasSrc || !isLoaded || error) && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-forest-600 font-semibold text-white"
            style={{ fontSize: Math.max(10, size * 0.35) }}
          >
            {initial}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
