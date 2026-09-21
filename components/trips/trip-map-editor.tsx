'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cordilleraMapStyle } from '@/lib/map-style';
import { useColorScheme } from '@/lib/use-color-scheme';
import {
  MagnifyingGlass,
  MapPinLine,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  Bus,
  Flag,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

// See components/trips/trip-map.tsx for why this is needed under Turbopack.
maplibregl.config.WORKER_URL =
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.10.0/dist/maplibre-gl-worker.mjs';

const DEFAULT_CENTER: [number, number] = [-84.0, 9.7];
const ROUTE_SOURCE_ID = 'trip-route-preview';

export type TripWaypointKind = 'meeting_point' | 'stop';

export interface TripWaypointInput {
  id: string;
  label: string;
  lat: number | null;
  lng: number | null;
  kind: TripWaypointKind;
}

const KIND_COLOR: Record<TripWaypointKind, string> = {
  meeting_point: 'bg-dawn-500',
  stop: 'bg-forest-600',
};

interface TripMapEditorProps {
  meetingPointName: string;
  meetingPointLat: number | null;
  meetingPointLng: number | null;
  onMeetingPointChange: (lat: number, lng: number) => void;
  waypoints: TripWaypointInput[];
  onWaypointsChange: (waypoints: TripWaypointInput[]) => void;
}

type ArmedTarget = 'meeting' | { waypointId: string } | null;

export function TripMapEditor({
  meetingPointName,
  meetingPointLat,
  meetingPointLng,
  onMeetingPointChange,
  waypoints,
  onWaypointsChange,
}: TripMapEditorProps) {
  const t = useTranslations('trips');
  const containerRef = useRef<HTMLDivElement>(null);
  const scheme = useColorScheme();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);
  const meetingMarkerRef = useRef<maplibregl.Marker | null>(null);
  const waypointMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const armedRef = useRef<ArmedTarget>(null);
  const stateRef = useRef({ meetingPointLat, meetingPointLng, waypoints });
  const callbacksRef = useRef({ onMeetingPointChange, onWaypointsChange });
  const routeRequestRef = useRef(0);
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [armed, setArmed] = useState<ArmedTarget>(null);
  const [searchingMeeting, setSearchingMeeting] = useState(false);
  const [searchingWaypoint, setSearchingWaypoint] = useState<string | null>(null);
  const [meetingNotFound, setMeetingNotFound] = useState(false);

  useLayoutEffect(() => {
    callbacksRef.current = { onMeetingPointChange, onWaypointsChange };
    armedRef.current = armed;
    stateRef.current = { meetingPointLat, meetingPointLng, waypoints };
  });

  function setRouteCoordinates(coords: [number, number][]) {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  // Draws the straight-line preview immediately (instant feedback while
  // dragging), then — after a short debounce so a drag or a burst of
  // clicks doesn't fire a request per pixel — asks OSRM's public demo
  // routing server for the actual road route and swaps the line to that
  // if it succeeds. Falls back to (and stays on) the straight line if
  // OSRM has nothing (e.g. no road between two points, or the demo server
  // is throttling) — see docs/route.ts and PROJECT_STATUS.md's production
  // readiness notes on why this can't be relied on for production traffic.
  function updateRoute() {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const { meetingPointLat, meetingPointLng, waypoints } = stateRef.current;

    const stops: { lat: number; lng: number }[] = [];
    if (meetingPointLat != null && meetingPointLng != null) {
      stops.push({ lat: meetingPointLat, lng: meetingPointLng });
    }
    for (const wp of waypoints) {
      if (wp.lat != null && wp.lng != null) stops.push({ lat: wp.lat, lng: wp.lng });
    }

    setRouteCoordinates(stops.length >= 2 ? stops.map((s): [number, number] => [s.lng, s.lat]) : []);

    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    if (stops.length < 2) return;

    const requestId = ++routeRequestRef.current;
    routeDebounceRef.current = setTimeout(async () => {
      const coordsParam = stops.map((s) => `${s.lng},${s.lat}`).join(';');
      const res = await fetch(`/api/directions?coords=${encodeURIComponent(coordsParam)}`);
      const body = await res.json().catch(() => null);
      const routed = body?.coordinates as [number, number][] | null;

      // Ignore stale responses if the points changed again while this was in flight.
      if (requestId !== routeRequestRef.current) return;
      if (routed) setRouteCoordinates(routed);
    }, 600);
  }

  function placeMeetingMarker(position: [number, number]) {
    const map = mapRef.current;
    if (!map) return;
    if (meetingMarkerRef.current) {
      meetingMarkerRef.current.setLngLat(position);
      return;
    }
    const marker = new maplibregl.Marker({ draggable: true, color: '#1B4332' })
      .setLngLat(position)
      .setPopup(new maplibregl.Popup({ offset: 16 }).setText(meetingPointName || t('mapMeetingPoint')))
      .addTo(map);
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      callbacksRef.current.onMeetingPointChange(lat, lng);
      updateRoute();
    });
    meetingMarkerRef.current = marker;
  }

  function placeWaypointMarker(waypointId: string, position: [number, number]) {
    const map = mapRef.current;
    if (!map) return;
    const existing = waypointMarkersRef.current.get(waypointId);
    if (existing) {
      existing.setLngLat(position);
      return;
    }

    const index = stateRef.current.waypoints.findIndex((wp) => wp.id === waypointId);
    const kind = stateRef.current.waypoints[index]?.kind ?? 'stop';
    const el = document.createElement('div');
    el.className = cn(
      'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white cursor-grab',
      KIND_COLOR[kind]
    );
    el.textContent = String(index + 1);

    const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(position).addTo(map);
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      const next = stateRef.current.waypoints.map((wp) =>
        wp.id === waypointId ? { ...wp, lat, lng } : wp
      );
      callbacksRef.current.onWaypointsChange(next);
      updateRoute();
    });
    waypointMarkersRef.current.set(waypointId, marker);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: cordilleraMapStyle(scheme),
      center:
        meetingPointLat != null && meetingPointLng != null
          ? [meetingPointLng, meetingPointLat]
          : DEFAULT_CENTER,
      zoom: meetingPointLat != null && meetingPointLng != null ? 11 : 7,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: ROUTE_SOURCE_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#1B4332',
          'line-width': 2.5,
          'line-dasharray': [2, 1.5],
        },
      });

      mapReadyRef.current = true;

      const { meetingPointLat, meetingPointLng, waypoints } = stateRef.current;
      if (meetingPointLat != null && meetingPointLng != null) {
        placeMeetingMarker([meetingPointLng, meetingPointLat]);
      }
      for (const wp of waypoints) {
        if (wp.lat != null && wp.lng != null) {
          placeWaypointMarker(wp.id, [wp.lng, wp.lat]);
        }
      }
      updateRoute();
    });

    map.on('click', (e) => {
      const target = armedRef.current;
      if (!target) return;
      const { lng, lat } = e.lngLat;

      if (target === 'meeting') {
        placeMeetingMarker([lng, lat]);
        callbacksRef.current.onMeetingPointChange(lat, lng);
      } else {
        placeWaypointMarker(target.waypointId, [lng, lat]);
        const next = stateRef.current.waypoints.map((wp) =>
          wp.id === target.waypointId ? { ...wp, lat, lng } : wp
        );
        callbacksRef.current.onWaypointsChange(next);
      }

      armedRef.current = null;
      setArmed(null);
      updateRoute();
    });

    const waypointMarkers = waypointMarkersRef.current;
    return () => {
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
      meetingMarkerRef.current = null;
      waypointMarkers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is initialized once; all state changes flow through the markers/route effect below instead.
  }, [scheme]);

  // Keep marker numbers, presence, and the route line in sync with props
  // (covers: reordering, removing, and coordinates arriving via search).
  useEffect(() => {
    if (!mapReadyRef.current) return;

    const currentIds = new Set(waypoints.map((wp) => wp.id));
    for (const [id, marker] of waypointMarkersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        waypointMarkersRef.current.delete(id);
      }
    }

    waypoints.forEach((wp, index) => {
      if (wp.lat == null || wp.lng == null) return;
      const existing = waypointMarkersRef.current.get(wp.id);
      if (existing) {
        existing.setLngLat([wp.lng, wp.lat]);
        const el = existing.getElement();
        el.textContent = String(index + 1);
        el.className = cn(
          'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white cursor-grab',
          KIND_COLOR[wp.kind]
        );
      } else {
        placeWaypointMarker(wp.id, [wp.lng, wp.lat]);
      }
    });

    if (meetingPointLat != null && meetingPointLng != null) {
      placeMeetingMarker([meetingPointLng, meetingPointLat]);
    }

    updateRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- placeMeetingMarker/placeWaypointMarker/updateRoute close over refs, not reactive state; re-running on those identities would be a no-op loop.
  }, [waypoints, meetingPointLat, meetingPointLng]);

  const toggleArm = (target: ArmedTarget) => {
    setArmed((prev) => {
      const same =
        prev === target ||
        (typeof prev === 'object' &&
          typeof target === 'object' &&
          prev?.waypointId === target?.waypointId);
      return same ? null : target;
    });
  };

  const searchMeeting = async () => {
    if (!meetingPointName.trim()) return;
    setSearchingMeeting(true);
    setMeetingNotFound(false);
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(meetingPointName)}`);
    const body = await res.json().catch(() => null);
    const result = body?.result as { lat: number; lng: number } | null;
    setSearchingMeeting(false);

    if (!result) {
      setMeetingNotFound(true);
      return;
    }

    mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 12 });
    placeMeetingMarker([result.lng, result.lat]);
    onMeetingPointChange(result.lat, result.lng);
    updateRoute();
  };

  const searchWaypoint = async (waypointId: string, label: string) => {
    if (!label.trim()) return;
    setSearchingWaypoint(waypointId);
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(label)}`);
    const body = await res.json().catch(() => null);
    const result = body?.result as { lat: number; lng: number } | null;
    setSearchingWaypoint(null);

    if (!result) return;

    mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 12 });
    onWaypointsChange(
      waypoints.map((wp) => (wp.id === waypointId ? { ...wp, lat: result.lat, lng: result.lng } : wp))
    );
  };

  const addWaypoint = (kind: TripWaypointKind) => {
    const id = crypto.randomUUID();
    onWaypointsChange([...waypoints, { id, label: '', lat: null, lng: null, kind }]);
    setArmed({ waypointId: id });
  };

  const toggleWaypointKind = (id: string) => {
    onWaypointsChange(
      waypoints.map((wp) =>
        wp.id === id
          ? { ...wp, kind: wp.kind === 'meeting_point' ? 'stop' : 'meeting_point' }
          : wp
      )
    );
  };

  const removeWaypoint = (id: string) => {
    onWaypointsChange(waypoints.filter((wp) => wp.id !== id));
    if (armed && typeof armed === 'object' && armed.waypointId === id) setArmed(null);
  };

  const moveWaypoint = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= waypoints.length) return;
    const next = [...waypoints];
    [next[index], next[target]] = [next[target], next[index]];
    onWaypointsChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium text-sand-900 dark:text-sand-100">
            {t('mapLocationLabel')}
          </label>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              isLoading={searchingMeeting}
              onClick={searchMeeting}
              className="shrink-0"
            >
              <MagnifyingGlass size={14} weight="regular" strokeWidth={1.5} />
              {t('mapLocationSearch')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant={armed === 'meeting' ? 'primary' : 'secondary'}
              onClick={() => toggleArm('meeting')}
              className="shrink-0"
            >
              <MapPinLine size={14} weight="regular" strokeWidth={1.5} />
              {t('mapPlaceOnMap')}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-sand-600 dark:text-sand-400">
          {t('mapLocationHelper')}
        </p>
        {meetingNotFound && (
          <p className="mt-1 text-xs text-dawn-700 dark:text-dawn-400">
            {t('mapLocationNotFound')}
          </p>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-[320px] w-full overflow-hidden rounded-md border border-sand-300 dark:border-sand-700"
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium text-sand-900 dark:text-sand-100">
            {t('waypointsLabel')}
          </label>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => addWaypoint('meeting_point')}
              className="shrink-0"
            >
              <Bus size={14} weight="bold" />
              {t('waypointsAddMeetingPoint')}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => addWaypoint('stop')}
              className="shrink-0"
            >
              <Plus size={14} weight="bold" />
              {t('waypointsAddStop')}
            </Button>
          </div>
        </div>
        <p className="text-xs text-sand-600 dark:text-sand-400">{t('waypointsHelper')}</p>

        {waypoints.length > 0 && (
          <ul className="flex flex-col gap-3">
            {waypoints.map((wp, index) => {
              const isArmed = typeof armed === 'object' && armed?.waypointId === wp.id;
              return (
                <li
                  key={wp.id}
                  className={cn(
                    'flex flex-col gap-3 rounded-md border border-sand-200 p-3 dark:border-sand-800',
                    isArmed && 'border-forest-500 bg-forest-50/50 dark:bg-forest-950/30'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                          KIND_COLOR[wp.kind]
                        )}
                      >
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleWaypointKind(wp.id)}
                        title={t('waypointKindToggleHint')}
                        className={cn(
                          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                          wp.kind === 'meeting_point'
                            ? 'bg-dawn-50 text-dawn-800 hover:bg-dawn-100 dark:bg-dawn-900/40 dark:text-dawn-200 dark:hover:bg-dawn-900/60'
                            : 'bg-forest-50 text-forest-700 hover:bg-forest-100 dark:bg-forest-950 dark:text-forest-300 dark:hover:bg-forest-900'
                        )}
                      >
                        {wp.kind === 'meeting_point' ? (
                          <Bus size={14} weight="regular" strokeWidth={1.5} />
                        ) : (
                          <Flag size={14} weight="regular" strokeWidth={1.5} />
                        )}
                        {wp.kind === 'meeting_point' ? t('waypointKindMeetingPoint') : t('waypointKindStop')}
                      </button>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveWaypoint(index, -1)}
                        aria-label={t('waypointMoveUp')}
                      >
                        <ArrowUp size={14} weight="bold" />
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={index === waypoints.length - 1}
                        onClick={() => moveWaypoint(index, 1)}
                        aria-label={t('waypointMoveDown')}
                      >
                        <ArrowDown size={14} weight="bold" />
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => removeWaypoint(wp.id)}
                        aria-label={t('waypointRemove')}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <Trash size={14} weight="regular" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>

                  <Input
                    value={wp.label}
                    placeholder={t('waypointPlaceholder')}
                    onChange={(e) =>
                      onWaypointsChange(
                        waypoints.map((w) => (w.id === wp.id ? { ...w, label: e.target.value } : w))
                      )
                    }
                    className="h-9 w-full"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      isLoading={searchingWaypoint === wp.id}
                      onClick={() => searchWaypoint(wp.id, wp.label)}
                    >
                      <MagnifyingGlass size={14} weight="regular" strokeWidth={1.5} />
                      {t('mapLocationSearch')}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={isArmed ? 'primary' : 'secondary'}
                      onClick={() => toggleArm({ waypointId: wp.id })}
                    >
                      <MapPinLine size={14} weight="regular" strokeWidth={1.5} />
                      {t('mapPlaceOnMap')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
