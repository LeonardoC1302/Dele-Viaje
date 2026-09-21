/**
 * Cordillera map style.
 *
 * The maps were shipping OpenFreeMap's default "liberty" style — cool
 * grays, highway yellows and a foreign type stack — which made the
 * largest single element on the trip page the one region of the app
 * belonging to no world at all.
 *
 * This is the same free vector tile source, restyled onto the sand and
 * forest ramps: warm paper for land, a darker sand for roads, forest
 * for parks and water. It uses OpenFreeMap's public tiles (no key, no
 * account) exactly as before — only the paint changes.
 *
 * Kept deliberately sparse. A trip map answers "where do we meet" and
 * "what's the route"; it is not a navigation map, so most of the
 * default style's detail layers are noise competing with the pins.
 */

const TILES = 'https://tiles.openfreemap.org/planet';

/**
 * Palette pulled from tailwind.config.ts. Duplicated as literals because
 * MapLibre paints on a canvas and can't read CSS custom properties —
 * keep these in sync with the `sand` / `forest` scales.
 *
 * The dark set is not an inversion. It's the same mountain at night:
 * the ground stays on the warm end of the sand ramp rather than going
 * neutral black, and water/parks keep their forest identity at lower
 * lightness. A light map left on a dark page is the single most jarring
 * thing this component can do — it reads as a hole cut in the sheet.
 */
const LIGHT = {
  paper: '#fbf8f2', // sand-50
  paperSunk: '#f5f0e6', // sand-100
  hairline: '#eae2d3', // sand-200
  road: '#ffffff',
  roadEdge: '#d9cdb8', // sand-300
  ink: '#4c4132', // sand-700
  inkFaint: '#8e7e64', // sand-500
  water: '#b3dcd1', // forest-200
  park: '#d9ede8', // forest-100
};

const DARK = {
  paper: '#1a1611', // sand-900 — the folder face at night
  paperSunk: '#241e18',
  hairline: '#2e2720', // sand-800
  road: '#3a332a',
  roadEdge: '#241e18',
  ink: '#d9cdb8', // sand-300
  inkFaint: '#8e7e64', // sand-500
  water: '#081c15', // forest-700
  park: '#040f0a', // forest-800
};

/**
 * @param scheme which palette to paint. The app has no manual theme
 * toggle — dark mode follows `prefers-color-scheme` — so callers read
 * the media query and re-apply the style when it changes.
 */
export function cordilleraMapStyle(
  scheme: 'light' | 'dark' = 'light'
): maplibregl.StyleSpecification {
  const { paper: PAPER, paperSunk: PAPER_SUNK, hairline: HAIRLINE, road: ROAD, roadEdge: ROAD_EDGE, ink: INK, inkFaint: INK_FAINT, water: WATER, park: PARK } =
    scheme === 'dark' ? DARK : LIGHT;

  return {
    version: 8,
    // Sans-serif is one of the two faces every OpenMapTiles glyph set
    // ships; the display face isn't available to the canvas renderer.
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: TILES,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': PAPER } },
      {
        id: 'landuse',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        paint: { 'fill-color': PARK, 'fill-opacity': 0.55 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: { 'fill-color': PARK, 'fill-opacity': 0.7 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': WATER },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        paint: { 'fill-color': PAPER_SUNK, 'fill-outline-color': HAIRLINE },
      },
      {
        id: 'road-casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 9,
        paint: {
          'line-color': ROAD_EDGE,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 16, 7],
        },
      },
      {
        id: 'road',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 9,
        paint: {
          'line-color': ROAD,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 16, 5],
        },
      },
      {
        id: 'boundary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['<=', ['get', 'admin_level'], 4],
        paint: { 'line-color': ROAD_EDGE, 'line-width': 1, 'line-dasharray': [3, 2] },
      },
      {
        id: 'place-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14],
          'text-letter-spacing': 0.04,
          'text-max-width': 8,
        },
        paint: {
          'text-color': INK,
          'text-halo-color': PAPER,
          'text-halo-width': 1.5,
        },
      },
      {
        id: 'road-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'symbol-placement': 'line',
        },
        paint: {
          'text-color': INK_FAINT,
          'text-halo-color': PAPER,
          'text-halo-width': 1.5,
        },
      },
    ],
  } as maplibregl.StyleSpecification;
}

// Type-only import kept at the bottom so the runtime module stays free
// of a maplibre import (this file is pulled into client bundles that
// already load maplibre separately).
import type * as maplibregl from 'maplibre-gl';
