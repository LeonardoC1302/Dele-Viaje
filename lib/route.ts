// OSRM's public demo server — free, no API key, but explicitly for
// light/evaluation use only (no uptime guarantee, can throttle or block
// heavy traffic): https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
// See PROJECT_STATUS.md's "Production readiness" section — this is one of
// the pieces that needs a real (self-hosted or paid) routing provider
// before this app could take real production traffic. Only ever called
// server-side (via /api/directions), never directly from the client.
export interface RouteStop {
  lat: number;
  lng: number;
}

// [lng, lat] pairs, GeoJSON order — matches what the map layer expects.
export async function fetchRoutePath(stops: RouteStop[]): Promise<[number, number][] | null> {
  if (stops.length < 2) return null;

  const coordsParam = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      code: string;
      routes?: { geometry: { coordinates: [number, number][] } }[];
    };

    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return data.routes[0].geometry.coordinates;
  } catch (error) {
    console.error('OSRM routing failed:', error);
    return null;
  }
}
