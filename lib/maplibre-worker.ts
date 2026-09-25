import * as maplibregl from 'maplibre-gl';

/**
 * Points maplibre-gl at the worker we serve ourselves.
 *
 * Turbopack doesn't resolve maplibre-gl's own
 * `new Worker(new URL(...), import.meta.url)`: the request falls through
 * to Next's catch-all route and returns HTML, so the map mounts and then
 * silently never paints a tile. `scripts/sync-maplibre-worker.mjs`
 * copies the worker out of node_modules into public/ on predev and
 * prebuild, and this points at that copy.
 *
 * It has to be same-origin. A CDN URL looks like it would sidestep the
 * bundler just as well, but the browser refuses to construct a Worker
 * from another origin at all ("SecurityError: Script at ... cannot be
 * accessed from origin ..."), which leaves every map blank — a failure
 * that looks exactly like the bundler bug it was meant to fix.
 *
 * Imported for its side effect by every component that constructs a map,
 * so the config is set before any `new maplibregl.Map()` runs. Re-check
 * whether it is still needed on the next Turbopack or maplibre-gl bump:
 * deleting this module and its script should leave maps painting.
 */
maplibregl.config.WORKER_URL = '/maplibre-gl-worker.mjs';

export { maplibregl };
