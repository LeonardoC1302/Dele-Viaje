# Dele Viaje — Project Status

Living log of what's actually built, for picking this up in a fresh session.
Source of truth for *intent* is still `docs/PRD.md`, `docs/architecture.md`,
`docs/data-model.md`, `docs/api.md`, `docs/roadmap.md` — this file tracks
*what's real right now* versus what those docs describe as the target.
Supersedes the old `PHASE0_STATUS.md` (deleted, this file replaces it).

Last updated: 2026-09-17 (added notifications).

---

## Stack as actually wired up

- Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4
- Supabase (Postgres + Auth + Realtime), via `@supabase/ssr`
- `next-intl` for i18n — **every route lives under `app/[locale]/...`**, locales `es` (default) / `en`, always prefixed
- next-intl request locale persisted via `NEXT_LOCALE` cookie (needed for locale-aware redirects from plain Route Handlers, which sit outside `[locale]`)
- Radix UI primitives (`react-select`, `react-popover`, `react-dialog`) + `react-day-picker` for fully custom form controls (no native `<select>`/`<input type=date>` chrome anywhere) and confirmation modals
- GSAP (`ScrollTrigger`) for the homepage hero parallax; Motion (`motion/react`) for simple scroll-reveal elsewhere
- Phosphor icons (`strokeWidth 1.5` everywhere), `class-variance-authority` for the `Button` variants
- Vitest (unit) + a starter suite in `lib/*.test.ts`; Playwright installed but no e2e specs written yet
- GitHub Actions CI (`.github/workflows/ci.yml`): lint → typecheck → test on every push/PR

## Design system

Locked in `docs/design-taste.md`: Forest Green `#1B4332` single accent, Geist
font, 16px cards / pill buttons / 8px inputs, Phosphor icons. Taste skill
(`design-taste-frontend`) is supposed to gate every UI change — keep loading
it before touching visual code.

**Known footgun already hit once:** `app/globals.css` had a bare `a { color:
... }` rule outside any `@layer`, which under CSS Cascade Layers beats *any*
Tailwind utility class regardless of specificity. It's now wrapped in
`@layer base`. If a `<Link>`-rendered button ever looks like it's ignoring
its `text-*` class, check this file first before touching the component.

---

## ⚠️ Production readiness — things that work now but wouldn't hold up

Everything below runs fine at hobby/MVP traffic (a handful of real users
testing this out) but has a real, known ceiling. None of this blocks
continuing to build features — it's a checklist for *if this becomes a real
app people actually rely on*, so a future session (or you) can see the gap
at a glance instead of discovering it in an outage.

| Dependency | Used for | Why it won't hold up in production | What real production needs |
|---|---|---|---|
| **Nominatim** (`lib/geocode.ts`) | Geocoding a typed address → lat/lng | Public OSM server, official usage policy caps it at ~1 request/second, asks for "light use" only, and can silently rate-limit or block without warning. No uptime SLA. | A paid geocoding provider (Mapbox, Google, LocationIQ) or a self-hosted Nominatim instance. |
| **OSRM demo server** (`lib/route.ts`) | Drawing the actual road route between a trip's meeting point(s)/stops | `router.project-osrm.org` is explicitly documented as a demo/evaluation service only — no SLA, can throttle or block heavy traffic, has gone down before with no notice. | Self-hosted OSRM (free software, but you run + maintain the server and map data) or a paid routing API (Mapbox Directions, Google Routes). |
| **maplibre-gl worker CDN pin** (`trip-map*.tsx`) | Loading maplibre-gl's tile-parsing Web Worker | Hardcoded to `cdn.jsdelivr.net/npm/maplibre-gl@6.10.0/...` — a Turbopack bundler limitation workaround (see the map view entry above), **not version-linked to `package.json`**. Bumping the `maplibre-gl` dependency without updating this URL by hand will silently keep loading the old worker version. | Re-check whether Turbopack resolves bundler-spawned workers correctly on each Next.js upgrade; drop the CDN pin the moment it does. |
| **Supabase free tier** | Database, Auth, Realtime, file storage | 500MB database, 1GB storage, limited concurrent Realtime connections, and (notably) **free projects pause after a week of no API activity** — would silently take the whole app offline. | Supabase Pro plan (usage-based, no pause, higher limits) once there's real traffic. |
| **Hosting free tier** (Vercel/Cloudflare, per `docs/architecture.md`) | Running the Next.js app | Free tiers cap bandwidth and function-execution minutes; cold starts on serverless functions add latency under low/bursty traffic. | A paid hosting tier sized to actual traffic. |
| **Resend free tier** | Email notifications (not wired up yet — see "Not started" below) | 100 emails/day, 3,000/month on the free tier — fine for testing, not for a real user base doing trip reminders + notifications. | Resend paid tier (or another provider) once email volume is real. |
| **Google OAuth consent screen** | "Sign in with Google" | Currently in an unverified state (typical for a new project) — Google caps unverified apps at 100 test users and shows an "unverified app" warning to everyone else. | Submit the OAuth consent screen for Google's verification review before opening sign-ups beyond a small test group. |
| **GitHub Actions CI** | Lint/typecheck/test on every push | Free minutes are generous for a solo repo (and unlimited for public repos) — low risk, but a private repo with a bigger team/more CI runs could hit the free-minutes cap. | GitHub Team/paid minutes if the repo goes private with heavier CI usage. |

**Not flagged — these are fine at real production scale as-is:**
**OpenFreeMap** (`trip-map*.tsx`, map tiles): unlike Nominatim/OSRM, OpenFreeMap's whole premise is free tile hosting *with production use explicitly intended*, not a rate-limited demo. Self-hosting is also a documented option if you ever want to remove even that dependency, but it isn't required.

---

## Phase 0 — Foundations: DONE

- [x] Homepage (`app/[locale]/page.tsx`): hero with GSAP-parallax abstract
      blob layers (`components/landing/canopy-blobs.tsx`, NOT literal
      trees/leaves — that was tried and explicitly rejected in favor of
      abstract multi-tone shapes), how-it-works bento, agencies CTA,
      waitlist capture (UI only, not wired to a real backend list yet),
      footer. Fully bilingual.
- [x] Auth: Google OAuth + email/password via Supabase Auth. Server Actions
      (`app/actions/auth.ts`) for login/signup, route handlers for
      `/api/auth/callback` (PKCE + OAuth) and `/api/auth/signout`.
      Locale-aware redirects throughout.
- [x] Onboarding (`/onboarding`): display name, language, interest
      categories → `PATCH /api/onboarding`. Gates access to trip creation
      until `profiles.onboarding_done = true`.
- [x] `profiles` table + `handle_new_user()` trigger + RLS. Public-safe
      fields exposed via `profiles_public()` **function** (not a view —
      Supabase's linter flags bare views that bypass RLS as "Security
      Definer View"; a `SECURITY DEFINER` function doesn't trigger that
      check and is the idiomatic fix).
- [x] i18n: `next-intl`, `messages/es.json` + `messages/en.json`, locale
      switcher in the navbar, `proxy.ts` combines next-intl's locale
      routing with Supabase session refresh in one middleware.
- [x] PWA: `app/manifest.ts`, `app/icon.tsx` / `app/apple-icon.tsx` /
      `app/icons/icon-192|512` (all generated via `next/og` `ImageResponse`
      from one shared renderer, `lib/app-icon.tsx` — no external asset
      tooling needed; renders a simple evergreen-tree glyph on the forest
      accent color, not a letter monogram), `public/sw.js` (minimal, no
      offline caching strategy yet — that's still an open question per
      `docs/architecture.md`), iOS install hint banner.
- [x] CI, ESLint (was silently broken most of Phase 0 — was using
      `FlatCompat` to wrap a legacy config string against a version of
      `eslint-config-next` that already ships native flat-config arrays;
      fixed).

## Phase 1 — Social Core: DONE (core features; notifications delivery deferred)

- [x] **Trips**: `trips` table (schema supports `type: tour` and
      `visibility: private` per the data model, but only `social` +
      `public` trips are actually creatable right now — tours need
      agencies (Phase 2), private plans are Phase 3).
  - Create: `/trips/new` (protected: login + onboarding required) →
    `POST /api/trips`. Publishes immediately, no draft state yet.
  - **Edit: `/trips/[id]/edit` (organizer-only) → `PATCH /api/trips/[id]`.**
    `TripForm` (`components/trips/trip-form.tsx`) takes a `mode: 'create' |
    'edit'` prop and is shared between both routes rather than having a
    separate edit form — same fields, same validation
    (`lib/validators/trip.ts`), just a different HTTP verb/endpoint and
    pre-filled state. The PATCH route re-checks `owner_id` server-side for
    a clean 403 (RLS's `trips: owner updates own` policy is the real
    enforcement either way). An "Edit trip" link/icon shows on the trip
    detail page only for the organizer, in the same slot the report button
    occupies for everyone else.
  - Discovery feed: `/feed` (public), category filter via URL query,
    proper empty states, List/Map toggle (see the map view entry below).
  - Detail: `/trips/[id]`.
  - **Multi-stop map editor** (`components/trips/trip-map-editor.tsx`),
    used by both the create and edit forms. Superseded the original
    single-pin `location-picker.tsx` (deleted) after user feedback that
    (a) a trip's meeting point and its actual destination(s) aren't
    necessarily the same place, and (b) some trips visit multiple spots
    and want them shown in order. Now: the meeting point (still
    `trips.location_name`/`lat`/`lng` — unchanged schema) gets its own
    distinct pin-shaped marker, and an "Otras paradas" (other stops)
    section lets the organizer add any number of additional named,
    geocoded stops, stored in a new **`trip_waypoints`** table (migration
    `0014`, organizer-write RLS, ordered by `sort`). Each point (meeting
    point or stop) can be located via `GET /api/geocode?q=...` (an
    authenticated proxy around `lib/geocode.ts`'s Nominatim call) or
    placed manually — every row has its own "Ubicar en el mapa" toggle
    that arms the map so the *next click* sets that specific point (added
    deliberately, not free-click-anywhere, because with multiple points on
    one map an unscoped click would be ambiguous about which pin it's
    supposed to move). Stops are numbered 1, 2, 3... and a dashed
    `LineString` layer previews the route from the meeting point through
    each stop in list order — reorderable via up/down buttons (no
    drag-and-drop list reordering, just the two buttons, to keep it
    simple). `POST /api/trips` / `PATCH /api/trips/[id]` accept a
    `waypoints[]` array alongside the existing meeting-point fields; edit
    replaces the whole set (delete-then-reinsert, not diffed — organizer-
    only writes, no concurrent-editor race to worry about, so this is fine
    at MVP scale). Viewers see the same numbered-route rendering read-only
    on the trip detail page via `components/trips/trip-route-map.tsx`
    (only shown if the meeting point has coordinates).
  - **Bug fixed, then redesigned**: each waypoint row's flex children
    (number badge, kind toggle, label input, search/place/reorder/delete
    buttons — 8 items crammed into one line) had no shrink/grow rules, so
    the row's natural content width sat right at the card's edge
    (`max-w-[560px]`) — clicking "Buscar" added a loading spinner to that
    button, growing it by ~20px, enough to push the row (and the delete
    button specifically, being last) past the card border. The first fix
    (`flex-1` input + `shrink-0` buttons + `flex-wrap`) stopped the
    overflow but produced its own ugly result: an accidental second line
    with just two orphaned icon buttons on it. Replaced with an
    intentional 3-row card per waypoint instead of one packed row: **row
    1** — number badge, a labeled kind pill/toggle ("Punto de encuentro" /
    "Parada", not just an icon) on the left, reorder + delete icons
    grouped on the right (`justify-between`, itself `flex-wrap` so on
    mobile the icon group drops to its own line below the pill rather
    than the pill text wrapping); **row 2** — the full-width label input;
    **row 3** — the "Buscar" / "Ubicar en el mapa" buttons, now with
    visible text labels instead of icon-only. Verified at both 560px
    (desktop card width) and 375px (mobile) — no overflow, no orphaned
    icons at either size.
  - **Multiple meeting points** (migration `0015`): `trip_waypoints` got a
    `kind: 'meeting_point' | 'stop'` column, default `'stop'`. Real-world
    driver: several Costa Rica tour operators run a rented bus that picks
    people up at multiple points across the country before reaching the
    actual destination — a single meeting point wasn't enough. Each row in
    the "Puntos adicionales" list has a bus/flag toggle button to mark it
    as a meeting point or a stop; both kinds live in the *same* ordered
    list (not two separate lists) so they stay freely reorderable relative
    to each other via the existing up/down buttons — matches the real
    sequence (pickup → pickup → pickup → arrive). Meeting-point markers
    render in blue (`bg-sky-600`), stops in the existing forest green, on
    both the editor map and the read-only `trip-route-map.tsx`. The
    trip's required `location_name`/`lat`/`lng` on `trips` is unchanged
    and always the *first* meeting point in the sequence — it is not
    itself reorderable relative to the `trip_waypoints` entries (would
    need unifying it into the same table to allow that; not done, see
    below).
  - **Still true from before**: `POST /api/trips` / `PATCH
    /api/trips/[id]` prefer client-supplied meeting-point `lat`/`lng` and
    only fall back to a server-side geocode if the client didn't send any.
    Trips created before any of this existed, or whose geocode never
    matched, still have no coordinates and won't get any retroactively —
    fix is to open `/trips/[id]/edit` and locate the meeting point (and
    optionally add stops) there, no bulk backfill.
  - **Real road routing** (`lib/route.ts`, `GET /api/directions`): the
    dashed line draws instantly as a straight-line preview, then — after a
    600ms debounce so dragging a marker doesn't fire a request per pixel —
    asks OSRM's public demo server for the actual road route between all
    points in order, and swaps to that if it resolves. Falls back to (and
    silently stays on) the straight line if OSRM has nothing or is
    throttling. `/api/directions` is an authenticated proxy (same reasoning
    as `/api/geocode`: don't let this app be an open, unrate-limited relay
    to a third party). **Flagged in the production-readiness table above**
    — the OSRM public demo server explicitly isn't meant for production
    load.
- [x] **RSVP / waitlist** (`attendees` table, migrations `0004`–`0006`):
  - `join_trip()` / `leave_trip()` Postgres functions, `SECURITY DEFINER`,
    each takes a per-trip `pg_advisory_xact_lock` so concurrent joins on
    the last seat can't oversell. Waitlist auto-promotes the
    longest-waiting attendee when a confirmed spot frees up.
  - **Bug already hit and fixed**: `join_trip()` was originally `returns
    table (status text)`, which implicitly declares a PL/pgSQL variable
    named `status` — that collided with unqualified `status` column
    references in the function body ("column reference is ambiguous").
    Fixed by returning a plain `text` scalar instead (migration `0005`).
  - `trips.confirmed_count` is kept in sync via an `AFTER INSERT OR UPDATE
    OR DELETE` trigger on `attendees`, not maintained manually.
  - `JoinTripButton` (`components/trips/join-trip-button.tsx`) handles all
    states: logged out, organizer (no self-RSVP), confirmed, waitlisted,
    full, trip already started. Leaving requires confirmation (`Dialog`,
    destructive-red confirm button) and the trigger is deliberately tucked
    into the bottom-right corner of the trip card (not in the primary
    action row) since it's a rare, destructive action — the card has
    reserved bottom padding (`pb-16`) so the absolutely-positioned corner
    button can never overlap the attendee list above it.
  - `AttendeeList` shows confirmed attendees publicly on published public
    trips (this needed its own RLS policy, `0006` — the original policy
    only let you see your own row or, if organizer, everyone's).
- [x] **Chat** (`messages` table, migration `0007`):
  - Realtime per-trip room via Supabase `postgres_changes` (INSERT +
    UPDATE subscriptions), enabled via `alter publication
    supabase_realtime add table messages`.
  - Access: organizer + confirmed attendees can read & send; waitlisted
    attendees can read only (per PRD §4.4); enforced via
    `is_trip_participant()` RLS helper.
  - Delete is **soft** (`deleted_at`), sender or organizer only. Enforced
    two ways: RLS row policy *and* a column-level `GRANT UPDATE
    (deleted_at)` — without the column grant, the broad row-level UPDATE
    policy would technically let a sender/organizer rewrite `body` too.
  - `/trips/[id]/chat` page, "Open Chat" link on the trip detail page
    (visible to organizer + confirmed + waitlisted only).
  - **Bug already hit and fixed**: `ChatRoom` originally called
    `createClient()` (browser client) fresh in three separate places
    (the realtime subscription effect, send, delete). Realtime needs the
    async auth session to resolve and call `realtime.setAuth()` before a
    channel is opened; creating a client and immediately subscribing on it
    races that, so the channel can connect as anonymous and silently
    receive zero `postgres_changes` events (RLS requires `auth.uid()`).
    Symptom: messages sent fine but never appeared live, not even for the
    sender, only after a full reload. Fixed by creating **one** client per
    component (`useState(() => createClient())`) and explicitly awaiting
    `supabase.auth.getSession()` before calling `.channel(...).subscribe()`.
    Also added optimistic local append on send so the sender never
    depends on the realtime round-trip for their own message.
  - **Not implemented**: message editing, system-event messages
    (join/left/promoted announcements as chat rows — PRD calls for this,
    deliberately deferred), `chat_settings` (WhatsApp link,
    announcements-only, mute).
- [x] **Notifications — in-app inbox only** (`notifications` table,
      migration `0008`). Web Push, Resend email, and T-24h/T-2h reminders
      are still not implemented — only the in-app bell.
  - Three triggers write rows server-side (users never insert directly,
    only `select`/mark-as-read via RLS): `trip_joined` (attendee confirms
    a seat → notifies the trip owner, skipped for waitlisted joins),
    `waitlist_promoted` (waitlisted → confirmed transition → notifies that
    attendee), `new_message` (new chat row → notifies owner + all
    confirmed/waitlisted attendees except the sender).
  - `NotificationBell` (`components/notifications/notification-bell.tsx`)
    lives in the `(main)` route group's header
    (`app/[locale]/(main)/layout.tsx`) — logged-in pages only, not the
    homepage's separate `Navbar`. Initial list + related actor
    profiles/trip titles are fetched server-side in the layout and passed
    down; live updates come over a Realtime channel scoped to
    `notifications:{userId}`, following the same one-client / `await
    getSession()` pattern as chat (see the Realtime footgun below).
  - Opening the popover marks everything currently unread as read
    (`PATCH` via the client, column-scoped to `read_at` same as the chat
    soft-delete pattern).
- [x] **Super-admin basics: report queue + ban/suspend** (`report_tickets`
      table, migration `0009`). Agency approval / metrics dashboard /
      currency config are still not implemented — this is just moderation.
  - `profiles.role`/`status` and `is_admin()` already existed since
    migration `0001` (unused until now); `trips`/`profiles` RLS already had
    admin-full-access branches, so banning a user or suspending a trip is
    just an admin doing a normal `update()` through existing RLS — no new
    RPCs needed for that part.
  - `ReportButton` (`components/reports/report-button.tsx`): a reusable
    flag-icon + `Dialog` (reason `Select` + optional details `Textarea`,
    `POST /api/reports`) wired into three places — trip detail page
    (report the trip), chat messages (report a message, hidden on your own
    messages), attendee list (report a user, hidden on yourself). Reports
    a user can create are capped to `trip | user | message` at the zod
    / API layer (`lib/validators/report.ts`); the DB check constraint is
    wider (`+ review | agency | plan`) for when those entities exist.
  - `/admin/reports` (`app/[locale]/(main)/admin/reports/page.tsx`,
    `components/admin/report-queue.tsx`): admin-only (checked server-side
    via `profiles.role`, not just hidden nav — visiting directly without
    the role renders a "not allowed" message rather than the queue).
    Lists tickets with reporter + resolved target info (trip title / user
    display name+status / message preview, each batch-fetched once up
    front, not N+1), status transitions (open → investigating →
    resolved/dismissed), an internal admin-only note field, and inline
    ban/suspend/reactivate buttons for `target_type: user` tickets.
  - Admin link in the `(main)` header only renders for `role === 'admin'`
    (fetched once in the layout, same place `isAuthenticated` already was).
- [x] **Ban/suspend enforcement** (migration `0010`). Follow-up to the gap
      flagged above: `is_active()` helper (mirrors `is_admin()`) now gates
      the writes that actually matter for a banned/suspended user —
      creating a trip (`trips: owner creates` RLS policy), sending a chat
      message (`messages: ... send` RLS policy), and joining a trip
      (`join_trip()` is `SECURITY DEFINER` so it bypasses RLS entirely —
      it has its own explicit `is_active()` check, raising
      `ERR_ACCOUNT_NOT_ACTIVE`, mapped to a friendly message client-side in
      `trip-form.tsx` / `join-trip-button.tsx`). `leave_trip()` is
      deliberately **not** gated — a banned user can still give up their
      seat. Still open: this doesn't force-sign a banned user out or touch
      their existing session; it only blocks the specific writes above
      (profile edits, reading, etc. are unaffected). Report creation is
      also deliberately not gated (a banned user can still dispute the
      ban).
- [x] **Follows** (`follows` table, migration `0011`). Public profile page
      at `/users/[id]` (`app/[locale]/(main)/users/[id]/page.tsx`) — didn't
      exist before this; shows avatar/bio/follower+following counts/their
      published public trips (reuses `TripCard`), plus a `FollowButton`
      (hidden on your own profile / when logged out). Organizer name on
      the trip detail page, attendee names, and chat sender names all now
      link to this page. New `new_follower` notification type added to
      the `notifications` type check constraint (was only the three
      trip/chat events from migration `0008`).
  - **Bug fixed in passing**: `Avatar` (`components/ui/avatar.tsx`) had a
    layout bug where the `<img>` and the initials-fallback `<div>` were
    both real flow children instead of absolutely stacked — an invisible
    (but still space-taking) `<img>` sitting next to the fallback badge
    could make the avatar visually collide with adjacent text, especially
    at larger sizes (hit while building the profile header, which needed a
    bigger avatar than the existing 40px-everywhere default — `size` is
    now a prop). Fixed by making the fallback `absolute inset-0` and
    skipping the `<img>` entirely when there's no `src`, rather than
    rendering it with an empty/undefined one.
- [x] **Badges** (`badges` + `user_badges` tables, migration `0012`).
      Manual admin grant/revoke only, per PRD §4.7 MVP scope — the
      auto-rule badges (`fast_responder`, `great_host`, `good_participant`)
      need chat-latency tracking and reviews respectively, neither of
      which exist yet (reviews are Phase 2); `host_10` could theoretically
      be computed from trip counts already but isn't auto-granted either,
      to keep all five badges on the same manual-grant path for now.
  - `BadgeList` (`components/profile/badge-list.tsx`) shows granted badges
    as small icon chips on `/users/[id]`, localized (`label_es`/`label_en`
    columns, not an i18n message key, since badge copy is admin-editable
    data not developer-owned strings).
  - `BadgeManager` (`components/admin/badge-manager.tsx`) is a toggle grid
    rendered inline on the same profile page, admin-only (same
    `profiles.role` check already used for the report queue / admin nav
    link) — no separate `/admin/badges` route.
- [x] **Chat system-event messages** (`joined`/`left`/`promoted`, migration
      `0013`). `messages` now supports `kind: 'user' | 'system'` rows;
      system rows have `sender_id null`, `body null`, and instead carry
      `event_type` + `actor_id` — the client renders the actual sentence
      locally from `event_type` (via `chat.eventJoined` etc.) rather than
      a language baked into the row at insert time, so it's correct
      regardless of which locale the viewer is in. A `SECURITY DEFINER`
      trigger on `attendees` (`post_chat_system_event()`) posts these
      automatically; regular chat `INSERT` still goes through the normal
      RLS policy, now with an explicit `kind = 'user'` check so a
      non-admin can't forge a system row. **Not covered**: `cancelled`
      (trip cancellation) and host-announcement system events from the PRD
      list — neither has a triggering write yet (trip cancel doesn't exist
      as a flow; announcements would need their own UI).
- [x] **MapLibre map view + Nominatim geocoding** on the feed.
  - `lib/geocode.ts`: `geocodeLocation()` calls Nominatim's `/search`
    (`countrycodes=cr`, matches the app's Costa Rica focus), server-side
    only, with the required descriptive `User-Agent` header. Called
    best-effort from `POST /api/trips` — a trip still publishes with just
    its free-text `location_name` if geocoding fails or finds nothing, it
    just won't get a pin. **Trips created before this migration have no
    lat/lng and never will unless re-saved** — there's no backfill.
  - `/feed` now has a List/Map toggle (`components/trips/feed-view.tsx`).
    Map view (`components/trips/trip-map.tsx`) renders pins for trips that
    have `lat`/`lng` via MapLibre GL + OpenFreeMap's free `liberty` vector
    style (no API key, per `docs/architecture.md`'s free-stack
    constraint); clicking a pin navigates to that trip. Trips without
    coordinates just don't appear on the map (list view is unaffected).
  - **Bug hit and fixed**: under Turbopack (Next 16's dev bundler),
    maplibre-gl's tile-parsing Web Worker — created internally via `new
    Worker(new URL(...), import.meta.url)` — resolved to Next's catch-all
    route instead of the actual worker script, so it came back as an HTML
    404 ("Failed to load module script ... non-JavaScript MIME type of
    text/html") instead of JS. Symptom was silent: the map mounted (canvas
    + zoom controls rendered fine) but never painted a single tile, with
    no thrown error and no visible network request for tiles — easy to
    mistake for a network/tile-source problem rather than a bundler one.
    Fixed by pointing `maplibregl.config.WORKER_URL` at the matching
    version's worker bundle on jsdelivr instead of letting Turbopack
    resolve it locally (`components/trips/trip-map.tsx`) — re-check if
    this is still needed after a Turbopack or maplibre-gl upgrade.
  - **Not implemented**: the "Near me" feed tab from the PRD (GPS + radius
    query) — would need either a PostGIS extension or a bounding-box
    query on `lat`/`lng`, neither of which exists yet. Map clustering at
    low zoom also isn't implemented (fine at MVP trip volumes, revisit if
    pin density grows).
- **Phase 1 is considered DONE.** Web Push, Resend email, and T-24h/T-2h
  reminders are explicitly deferred (user decision, 2026-09-17) rather than
  outstanding work — see "Not started" below. They need external
  accounts/keys (a VAPID keypair, a Resend account) before they can be
  wired up for real, not just more code, so revisit when that's ready
  rather than treating this as a gap in Phase 1.
- [ ] Phase 2 super-admin extras (agency approval, metrics dashboard,
      currency/feature-flag config) — out of scope for Phase 1's
      moderation basics above.

## Not started

- **Notification delivery channels**: Web Push (VAPID), Resend email, and
  T-24h/T-2h trip reminders. The in-app notification pipeline these would
  ride on (`notifications` table + triggers, migration `0008`) already
  exists — this is purely about adding delivery channels on top of it.
  Needs external setup before any code is useful: a VAPID keypair for
  Web Push, a Resend account + API key for email, and a scheduler for the
  reminders (Supabase `pg_cron` or an external periodic trigger hitting a
  route handler) — deferred pending those.
- Phase 2 (agencies/tours), Phase 3 (private plans + workspace), Phase 4
  (payments). See `docs/roadmap.md` for the full breakdown.

---

## Things a future session should know

- **Migrations are applied manually** by the user via `npx supabase db
  push` — I cannot run this myself. After adding/editing a migration file,
  always tell the user explicitly to run it, and don't assume a feature
  works end-to-end until they confirm.
- **Never edit an already-applied migration file.** Every fix so far
  (`0002`, `0005`, `0006`) shipped as a *new* migration that alters/drops
  and recreates the affected function or adds a policy, even when the bug
  was in a migration from the same session.
- Trip creation currently **publishes immediately** — no draft/edit flow
  exists yet. `trips.status` can technically be `draft`, but nothing sets
  it or lets a user transition it.
- The waitlist capture form on the homepage is **UI-only** — see the
  `TODO` in `components/landing/waitlist.tsx`. It doesn't persist
  anywhere.
- `Avatar` (`components/ui/avatar.tsx`) is a Client Component (uses
  `useState` for image-load/error fallback) — if you render it from a new
  Server Component and forget this, Next throws immediately. It's `'use
  client'` now, but worth remembering if it ever gets refactored.
- `Avatar`'s `initials` prop is used **verbatim** (no processing) — pass a
  full name there and it renders the whole string in the circle. Use
  `fallback` instead, which splits on spaces and takes first letters
  (`"Leo C"` → `"LC"`). Already hit this once in `AttendeeList`.
- **Never create a fresh Supabase browser client (`createClient()`) right
  before opening a Realtime channel.** See the Chat bug above — always
  create one client per component (state/ref) and await
  `supabase.auth.getSession()` before `.channel(...).subscribe()`.
- Categories are a single shared source of truth:
  `lib/constants/categories.ts` (`CATEGORY_KEYS`) + the top-level
  `categories` namespace in both message files. Don't hardcode the list
  anywhere else (onboarding, trip form, and feed filters all read from
  this).
- Public-safe profile data is read via `profiles_public()` (an RPC call,
  `supabase.rpc('profiles_public')`), never by querying `profiles`
  directly for anyone other than the current user — the `profiles` table's
  own RLS is owner/admin-only by design.
