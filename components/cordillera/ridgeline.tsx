import { cn } from '@/lib/utils';

/**
 * The ridgeline is the one drawing this product owns. It appears at the
 * bottom of the hero, along the top of page headers, behind empty
 * states, and inside category cards — same silhouette language every
 * time, so the app reads as one place.
 *
 * Three profiles keep it from looking stamped. They are genuinely
 * different mountains, not the same polygon at different widths:
 *
 *  - `cordillera` — the signature range. Tall central peak, long tail.
 *  - `valle`      — low and wide, for shallow bands where a tall peak
 *                   would be cropped to a stub.
 *  - `volcan`     — a single dominant cone, for square-ish areas like
 *                   card headers.
 *
 * Every profile is drawn in a 1200×220 box and closed along the bottom
 * edge, which is what makes the cropping behaviour below safe.
 */
export type RidgeProfile = 'cordillera' | 'valle' | 'volcan';

const PROFILES: Record<RidgeProfile, { back: string; front: string; sun: { cx: number; cy: number; r: number } }> = {
  cordillera: {
    back: '0,220 0,140 220,60 420,120 620,20 900,110 1200,50 1200,220',
    front: '0,220 0,180 260,110 520,170 780,90 1050,160 1200,120 1200,220',
    sun: { cx: 1040, cy: 55, r: 26 },
  },
  valle: {
    back: '0,220 0,165 180,120 400,155 640,105 880,150 1200,115 1200,220',
    front: '0,220 0,196 240,162 480,190 760,150 1020,185 1200,168 1200,220',
    sun: { cx: 210, cy: 78, r: 20 },
  },
  volcan: {
    back: '0,220 0,180 300,170 600,30 900,170 1200,185 1200,220',
    front: '0,220 0,205 340,196 600,96 860,196 1200,200 1200,220',
    sun: { cx: 980, cy: 64, r: 22 },
  },
};

export function Ridgeline({
  profile = 'cordillera',
  className,
  tone = 'forest',
  showSun = true,
}: {
  profile?: RidgeProfile;
  className?: string;
  /**
   * Which ground the ridge is being drawn on:
   *
   *  - `forest` — on paper. Opaque green mountains. The default.
   *  - `deep`   — on a `forest-600` band specifically. Draws in
   *               forest-700, one real step darker on the same ramp.
   *               Note this only works against 600: forest-700 and -800
   *               are both near-black and differ by a few counts, so a
   *               700-on-700 ridge is invisible.
   *  - `onDark` — on an arbitrary dark or saturated container where the
   *               exact ground colour isn't known (a category header).
   *               Translucent white, deliberately faint.
   */
  tone?: 'forest' | 'deep' | 'onDark';
  showSun?: boolean;
}) {
  const { back, front, sun } = PROFILES[profile];

  const backFill = {
    forest: 'fill-forest-400/40 dark:fill-forest-800/60',
    deep: 'fill-forest-700/70',
    onDark: 'fill-white/[0.07]',
  }[tone];

  const frontFill = {
    forest: 'fill-forest-600 dark:fill-forest-800',
    deep: 'fill-forest-700',
    onDark: 'fill-white/[0.13]',
  }[tone];

  const sunFill = {
    forest: 'fill-dawn-300 dark:fill-dawn-500',
    deep: 'fill-dawn-500/80',
    onDark: 'fill-dawn-200/70',
  }[tone];

  return (
    <svg
      viewBox="0 0 1200 220"
      /**
       * `slice` scales uniformly until the box is covered, then crops
       * the overflow off one edge. Anchoring Y to `Min` (top) forces
       * that crop to come off the BOTTOM — the flat, empty mountain
       * base — so the peaks and the sun survive at any container
       * aspect ratio. Anchoring to the bottom instead crops the top,
       * which cuts exactly the part worth keeping.
       */
      preserveAspectRatio="xMidYMin slice"
      className={cn('block h-full w-full', className)}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={back} className={backFill} />
      {showSun && <circle cx={sun.cx} cy={sun.cy} r={sun.r} className={sunFill} />}
      <polygon points={front} className={frontFill} />
    </svg>
  );
}
