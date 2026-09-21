'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  initials?: string;
  size?: number;
}

/**
 * The initials fallback is forest, not a gray placeholder — a missing
 * avatar should still belong to the product. Avatars keep the pill
 * radius (one of the three allowed).
 */
const Avatar = React.forwardRef<HTMLImageElement, AvatarProps>(
  ({ className, alt, fallback, initials, size = 40, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [errored, setErrored] = React.useState(false);

    const initial =
      initials ||
      fallback
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('') ||
      '?';
    const dimension = { width: size, height: size };
    const hasSrc = !!props.src;

    return (
      <div className={cn('relative inline-flex shrink-0', className)} style={dimension}>
        {hasSrc && !errored && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external avatar URLs (Google, future uploads) can't be pre-registered in next.config.ts remotePatterns.
          <img
            ref={ref}
            alt={alt || 'Avatar'}
            className={cn(
              'absolute inset-0 rounded-full bg-sand-200 object-cover dark:bg-sand-800',
              !isLoaded && 'invisible'
            )}
            style={dimension}
            onLoad={() => setIsLoaded(true)}
            onError={() => setErrored(true)}
            {...props}
          />
        )}
        {(!hasSrc || !isLoaded || errored) && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-forest-600 font-display font-bold uppercase text-white dark:bg-forest-500"
            style={{ fontSize: Math.max(10, size * 0.36) }}
            aria-hidden={hasSrc && !errored ? 'true' : undefined}
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
