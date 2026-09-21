/**
 * Capture review screenshots for the Impeccable finish review.
 *
 * Runs against the production build (`pnpm build && pnpm start`), not
 * the dev server: the dev HMR websocket is blocked in this environment,
 * which stalls hydration and would put un-hydrated pages in front of
 * the reviewer — a capture that shows a real defect the build does not
 * have is worse than no capture at all.
 *
 * Usage: node scripts/capture-review.mjs [baseUrl]
 */
// The project depends on `@playwright/test`, not the bare `playwright`
// package; the test runner re-exports the browser drivers.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const OUT = '.impeccable/review';

const TARGETS = [
  { name: 'home', path: '/es' },
  { name: 'feed', path: '/es/feed' },
  { name: 'trip', path: '/es/trips/09a7ed0a-3f06-4a11-a6b8-e4bdec46aeb2' },
  { name: 'login', path: '/es/login' },
];

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    // Settle entrance motion before capturing: an element still mid-
    // animation reads as a missing element and gets "fixed" into a
    // regression.
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  for (const target of TARGETS) {
    await page.goto(BASE + target.path, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForTimeout(900);

    const file =
      target.name === 'home'
        ? `${OUT}/${vp.label}.png`
        : `${OUT}/${vp.label}-${target.name}.png`;

    await page.screenshot({ path: file, fullPage: true });
    console.log('captured', file);
  }

  await context.close();
}

await browser.close();
console.log('done');
