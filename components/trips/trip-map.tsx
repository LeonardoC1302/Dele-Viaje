'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRouter } from '@/i18n/navigation';

// Turbopack (Next 16's dev bundler) doesn't yet resolve maplibre-gl's
// `new Worker(new URL(...), import.meta.url)` tile-parsing worker — the
// request falls through to Next's catch-all route and comes back as an
// HTML 404 instead of the worker script ("Failed to load module script:
// ... non-JavaScript MIME type of text/html"), so the map mounts (canvas +
// controls render) but silently never paints any tiles. Pointing at the
// matching version's worker bundle on a CDN sidesteps the bundler
// entirely. Re-check whether this is still needed next time Turbopack or
// maplibre-gl is upgraded.
maplibregl.config.WORKER_URL =
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.10.0/dist/maplibre-gl-worker.mjs';

export interface TripMapPin {
  id: string;
  title: string;
  lat: number;
  lng: number;
}

// Costa Rica's rough center — used when there are no pins to fit bounds to.
const DEFAULT_CENTER: [number, number] = [-84.0, 9.7];

export function TripMap({ pins }: { pins: TripMapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // OpenFreeMap: free vector tiles, no API key (see docs/architecture.md
    // "free stack only" constraint).
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: DEFAULT_CENTER,
      zoom: 7,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const attach = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (pins.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();

      for (const pin of pins) {
        const el = document.createElement('button');
        el.type = 'button';
        el.setAttribute('aria-label', pin.title);
        el.className =
          'h-6 w-6 rounded-full border-2 border-white bg-forest-600 shadow-md cursor-pointer';
        el.addEventListener('click', () => router.push(`/trips/${pin.id}`));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(pin.title))
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([pin.lng, pin.lat]);
      }

      if (pins.length === 1) {
        map.jumpTo({ center: [pins[0].lng, pins[0].lat], zoom: 11 });
      } else {
        map.fitBounds(bounds, { padding: 48, maxZoom: 12 });
      }
    };

    if (map.isStyleLoaded()) attach();
    else map.once('load', attach);
  }, [pins, router]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
    />
  );
}
