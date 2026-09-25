import { describe, it, expect } from 'vitest';
import {
  parseGpx,
  buildRoute,
  cumulativeDistances,
  routeStats,
  simplifyToBudget,
  toGpxDocument,
  GpxError,
  type GpxPoint,
} from './gpx';

function gpx(body: string, name = 'Cerro Chirripó'): string {
  return `<?xml version="1.0"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${name}</name><trkseg>
${body}
  </trkseg></trk>
</gpx>`;
}

function trkpt(lat: number, lon: number, ele?: number): string {
  return ele === undefined
    ? `<trkpt lat="${lat}" lon="${lon}"></trkpt>`
    : `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele></trkpt>`;
}

describe('parseGpx', () => {
  it('reads track points with coordinates and elevation', () => {
    const { name, points } = parseGpx(gpx([trkpt(9.48, -83.49, 3200), trkpt(9.49, -83.5, 3300)].join('\n')));
    expect(name).toBe('Cerro Chirripó');
    expect(points).toEqual([
      { lat: 9.48, lng: -83.49, ele: 3200 },
      { lat: 9.49, lng: -83.5, ele: 3300 },
    ]);
  });

  it('accepts self-closing points, which carry no elevation', () => {
    const { points } = parseGpx(gpx('<trkpt lat="9.1" lon="-83.1"/><trkpt lat="9.2" lon="-83.2" />'));
    expect(points).toEqual([
      { lat: 9.1, lng: -83.1, ele: null },
      { lat: 9.2, lng: -83.2, ele: null },
    ]);
  });

  it('concatenates multiple track segments', () => {
    const xml = `<gpx version="1.1"><trk><name>Two</name>
      <trkseg>${trkpt(9.1, -83.1)}${trkpt(9.2, -83.2)}</trkseg>
      <trkseg>${trkpt(9.3, -83.3)}</trkseg>
    </trk></gpx>`;
    expect(parseGpx(xml).points).toHaveLength(3);
  });

  it('falls back to route points when the file has no track', () => {
    const xml = `<gpx version="1.1"><rte><name>Planned</name>
      <rtept lat="9.1" lon="-83.1"><ele>100</ele></rtept>
      <rtept lat="9.2" lon="-83.2"><ele>150</ele></rtept>
    </rte></gpx>`;
    const { points } = parseGpx(xml);
    expect(points).toHaveLength(2);
    expect(points[1].ele).toBe(150);
  });

  it('ignores standalone waypoints, which are POIs rather than a line', () => {
    const xml = `<gpx version="1.1">
      <wpt lat="9.0" lon="-83.0"><name>Parking</name></wpt>
      <trk><trkseg>${trkpt(9.1, -83.1)}${trkpt(9.2, -83.2)}</trkseg></trk>
    </gpx>`;
    const { points } = parseGpx(xml);
    expect(points).toHaveLength(2);
    expect(points[0].lat).toBe(9.1);
  });

  it('skips individual unusable points instead of failing the file', () => {
    const xml = gpx(
      [
        trkpt(9.1, -83.1),
        '<trkpt lat="999" lon="-83.15"></trkpt>',
        '<trkpt lon="-83.17"></trkpt>',
        '<trkpt lat="abc" lon="-83.18"></trkpt>',
        trkpt(9.2, -83.2),
      ].join('\n')
    );
    expect(parseGpx(xml).points).toHaveLength(2);
  });

  it('drops elevation readings that are physically impossible', () => {
    const { points } = parseGpx(gpx([trkpt(9.1, -83.1, 250000), trkpt(9.2, -83.2, 1200)].join('\n')));
    expect(points[0].ele).toBeNull();
    expect(points[1].ele).toBe(1200);
  });

  it('rejects a file that is not GPX at all', () => {
    expect(() => parseGpx('<html><body>nope</body></html>')).toThrow(GpxError);
    expect(() => parseGpx('<html></html>')).toThrow(/ERR_GPX_INVALID/);
  });

  it('rejects a track too short to be a line', () => {
    expect(() => parseGpx(gpx(trkpt(9.1, -83.1)))).toThrow(/ERR_GPX_EMPTY/);
  });

  it('decodes the predefined entities and CDATA in the name', () => {
    expect(parseGpx(gpx(trkpt(9.1, -83.1) + trkpt(9.2, -83.2), 'Bajos &amp; Cerros')).name).toBe(
      'Bajos & Cerros'
    );
    const cdata = gpx(trkpt(9.1, -83.1) + trkpt(9.2, -83.2), '<![CDATA[Río Celeste]]>');
    expect(parseGpx(cdata).name).toBe('Río Celeste');
  });

  it('leaves a declared entity as inert text rather than expanding it', () => {
    // The billion-laughs shape. Nothing here is resolved, so the payload
    // cannot expand and the track still parses.
    const xml = `<?xml version="1.0"?>
<!DOCTYPE gpx [<!ENTITY lol "haha"><!ENTITY lol2 "&lol;&lol;&lol;&lol;">]>
<gpx version="1.1"><trk><name>&lol2;</name><trkseg>
${trkpt(9.1, -83.1)}${trkpt(9.2, -83.2)}
</trkseg></trk></gpx>`;
    const { name, points } = parseGpx(xml);
    expect(points).toHaveLength(2);
    expect(name).toBe('&lol2;');
    expect(name).not.toContain('haha');
  });

  it('does not decode an entity smuggled through &amp;', () => {
    const { name } = parseGpx(gpx(trkpt(9.1, -83.1) + trkpt(9.2, -83.2), '&amp;lt;script&amp;gt;'));
    expect(name).toBe('&lt;script&gt;');
  });
});

describe('cumulativeDistances', () => {
  it('starts at zero and grows monotonically', () => {
    const points: GpxPoint[] = [
      { lat: 9.0, lng: -83.0, ele: null },
      { lat: 9.01, lng: -83.0, ele: null },
      { lat: 9.02, lng: -83.0, ele: null },
    ];
    const d = cumulativeDistances(points);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeGreaterThan(0);
    expect(d[2]).toBeGreaterThan(d[1]);
    // 0.01° of latitude is ~1.11 km.
    expect(d[1]).toBeGreaterThan(1000);
    expect(d[1]).toBeLessThan(1200);
  });
});

describe('routeStats', () => {
  const straightClimb = (): GpxPoint[] =>
    Array.from({ length: 50 }, (_, i) => ({ lat: 9 + i * 0.001, lng: -83, ele: 1000 + i * 10 }));

  it('reports distance, gain and the elevation range', () => {
    const points = straightClimb();
    const stats = routeStats(points, cumulativeDistances(points));
    expect(stats.distanceM).toBeGreaterThan(5000);
    // 49 steps of 10 m, minus what smoothing shaves off the ends.
    expect(stats.ascentM).toBeGreaterThan(400);
    expect(stats.ascentM).toBeLessThan(500);
    expect(stats.descentM).toBe(0);
    expect(stats.maxEleM! - stats.minEleM!).toBeGreaterThan(400);
  });

  it('does not invent ascent from elevation jitter on flat ground', () => {
    // A metre of noise per point — a naive sum of positive deltas would
    // report tens of metres of climbing here.
    const points: GpxPoint[] = Array.from({ length: 200 }, (_, i) => ({
      lat: 9 + i * 0.0001,
      lng: -83,
      ele: 100 + (i % 2 === 0 ? 1 : -1),
    }));
    const stats = routeStats(points, cumulativeDistances(points));
    expect(stats.ascentM).toBe(0);
    expect(stats.descentM).toBe(0);
  });

  it('returns null elevation figures when the file carries no readings', () => {
    const points: GpxPoint[] = [
      { lat: 9, lng: -83, ele: null },
      { lat: 9.01, lng: -83, ele: null },
    ];
    const stats = routeStats(points, cumulativeDistances(points));
    expect(stats.ascentM).toBeNull();
    expect(stats.maxEleM).toBeNull();
    expect(stats.distanceM).toBeGreaterThan(0);
  });

  it('computes a bounding box covering every point', () => {
    const points: GpxPoint[] = [
      { lat: 9.5, lng: -83.5, ele: null },
      { lat: 9.1, lng: -83.9, ele: null },
      { lat: 9.9, lng: -83.1, ele: null },
    ];
    expect(routeStats(points, cumulativeDistances(points)).bbox).toEqual([-83.9, 9.1, -83.1, 9.9]);
  });
});

describe('simplifyToBudget', () => {
  it('leaves a short track untouched', () => {
    const points: GpxPoint[] = [
      { lat: 9, lng: -83, ele: null },
      { lat: 9.1, lng: -83.1, ele: null },
    ];
    expect(simplifyToBudget(points)).toEqual([
      [-83, 9],
      [-83.1, 9.1],
    ]);
  });

  it('collapses a straight line to its endpoints', () => {
    const points: GpxPoint[] = Array.from({ length: 500 }, (_, i) => ({
      lat: 9 + i * 0.0001,
      lng: -83,
      ele: null,
    }));
    expect(simplifyToBudget(points, 100)).toHaveLength(2);
  });

  it('brings a dense wandering track under budget and keeps both ends', () => {
    const points: GpxPoint[] = Array.from({ length: 12_000 }, (_, i) => ({
      lat: 9 + i * 0.00002 + Math.sin(i / 3) * 0.0004,
      lng: -83 + Math.cos(i / 5) * 0.0004,
      ele: null,
    }));
    const simplified = simplifyToBudget(points, 500);
    expect(simplified.length).toBeLessThanOrEqual(500);
    // Close to the budget, not merely under it: the tolerance search
    // exists so a track spends its whole allowance on detail rather
    // than collapsing to a handful of points.
    expect(simplified.length).toBeGreaterThan(400);
    expect(simplified[0]).toEqual([points[0].lng, points[0].lat]);
    expect(simplified[simplified.length - 1]).toEqual([
      points[points.length - 1].lng,
      points[points.length - 1].lat,
    ]);
  });
});

describe('buildRoute', () => {
  it('produces geometry, a profile and stats from one file', () => {
    const body = Array.from({ length: 300 }, (_, i) =>
      trkpt(9 + i * 0.0002, -83 + i * 0.0001, 1000 + i * 4)
    ).join('\n');
    const route = buildRoute(gpx(body));

    expect(route.name).toBe('Cerro Chirripó');
    expect(route.pointCount).toBe(300);
    expect(route.coordinates.length).toBeGreaterThan(1);
    expect(route.profile).not.toBeNull();
    expect(route.profile![0][0]).toBe(0);
    expect(route.stats.distanceM).toBeGreaterThan(0);
    expect(route.stats.ascentM).toBeGreaterThan(1000);
  });

  it('leaves the profile null when the track has no elevation', () => {
    const body = Array.from({ length: 20 }, (_, i) => trkpt(9 + i * 0.001, -83)).join('\n');
    expect(buildRoute(gpx(body)).profile).toBeNull();
  });

  it('reports a profile that ends at the full distance', () => {
    const body = Array.from({ length: 100 }, (_, i) => trkpt(9 + i * 0.001, -83, 500 + i)).join('\n');
    const route = buildRoute(gpx(body));
    const lastSample = route.profile![route.profile!.length - 1];
    expect(lastSample[0]).toBe(route.stats.distanceM);
  });
});

describe('toGpxDocument', () => {
  it('round-trips through the parser', () => {
    const coordinates: [number, number][] = [
      [-83.0, 9.0],
      [-83.001, 9.001],
      [-83.002, 9.002],
    ];
    const profile: [number, number][] = [
      [0, 1000],
      [500, 1200],
    ];
    const xml = toGpxDocument('Chirripó', coordinates, profile);
    const { name, points } = parseGpx(xml);

    expect(name).toBe('Chirripó');
    expect(points).toHaveLength(3);
    expect(points[0].lat).toBeCloseTo(9.0, 5);
    expect(points[0].ele).toBe(1000);
    expect(points[2].ele).toBeGreaterThan(1000);
  });

  it('escapes a name that contains markup', () => {
    const xml = toGpxDocument('Cerro <b>&</b>', [[-83, 9]], null);
    expect(xml).toContain('<name>Cerro &lt;b&gt;&amp;&lt;/b&gt;</name>');
    expect(xml).not.toContain('<b>');
  });

  it('omits elevation when there is no profile', () => {
    const xml = toGpxDocument('Flat', [[-83, 9], [-83.001, 9.001]], null);
    expect(xml).not.toContain('<ele>');
    expect(parseGpx(xml).points[0].ele).toBeNull();
  });
});
