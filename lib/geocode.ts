// Nominatim (OSM) geocoding — free, no API key, but rate-limited and
// requires a descriptive User-Agent per their usage policy
// (https://operations.osmfoundation.org/policies/nominatim/). Only ever
// called server-side (trip creation), never from the client.
export interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'cr');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DeleViaje/1.0 (+https://github.com/deleviaje/trip-planner)' },
    });

    if (!res.ok) return null;

    const results = (await res.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) return null;

    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}
