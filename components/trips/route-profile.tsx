'use client';

import * as React from 'react';
import { useFormatter } from 'next-intl';

/**
 * The elevation profile of a hiking route.
 *
 * Hand-drawn SVG rather than a charting library: it is one filled path
 * over an evenly-spaced series, and a chart package would be the
 * heaviest dependency in the project for the privilege.
 *
 * It is a tool, not a picture — dragging across it reads out the
 * distance and altitude under the pointer, which is the question anyone
 * looks at a profile to answer ("how far in is the steep part?").
 */

const VIEW_W = 1000;
const VIEW_H = 220;
/** Room above and below the line so a flat walk isn't a line on the floor. */
const PAD_Y = 14;

export function RouteProfile({
  profile,
  ascentLabel,
}: {
  /** [[distanceM, elevationM], ...] as stored by migration 0037. */
  profile: [number, number][];
  ascentLabel: string;
}) {
  const format = useFormatter();
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hover, setHover] = React.useState<number | null>(null);

  const { area, line, minEle, maxEle, totalM } = React.useMemo(() => {
    const elevations = profile.map(([, e]) => e);
    const lo = Math.min(...elevations);
    const hi = Math.max(...elevations);
    const total = profile[profile.length - 1][0] || 1;
    // A dead-flat route would divide by zero; give it a nominal range so
    // the line lands in the middle of the box instead of vanishing.
    const span = hi - lo || 1;

    const points = profile.map(([d, e]) => {
      const x = (d / total) * VIEW_W;
      const y = PAD_Y + (1 - (e - lo) / span) * (VIEW_H - PAD_Y * 2);
      return [x, y] as const;
    });

    const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

    return {
      line: path,
      area: `${path} L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`,
      minEle: lo,
      maxEle: hi,
      totalM: total,
    };
  }, [profile]);

  // Index under the pointer, from a fraction of the width — the samples
  // are evenly spaced by distance, so this is a direct lookup.
  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (profile.length - 1)));
  };

  const active = hover === null ? null : profile[hover];
  const activeX = hover === null ? 0 : (profile[hover][0] / totalM) * VIEW_W;

  const metres = (value: number) => `${format.number(Math.round(value))} m`;
  const km = (value: number) =>
    `${format.number(value / 1000, { maximumFractionDigits: 1 })} km`;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="micro-label">{ascentLabel}</span>
        <span className="tnum text-xs text-sand-500 dark:text-sand-400">
          {active ? `${km(active[0])} · ${metres(active[1])}` : `${metres(minEle)} – ${metres(maxEle)}`}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        // The box is stretched to whatever width it gets; strokes opt out
        // of that scaling below so the line stays an even weight.
        preserveAspectRatio="none"
        className="mt-1.5 h-24 w-full touch-none rounded-md bg-[color:var(--sunken)]"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${ascentLabel}: ${metres(minEle)} – ${metres(maxEle)}`}
      >
        <path d={area} className="fill-forest-500/15 dark:fill-forest-400/15" />
        <path
          d={line}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeWidth={1.5}
          strokeLinejoin="round"
          className="stroke-forest-600 dark:stroke-forest-400"
        />
        {active && (
          <line
            x1={activeX}
            y1={0}
            x2={activeX}
            y2={VIEW_H}
            vectorEffect="non-scaling-stroke"
            strokeWidth={1}
            className="stroke-forest-600/50 dark:stroke-forest-300/50"
          />
        )}
      </svg>
    </div>
  );
}
