'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// See components/trips/trip-map.tsx for why this is needed under Turbopack.
maplibregl.config.WORKER_URL =
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.10.0/dist/maplibre-gl-worker.mjs';

export interface TripRouteStop {
  label: string;
  lat: number;
  lng: number;
  kind?: 'meeting_point' | 'stop';
}

interface TripRouteMapProps {
  meetingPoint: TripRouteStop;
  waypoints: TripRouteStop[];
}

const KIND_COLOR: Record<'meeting_point' | 'stop', string> = {
  meeting_point: 'bg-sky-600',
  stop: 'bg-forest-600',
};

// Read-only: shows the meeting point plus any additional stops as a
// numbered route, for viewers of a trip (not the organizer editing it —
// see trip-map-editor.tsx for that).
export function TripRouteMap({ meetingPoint, waypoints }: TripRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const stops = [meetingPoint, ...waypoints];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
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

      new maplibregl.Marker({ color: '#1B4332' })
        .setLngLat([meetingPoint.lng, meetingPoint.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(meetingPoint.label))
        .addTo(map);
      bounds.extend([meetingPoint.lng, meetingPoint.lat]);

      waypoints.forEach((wp, index) => {
        const el = document.createElement('div');
        el.className = `flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${KIND_COLOR[wp.kind ?? 'stop']} text-xs font-bold text-white shadow-md`;
        el.textContent = String(index + 1);

        new maplibregl.Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(wp.label))
          .addTo(map);
        bounds.extend([wp.lng, wp.lat]);
      });

      if (stops.length > 1) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 13 });
      }
    });

    return () => map.remove();
  }, [meetingPoint, waypoints]);

  return (
    <div
      ref={containerRef}
      className="h-[320px] w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
    />
  );
}
