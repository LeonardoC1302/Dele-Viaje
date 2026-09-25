import { haversineKm } from '@/lib/geo';

/**
 * GPX import for hiking routes (migration 0037).
 *
 * WHY A HAND-WRITTEN READER RATHER THAN AN XML LIBRARY
 * A GPX file is uploaded by a user and parsed on the server, so it is
 * untrusted XML. A general parser has to be talked out of resolving
 * DOCTYPE/ENTITY declarations (XXE, billion-laughs) and needs a DOM
 * shim on the server. This reader never resolves entities at all: it
 * decodes the five predefined ones plus numeric character references
 * and ignores every other markup construct, so an `<!ENTITY>` in the
 * file is inert text. It also means no new dependency for a format
 * whose track structure is four tags wide and stable since 2004.
 *
 * WHAT IS AND ISN'T KEPT
 * Track points (`<trkpt>`), or route points (`<rtept>`) when a file has
 * no track. Standalone `<wpt>` markers are POIs, not a line, so they're
 * skipped. Multiple `<trkseg>`s are concatenated — a file recorded with
 * pauses draws as one line across the gaps, which is what every other
 * viewer does.
 *
 * Distance and elevation stats are computed at FULL resolution, before
 * the geometry is simplified for display, so simplification never costs
 * accuracy in the numbers we show.
 */

export type GpxErrorCode = 'ERR_GPX_INVALID' | 'ERR_GPX_EMPTY' | 'ERR_GPX_TOO_LARGE';

export class GpxError extends Error {
  constructor(public readonly code: GpxErrorCode) {
    super(code);
    this.name = 'GpxError';
  }
}

export interface GpxPoint {
  lng: number;
  lat: number;
  ele: number | null;
}

export interface RouteStats {
  distanceM: number;
  ascentM: number | null;
  descentM: number | null;
  minEleM: number | null;
  maxEleM: number | null;
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
}

export interface ParsedRoute {
  name: string | null;
  /** Simplified for drawing: [[lng, lat], ...]. */
  coordinates: [number, number][];
  /** Evenly-resampled [[distanceM, eleM], ...], or null with no elevation data. */
  profile: [number, number][] | null;
  stats: RouteStats;
  /** How many points the original file held, before simplification. */
  pointCount: number;
}

/** Beyond this the file is refused outright rather than parsed slowly. */
const MAX_RAW_POINTS = 200_000;
/** Points kept for drawing. ~8 m spacing on a 20 km hike — finer than most published trail data. */
const DISPLAY_POINT_BUDGET = 2_500;
/** Douglas–Peucker is O(n²) in the worst case; decimate first so that bound stays sane. */
const SIMPLIFY_INPUT_CAP = 20_000;
const PROFILE_SAMPLES = 240;
/** Barometric/GPS elevation wanders by a metre or two at rest. */
const ELEVATION_SMOOTH_WINDOW = 5;
const CLIMB_THRESHOLD_M = 3;
/** Below this share of points carrying `<ele>`, treat the file as having no elevation at all. */
const MIN_ELEVATION_COVERAGE = 0.5;

// --- reading -------------------------------------------------------------

function readNumericAttr(attrs: string, name: string): number | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attrs);
  if (!match) return null;
  const value = Number(match[1].trim());
  return Number.isFinite(value) ? value : null;
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0x20 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * Decodes only what XML guarantees: the five predefined entities and
 * numeric character references. Anything declared in the document
 * itself is deliberately left as literal text — that is the whole
 * defence against entity-expansion attacks.
 */
function decodeXmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  const text = cdata ? cdata[1] : raw;
  return (
    text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
      // Last, so "&amp;lt;" decodes to the text "&lt;" and not to "<".
      .replace(/&amp;/g, '&')
  );
}

function collectPoints(xml: string, tag: 'trkpt' | 'rtept'): GpxPoint[] {
  const open = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  const points: GpxPoint[] = [];
  let match: RegExpExecArray | null;

  while ((match = open.exec(xml)) !== null) {
    const attrs = match[1];
    const lat = readNumericAttr(attrs, 'lat');
    const lng = readNumericAttr(attrs, 'lon');

    // A point without usable coordinates is skipped, not fatal: one bad
    // row shouldn't cost the host their whole track.
    if (lat === null || lng === null) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    let ele: number | null = null;
    if (!attrs.trimEnd().endsWith('/')) {
      const close = xml.indexOf(`</${tag}`, open.lastIndex);
      if (close !== -1) {
        const body = xml.slice(open.lastIndex, close);
        const eleMatch = /<ele\b[^>]*>([^<]*)<\/ele>/i.exec(body);
        if (eleMatch) {
          const value = Number(eleMatch[1].trim());
          // Dead Sea shore to above Everest — anything outside that is a
          // unit mix-up or a corrupt row, not a reading.
          if (Number.isFinite(value) && value > -500 && value < 9000) ele = value;
        }
      }
    }

    points.push({ lng, lat, ele });
    if (points.length > MAX_RAW_POINTS) throw new GpxError('ERR_GPX_TOO_LARGE');
  }

  return points;
}

function readName(xml: string): string | null {
  // The track's own name first; a file's <metadata><name> is often just
  // the exporting app's filename.
  const track = /<trk\b[^>]*>([\s\S]*?)<\/trk>/i.exec(xml);
  const scope = track ? track[1] : xml;
  const match = /<name\b[^>]*>([\s\S]*?)<\/name>/i.exec(scope);
  if (!match) return null;
  const name = decodeXmlText(match[1]).replace(/\s+/g, ' ').trim();
  return name ? name.slice(0, 160) : null;
}

export function parseGpx(xml: string): { name: string | null; points: GpxPoint[] } {
  if (!/<gpx\b/i.test(xml)) throw new GpxError('ERR_GPX_INVALID');

  // Track points are the real thing; route points are a planned line and
  // are only used when the file carries no track at all.
  let points = collectPoints(xml, 'trkpt');
  if (points.length === 0) points = collectPoints(xml, 'rtept');
  if (points.length < 2) throw new GpxError('ERR_GPX_EMPTY');

  return { name: readName(xml), points };
}

// --- measuring -----------------------------------------------------------

/** Cumulative distance in metres at each point; index 0 is always 0. */
export function cumulativeDistances(points: GpxPoint[]): number[] {
  const out = new Array<number>(points.length);
  out[0] = 0;
  for (let i = 1; i < points.length; i++) {
    const step = haversineKm(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
    out[i] = out[i - 1] + step * 1000;
  }
  return out;
}

/**
 * Elevations with gaps filled and noise smoothed, or null when too few
 * points carried a reading to trust the series.
 */
function conditionElevations(points: GpxPoint[]): number[] | null {
  const present = points.filter((p) => p.ele !== null).length;
  if (present / points.length < MIN_ELEVATION_COVERAGE) return null;

  // Fill gaps by holding the last reading, then seed any leading gap
  // from the first real value, so the series has no holes to special-case.
  const filled = new Array<number>(points.length);
  let last: number | null = null;
  for (let i = 0; i < points.length; i++) {
    if (points[i].ele !== null) last = points[i].ele;
    filled[i] = last ?? 0;
  }
  const firstReal = points.find((p) => p.ele !== null)!.ele!;
  for (let i = 0; i < points.length && points[i].ele === null; i++) filled[i] = firstReal;

  // Moving average: without it, GPS jitter alone invents hundreds of
  // metres of "ascent" on a flat walk.
  const half = Math.floor(ELEVATION_SMOOTH_WINDOW / 2);
  const smoothed = new Array<number>(filled.length);
  for (let i = 0; i < filled.length; i++) {
    const from = Math.max(0, i - half);
    const to = Math.min(filled.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += filled[j];
    smoothed[i] = sum / (to - from + 1);
  }
  return smoothed;
}

export function routeStats(points: GpxPoint[], distances: number[]): RouteStats {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat > maxLat) maxLat = p.lat;
  }

  const elevations = conditionElevations(points);
  let ascentM: number | null = null;
  let descentM: number | null = null;
  let minEleM: number | null = null;
  let maxEleM: number | null = null;

  if (elevations) {
    // Hysteresis, not a naive sum of positive deltas: only a move of at
    // least CLIMB_THRESHOLD_M from the last confirmed level counts, which
    // is how every hiking tool arrives at a believable gain figure.
    let ascent = 0;
    let descent = 0;
    let reference = elevations[0];
    for (const value of elevations) {
      const delta = value - reference;
      if (delta > CLIMB_THRESHOLD_M) {
        ascent += delta;
        reference = value;
      } else if (delta < -CLIMB_THRESHOLD_M) {
        descent += -delta;
        reference = value;
      }
    }
    ascentM = Math.round(ascent);
    descentM = Math.round(descent);
    minEleM = Math.round(Math.min(...elevations));
    maxEleM = Math.round(Math.max(...elevations));
  }

  return {
    distanceM: Math.round(distances[distances.length - 1]),
    ascentM,
    descentM,
    minEleM,
    maxEleM,
    bbox: [minLng, minLat, maxLng, maxLat],
  };
}

/**
 * Elevation resampled at even distance intervals.
 *
 * Built from the full-resolution points rather than from the simplified
 * geometry: Douglas–Peucker judges points by horizontal deviation, so it
 * happily drops the middle of a steady climb, which is exactly the shape
 * a profile chart needs to keep.
 */
export function elevationProfile(
  points: GpxPoint[],
  distances: number[]
): [number, number][] | null {
  const elevations = conditionElevations(points);
  if (!elevations) return null;

  const total = distances[distances.length - 1];
  if (total <= 0) return null;

  const samples: [number, number][] = [];
  let cursor = 0;
  for (let s = 0; s < PROFILE_SAMPLES; s++) {
    const target = (total * s) / (PROFILE_SAMPLES - 1);
    while (cursor < distances.length - 2 && distances[cursor + 1] < target) cursor++;
    const spanStart = distances[cursor];
    const spanEnd = distances[cursor + 1] ?? spanStart;
    const span = spanEnd - spanStart;
    const ratio = span > 0 ? (target - spanStart) / span : 0;
    const from = elevations[cursor];
    const to = elevations[cursor + 1] ?? from;
    samples.push([Math.round(target), Math.round(from + (to - from) * ratio)]);
  }
  return samples;
}

// --- simplifying ---------------------------------------------------------

function douglasPeucker(xs: Float64Array, ys: Float64Array, tolerance: number): number[] {
  const n = xs.length;
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  // Explicit stack rather than recursion: a long track can nest deeper
  // than the call stack allows.
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last - first < 2) continue;

    const x1 = xs[first];
    const y1 = ys[first];
    const dx = xs[last] - x1;
    const dy = ys[last] - y1;
    const span = Math.hypot(dx, dy);

    let worst = -1;
    let worstIndex = -1;
    for (let i = first + 1; i < last; i++) {
      const distance =
        span === 0
          ? Math.hypot(xs[i] - x1, ys[i] - y1)
          : Math.abs(dy * (xs[i] - x1) - dx * (ys[i] - y1)) / span;
      if (distance > worst) {
        worst = distance;
        worstIndex = i;
      }
    }

    if (worst > tolerance && worstIndex > 0) {
      keep[worstIndex] = 1;
      stack.push([first, worstIndex], [worstIndex, last]);
    }
  }

  const kept: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) kept.push(i);
  return kept;
}

/**
 * Thins a track down to a drawable number of points, raising the
 * tolerance until it fits rather than guessing one — a 2 km stroll and a
 * 60 km trek should both come out around the budget.
 */
export function simplifyToBudget(
  points: GpxPoint[],
  budget = DISPLAY_POINT_BUDGET
): [number, number][] {
  // Evenly drop points before the real work if the file is enormous, so
  // the O(n²) worst case stays bounded. Stats are already computed by
  // now, at full resolution, so nothing measurable is lost.
  let working = points;
  if (working.length > SIMPLIFY_INPUT_CAP) {
    const stride = Math.ceil(working.length / SIMPLIFY_INPUT_CAP);
    const strided = working.filter((_, i) => i % stride === 0);
    const lastPoint = working[working.length - 1];
    if (strided[strided.length - 1] !== lastPoint) strided.push(lastPoint);
    working = strided;
  }

  if (working.length <= budget) {
    return working.map((p) => [p.lng, p.lat] as [number, number]);
  }

  // Equirectangular metres about the track's own latitude: good to a
  // fraction of a percent over any single hike, and it makes the
  // perpendicular distances below a real tolerance in metres.
  const lat0 = (working[0].lat * Math.PI) / 180;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  const xs = new Float64Array(working.length);
  const ys = new Float64Array(working.length);
  for (let i = 0; i < working.length; i++) {
    xs[i] = working[i].lng * mPerDegLng;
    ys[i] = working[i].lat * 110_540;
  }

  // Find the FINEST tolerance that still fits the budget, by doubling to
  // bracket it and then bisecting. Doubling alone overshoots badly — the
  // step that first comes under budget can just as easily flatten the
  // whole track to its two endpoints, throwing away every bend in it.
  let tooCoarse = 1;
  let kept = douglasPeucker(xs, ys, tooCoarse);
  let tooFine = 0;
  for (let attempt = 0; kept.length > budget && attempt < 24; attempt++) {
    tooFine = tooCoarse;
    tooCoarse *= 2;
    kept = douglasPeucker(xs, ys, tooCoarse);
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const mid = (tooFine + tooCoarse) / 2;
    const midKept = douglasPeucker(xs, ys, mid);
    if (midKept.length > budget) {
      tooFine = mid;
    } else {
      tooCoarse = mid;
      kept = midKept;
    }
  }

  return kept.map((i) => [working[i].lng, working[i].lat] as [number, number]);
}

// --- the whole job -------------------------------------------------------

export function buildRoute(xml: string): ParsedRoute {
  const { name, points } = parseGpx(xml);
  const distances = cumulativeDistances(points);
  return {
    name,
    coordinates: simplifyToBudget(points),
    profile: elevationProfile(points, distances),
    stats: routeStats(points, distances),
    pointCount: points.length,
  };
}

// --- writing back out ----------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Regenerates a GPX file from what we stored, for hosts and hikers who
 * want the track on a watch or in another app.
 *
 * The original upload is deliberately not kept — storing it would mean
 * another bucket, another set of policies and megabytes per trip, to
 * serve a file we can rebuild. What comes back out is the simplified
 * line (a few metres between points) with elevation interpolated from
 * the stored profile, which is accurate enough to navigate by and is
 * honestly labelled as a Dele Viaje export rather than the original.
 */
export function toGpxDocument(
  name: string,
  coordinates: [number, number][],
  profile: [number, number][] | null
): string {
  const elevationAt = (metres: number): number | null => {
    if (!profile || profile.length === 0) return null;
    if (metres <= profile[0][0]) return profile[0][1];
    const last = profile[profile.length - 1];
    if (metres >= last[0]) return last[1];
    for (let i = 1; i < profile.length; i++) {
      if (profile[i][0] >= metres) {
        const [d0, e0] = profile[i - 1];
        const [d1, e1] = profile[i];
        const span = d1 - d0;
        const ratio = span > 0 ? (metres - d0) / span : 0;
        return Math.round(e0 + (e1 - e0) * ratio);
      }
    }
    return last[1];
  };

  let travelled = 0;
  const rows = coordinates.map((coord, i) => {
    if (i > 0) {
      const [prevLng, prevLat] = coordinates[i - 1];
      travelled += haversineKm(prevLat, prevLng, coord[1], coord[0]) * 1000;
    }
    const ele = elevationAt(travelled);
    const eleTag = ele === null ? '' : `<ele>${ele}</ele>`;
    return `      <trkpt lat="${coord[1].toFixed(6)}" lon="${coord[0].toFixed(6)}">${eleTag}</trkpt>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Dele Viaje" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${rows.join('\n')}
    </trkseg>
  </trk>
</gpx>
`;
}
