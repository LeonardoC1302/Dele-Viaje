'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cordilleraMapStyle } from '@/lib/map-style';
import { useColorScheme } from '@/lib/use-color-scheme';
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

const SOURCE_ID = 'trips';
const CLUSTER_LAYER = 'trip-clusters';
const CLUSTER_COUNT_LAYER = 'trip-cluster-count';
const POINT_LAYER = 'trip-points';

// maplibre-gl doesn't ship its own geojson types and `@types/geojson`
// isn't installed — a minimal local shape is enough for what this file
// actually builds.
interface PointFeatureCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { id: string; title: string };
  }[];
}

function toGeoJSON(pins: TripMapPin[]): PointFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
      properties: { id: pin.id, title: pin.title },
    })),
  };
}

// GeoJSON source with cluster: true rather than one maplibregl.Marker DOM
// element per pin (the previous approach) — clustering only exists at the
// GeoJSON-source level in MapLibre, individually-placed DOM markers have
// no equivalent. At current trip volumes this rarely visibly clusters
// anything, but it's what keeps the feed map usable once pin density
// grows in a city instead of turning into an unreadable pile of
// overlapping dots.
export function TripMap({ pins }: { pins: TripMapPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scheme = useColorScheme();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // OpenFreeMap: free vector tiles, no API key (see docs/architecture.md
    // "free stack only" constraint).
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: cordilleraMapStyle(scheme),
      center: DEFAULT_CENTER,
      zoom: 7,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: toGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1B4332',
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 25, 26],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['Noto Sans Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      });

      map.addLayer({
        id: POINT_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#1B4332',
          'circle-radius': 9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('mouseenter', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', CLUSTER_LAYER, () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', POINT_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', POINT_LAYER, () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', CLUSTER_LAYER, async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const [lng, lat] = (features[0].geometry as { type: 'Point'; coordinates: [number, number] }).coordinates;
        map.easeTo({ center: [lng, lat], zoom });
      });

      map.on('click', POINT_LAYER, (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) router.push(`/trips/${id}`);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router is stable from next-intl's navigation wrapper; re-running this effect on it would tear down and rebuild the whole map for no reason.
  }, [scheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyData = () => {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(toGeoJSON(pins));

      if (pins.length === 0) return;
      const bounds = new maplibregl.LngLatBounds();
      for (const pin of pins) bounds.extend([pin.lng, pin.lat]);
      if (pins.length === 1) {
        map.jumpTo({ center: [pins[0].lng, pins[0].lat], zoom: 11 });
      } else {
        map.fitBounds(bounds, { padding: 48, maxZoom: 12 });
      }
    };

    if (map.isStyleLoaded() && map.getSource(SOURCE_ID)) applyData();
    else map.once('load', applyData);
  }, [pins]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full overflow-hidden rounded-md border border-sand-200 dark:border-sand-800"
    />
  );
}
