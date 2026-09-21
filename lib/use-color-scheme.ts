'use client';

import { useEffect, useState } from 'react';

/**
 * The current color scheme, for the few places that can't use CSS.
 *
 * Almost everything in this app themes through `dark:` utilities and the
 * CSS custom properties in globals.css. Canvas-painted surfaces can't —
 * MapLibre needs real color values handed to it in JS — so they read the
 * media query here and re-apply their style when it changes.
 *
 * Starts as `light` on the server and during the first client render,
 * then corrects in an effect. That ordering matters: reading
 * `matchMedia` during render would produce a server/client mismatch and
 * a hydration error.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setScheme(mq.matches ? 'dark' : 'light');

    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return scheme;
}
