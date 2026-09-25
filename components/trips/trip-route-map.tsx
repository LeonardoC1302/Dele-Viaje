'use client';

import { useEffect, useRef } from 'react';
// See lib/maplibre-worker for why maplibre is imported through it.
import { maplibregl } from '@/lib/maplibre-worker';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cordilleraMapStyle } from '@/lib/map-style';
import { useColorScheme } from '@/lib/use-color-scheme';



export interface TripRouteStop {
  label: string;
  lat: number;
  lng: number;
  kind?: 'meeting_point' | 'stop';
}

/** An imported hiking track (migration 0037), already simplified for drawing. */
export interface TripRouteLine {
  id: string;
  name: string;
  coordinates: [number, number][];
}

interface TripRouteMapProps {
  meetingPoint: TripRouteStop;
  waypoints: TripRouteStop[];
  routes?: TripRouteLine[];
}

const KIND_COLOR: Record<'meeting_point' | 'stop', string> = {
  meeting_point: 'bg-dawn-500',
  stop: 'bg-forest-600',
};

// Read-only: shows the meeting point plus any additional stops as a
// numbered route, for viewers of a trip (not the organizer editing it —
// see trip-map-editor.tsx for that).
export function TripRouteMap({ meetingPoint, waypoints, routes = [] }: TripRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scheme = useColorScheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const stops = [meetingPoint, ...waypoints];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: cordilleraMapStyle(scheme),
      center: [meetingPoint.lng, meetingPoint.lat],
      zoom: 11,
      interactive: true,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      if (stops.length >= 2) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: stops.map((s) => [s.lng, s.lat]) },
          },
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#1B4332', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
        });

        // Straight line renders immediately above; swap it for the actual
        // road route if OSRM's public demo server resolves one (see
        // lib/route.ts / PROJECT_STATUS.md's production-readiness notes —
        // not something to rely on staying up under real load).
        const coordsParam = stops.map((s) => `${s.lng},${s.lat}`).join(';');
        fetch(`/api/directions?coords=${encodeURIComponent(coordsParam)}`)
          .then((res) => res.json())
          .then((body) => {
            const routed = body?.coordinates as [number, number][] | null;
            if (!routed) return;
            const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
            source?.setData({
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routed },
            });
          })
          .catch(() => {});
      }

      const bounds = new maplibregl.LngLatBounds();

      // Imported hiking tracks. Drawn solid and heavier than the dashed
      // stop-to-stop connector above, so the two read as different
      // things — a walked line versus a sketched one — without spending
      // a second colour on it.
      routes.forEach((route) => {
        if (route.coordinates.length < 2) return;
        const sourceId = `hike-${route.id}`;
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.coordinates },
          },
        });
        // A pale casing under the line keeps it legible where the track
        // crosses dark forest fill or its own switchbacks.
        map.addLayer({
          id: `${sourceId}-casing`,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#f0f7f4', 'line-width': 6, 'line-opacity': 0.7 },
        });
        map.addLayer({
          id: sourceId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2D6A4F', 'line-width': 3 },
        });

        for (const coord of route.coordinates) bounds.extend(coord);
      });

      new maplibregl.Marker({ color: '#1B4332' })
        .setLngLat([meetingPoint.lng, meetingPoint.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(meetingPoint.label))
        .addTo(map);
      bounds.extend([meetingPoint.lng, meetingPoint.lat]);

      waypoints.forEach((wp, index) => {
        const el = document.createElement('div');
        el.className = `flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${KIND_COLOR[wp.kind ?? 'stop']} text-xs font-bold text-white`;
        el.textContent = String(index + 1);

        new maplibregl.Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(wp.label))
          .addTo(map);
        bounds.extend([wp.lng, wp.lat]);
      });

      // A single meeting point plus an imported track still needs
      // framing — the track is the thing worth seeing.
      if (stops.length > 1 || routes.length > 0) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
      }
    });

    return () => map.remove();
  }, [meetingPoint, waypoints, routes, scheme]);

  return (
    <div
      ref={containerRef}
      className="h-[320px] w-full overflow-hidden rounded-md border border-sand-200 dark:border-sand-800"
    />
  );
}
