// Copies maplibre-gl's tile-parsing worker into public/ so it is served
// from this app's own origin.
//
// Turbopack (Next 16's dev bundler) doesn't resolve maplibre-gl's
// `new Worker(new URL(...), import.meta.url)` — the request falls through
// to Next's catch-all and comes back as an HTML 404, so the map mounts
// but never paints ("Failed to load module script: ... non-JavaScript
// MIME type of text/html").
//
// Pointing maplibregl.config.WORKER_URL at a CDN looks like it sidesteps
// the bundler, but a Worker can only ever be constructed from a
// same-origin script — the browser rejects a cross-origin one outright
// with a SecurityError, leaving every map blank. Serving the file
// ourselves is the only version of that workaround the platform allows.
//
// Copied from the installed package rather than pinned to a version
// string, so it cannot drift out of step with maplibre-gl.

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

// The worker is an ES module that relative-imports its shared chunk
// (`./maplibre-gl-shared.mjs`), so that sibling has to sit beside it in
// public/ or the worker loads and immediately 404s on its own import.
const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

async function main() {
  const pkg = require.resolve('maplibre-gl/package.json');
  const dist = join(dirname(pkg), 'dist');
  const publicDir = join(process.cwd(), 'public');
  await mkdir(publicDir, { recursive: true });

  for (const file of FILES) {
    const source = join(dist, file);
    await stat(source); // throws a clear ENOENT if the dist layout changes
    await copyFile(source, join(publicDir, file));
  }

  console.log(`maplibre worker → public/ (${FILES.join(', ')})`);
}

main().catch((error) => {
  console.error('Failed to sync the maplibre worker; maps will not render.');
  console.error(error);
  process.exit(1);
});
