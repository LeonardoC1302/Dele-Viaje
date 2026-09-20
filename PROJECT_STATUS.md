# Dele Viaje — Project Status

Living log of what's actually built, for picking this up in a fresh session.
Source of truth for *intent* is still `docs/PRD.md`, `docs/architecture.md`,
`docs/data-model.md`, `docs/api.md`, `docs/roadmap.md` — this file tracks
*what's real right now* versus what those docs describe as the target.
Supersedes the old `PHASE0_STATUS.md` (deleted, this file replaces it).

Last updated: 2026-09-20 (**waitlist visibility, multi-date tours,
agency rating rollup, feed price/date filters, itinerary UX — migrations
0031-0032; ⚠️ migration 0032 adds `trips.tour_group_id`, now selected on
every trip detail page load, so `/trips/[id]` 404s for every trip,
private plans included, until it's pushed — confirmed by browser-testing
against the live dev DB just now, this is more disruptive than the usual
"feature just doesn't exist yet" and needs `npx supabase db push` before
anyone can open a trip page again**; tour templates — migration 0028; private-trip
document uploads — migration 0029, second Storage bucket; tour
exclusive-content-for-paid-attendees — migration 0030; responsive header
— hamburger menu below `lg`, no migration needed; form validation errors
now show field-level detail instead of "Invalid ... data", no migration
needed; SINPE Móvil manual payment flow, migration 0026, first Storage
bucket in this project; chat message editing,
migration 0027; feed "Near me" tab; real map clustering; Phase 2 done
except document upload — agencies, tours incl. edit/delete, admin
approval, tour Q&A, reviews + agency responses, manual check-in, feed
Verified tab, migrations 0022-0025; Master admin panel; Phase 3 done
except shared docs: itinerary UI, direct/email invites, leave/transfer/
auto-archive plan membership; delete trip; plan-owner-membership fix; My
Trips; rich-text/custom-fields/linked-places trip customization;
**critical RLS-recursion fix, migration 0020 — not yet pushed, blocks
non-owners from reading private plans**; markdown editor write/preview
tabs; custom time picker; itinerary icon fallback, migration 0021 — also
not yet pushed; **migrations 0020-0032 all still need
`npx supabase db push`**).

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

**Known footgun #2:** the `forest` scale (`tailwind.config.ts`) darkens fast
— `forest-700` through `forest-950` are all near-black (`forest-950` is
`#010402`), not dark green, because the palette was tuned around `forest-600`
as *the* accent, not as a full light-to-dark ramp. A dark-mode background
picked reflexively from the high end of the scale (e.g. `bg-forest-950`)
renders as black, not green — use a translucent tint of the real accent
instead (e.g. `bg-forest-600/20`) for a dark-mode "tinted accent surface".
Hit once in `link-preview-card.tsx`'s no-image fallback.

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
  - [x] **Message editing: DONE** (2026-09-20, migration
    `0027_message_editing.sql`). `messages.edited_at` existed since this
    migration but had no write path. Routed through a `SECURITY DEFINER`
    `edit_message()` RPC rather than a column grant — same reasoning as
    `set_agency_status()`/`reject_payment()`: the existing soft-delete
    update policy already lets an *organizer* through (for moderating
    other people's messages), and a plain `grant update (body)` can't be
    scoped to "only when the sender-is-self branch is what matched", so it
    would've let an organizer rewrite someone else's message text, not
    just delete it. Editing is sender-only, full stop.
  - System-event messages (join/left/promoted) are **not** deferred —
    done since migration `0013`, this note was just stale (never updated
    when that shipped). Still genuinely not implemented: `chat_settings`
    (WhatsApp link, announcements-only, mute).
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
  - **Bug caught later (migration `0017`, 2026-09-20)**: this migration
    dropped `sender_id`'s `NOT NULL` for system rows but missed `body`,
    even though the `messages_system_shape` check added in the same
    migration already required `body is null` there. Every system-message
    insert (`post_chat_system_event()`, i.e. every real "joined" event on
    a live trip) was therefore always failing a NOT NULL constraint —
    silently, from the app's point of view, since scratch-preview UI tests
    never exercise a live DB trigger the way an actual `pnpm dev` + real
    Supabase push does. First surfaced when the user ran `npx supabase db
    push` and `0017`'s own attendee backfill tripped it. Fixed forward by
    folding `alter table messages alter column body drop not null;` into
    `0017` itself (never got a chance to apply before the fix landed, so
    no separate migration was needed) rather than editing `0013`.
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
  - [x] **"Near me" feed tab: DONE** (2026-09-20, `components/trips/
    near-me-button.tsx`, `lib/geo.ts`). No PostGIS — a plain bounding-box
    SQL pre-filter (`boundingBox()`, degrees-per-km approximation) narrows
    the row count, then `haversineKm()` gives the exact distance to cut
    the rectangle's corners down to a real 100km radius and sort
    nearest-first. `NearMeButton` is a client component specifically
    *because* the category/verified tabs are plain `<Link>`s but this one
    needs an async `navigator.geolocation.getCurrentPosition()` prompt to
    resolve before it has a URL to navigate to at all.
  - [x] **Map clustering: DONE** (2026-09-20). Rewrote
    `components/trips/trip-map.tsx` from one `maplibregl.Marker` DOM
    element per pin to a clustered GeoJSON source (`cluster: true`) with
    three layers (cluster circles, cluster count labels, individual
    points) — clustering only exists at the GeoJSON-source level in
    MapLibre, there's no equivalent for individually-placed DOM markers,
    so this wasn't a small tweak to the old approach. Clicking a cluster
    zooms to its expansion level; clicking an individual point navigates
    to that trip, same as before. At current trip volumes this rarely
    visibly clusters anything yet — it's what keeps the map usable once
    pin density grows in one area, not a visible change today.
- **Phase 1 is considered DONE.** Web Push, Resend email, and T-24h/T-2h
  reminders are explicitly deferred (user decision, 2026-09-17) rather than
  outstanding work — see "Not started" below. They need external
  accounts/keys (a VAPID keypair, a Resend account) before they can be
  wired up for real, not just more code, so revisit when that's ready
  rather than treating this as a gap in Phase 1.
- [ ] Phase 2 super-admin extras (agency approval, metrics dashboard,
      currency/feature-flag config) — out of scope for Phase 1's
      moderation basics above.

## Phase 3 — Private Plans & Workspace: DONE (shared docs out of scope by user decision)

A "private plan" is **not a new entity** — it's a `trips` row with
`visibility: 'private'`. Membership reuses `attendees` exactly like a
social trip (`status = 'confirmed'`), just reached via invite instead of
open RSVP: `join_trip()`/`leave_trip()` are never used for plans at all.
Everything below is migration `0016_private_plans.sql`.

- [x] **Visibility model + RLS**. `POST /api/trips` no longer hardcodes
      `visibility: 'public'` — `TripForm` (create mode only; visibility is
      immutable after publish per the data model, so it's hidden in edit
      mode) shows a "Public social trip" vs "Private plan" choice up
      front. The `trips` select policy now has an `is_member(id)` branch
      so private-plan members (not just the owner) can read the row —
      previously *nothing* could read a private trip back after creating
      it, since the only branches were "published + public" or "owner".
      Non-members still get nothing (RLS-invisible, `notFound()` on
      `/trips/[id]`), matching "private invisible everywhere" from the
      roadmap.
  - `is_host_team(trip_id)` added as its own function (currently just
    calls `is_organizer()`) rather than baking `is_organizer()` directly
    into every Phase 3 policy — when agency staff exists (Phase 2), it's a
    one-line change in this function instead of a find-and-replace across
    `plan_invites`/`packing_items`/`expenses`/`polls`/`trip_docs`/
    `itinerary_blocks` policies.
- [x] **Invite links + direct (email) invites** (`plan_invites` table,
  extended in migration `0019_plan_membership_and_invites.sql`). Direct
  invites reuse the exact same table/token/`accept_plan_invite()` flow as
  link invites — a direct invite is just a link invite pre-addressed to one
  profile (`plan_invites.invited_profile_id`), delivered as an in-app
  notification instead of a copy-pasted URL, since there's still no
  Resend/email sending. `create_direct_plan_invite(trip_id, email)`
  (`SECURITY DEFINER`) looks the invitee up by email directly against
  `auth.users` — profiles still has no `username`/`email` column, but a
  definer function running as the table owner can read `auth.users`
  without needing the service-role key or an admin-API call from the app,
  which is what made this a "follow-up" before. `accept_plan_invite()` was
  also updated (via `create or replace function`, not by editing the
  applied `0016` migration) to reject anyone but the named invitee when
  `invited_profile_id` is set, so a direct invite can't be redeemed by
  whoever else sees the notification. UI: an "Invite by email" field above
  the existing link list in `InviteManager`.
  - `POST /api/trips/[id]/invites` (organizer creates a link,
    `expires_at`/`max_uses` configurable) · `GET` (list) ·
    `DELETE /api/invites/[inviteId]` (soft-revoke via `revoked_at`, keeps
    use history instead of hard-deleting the row).
  - `accept_plan_invite(token)` — `SECURITY DEFINER` RPC, validates
    (not revoked/expired/exhausted) and inserts/updates the caller into
    `attendees` as `confirmed`. Idempotent — re-using your own valid
    invite link is a no-op, not an error.
  - `preview_plan_invite(token)` — a second, **read-only** `SECURITY
    DEFINER` RPC purely for the invite-landing page
    (`/invite/[token]`, `app/[locale]/(main)/invite/[token]/page.tsx`) to
    show "You're invited to X" (or why the link doesn't work) *before* the
    visitor commits to joining — without granting general read access to
    `plan_invites`/`trips` to non-members.
  - `InviteManager` (`components/plans/invite-manager.tsx`): organizer-
    only panel to generate/copy/revoke links, shown on the plan workspace.
  - **Bug fixed during this pass**: `InviteManager` originally computed
    the invite URL with `typeof window !== 'undefined' ? window.location
    .origin : ''`, which renders `''` on the server and the real origin
    on the client — a guaranteed hydration mismatch the moment the page
    has any invite to display. Fixed with `useSyncExternalStore` (reports
    `''` for the SSR/first-paint snapshot, the real origin once mounted)
    instead of an effect+`setState`, which is both correct for this
    exact "browser-only value" case and satisfies the stricter
    `react-hooks/set-state-in-effect` lint rule that flagged the
    effect+setState version.
- [x] **Workspace modules** — packing list, budget, polls. Rendered on
  `/trips/[id]` itself (not a separate route): the page now branches on
  `trip.visibility === 'private'` early and renders a completely different
  layout (no `JoinTripButton`/waitlist/capacity concepts — none of that
  applies to invite-gated membership) rather than threading conditionals
  through the existing public-trip JSX, to avoid regressing the
  already-working public trip page.
  - **Packing list** (`packing_items`, `components/plans/packing-list.tsx`):
    add item (optionally assign to a member — this doubles as the PRD's
    separate "Prerequisites" concept, which is just an item with
    `assigned_to` set per the data model, not its own table), toggle done,
    host-team-only delete.
  - **Budget** (`expenses`, `components/plans/expenses-list.tsx`): log an
    expense (payer = whoever's logged in, amount in ₡, description); the
    equal split across members is computed client-side on every render
    (`total / member count`) and **never stored**, per the data model —
    avoids it going stale as membership changes. Delete by the expense's
    creator or host team.
  - **Polls** (`polls` + `poll_votes`,
    `components/plans/polls-list.tsx`): question + 2+ options, toggleable
    voting (`upsert` on `(poll_id, profile_id)` — voting again just moves
    your vote, doesn't double-count), live vote-count bars, close
    (`closes_at`) or soft-delete (`deleted_at`) by the poll's creator or
    host team.
- [x] **Bug fixed: plan owner wasn't a member of their own plan**
  (migration `0017_plan_owner_membership.sql`). A private plan's owner was
  never inserted into `attendees` — only invitees were, via
  `accept_plan_invite()`. Consequence the user actually hit: the owner
  didn't show up as an assignable option in the packing list, wasn't
  counted in the budget split, and didn't appear in their own attendee
  list — because all of those are driven off `attendees`, and the owner
  simply wasn't a row in it. Unlike a public trip (where "organizing" is
  deliberately a separate role from "attending" — the owner never
  RSVPs), a private plan's owner is a full participant by default. Fixed
  with an `after insert on trips` trigger that auto-confirms the owner
  into `attendees` when `visibility = 'private'`, plus a one-time backfill
  `insert ... on conflict` for the plan created before this fix.
- [x] **Itinerary** (`itinerary_blocks`, UI added this pass —
  `components/plans/itinerary-list.tsx`). Day-grouped list (day/time/label/
  description/optional photo URL — no upload, just a pasted URL, same
  "arbitrary external image, can't be pre-registered in `remotePatterns`"
  treatment as link previews). Matches the RLS exactly as written in
  `0016`, not a new permission model: **any** member can add a block (host
  team on a public trip, any member on a private plan), but only the host
  team can delete one — there's no edit, only add/delete, same as
  packing/expenses/polls. Rendered on **both** branches of `/trips/[id]`
  (public trips too, not just plans) since the RLS was written for both
  cases from the start and nothing about a day-by-day agenda is
  plan-specific.
  - **Time input** (`components/ui/time-picker.tsx`): a pair of the app's
    own `Select` components (hour 00–23, minute in 5-min steps) rather than
    the native `<input type="time">` — the browser-drawn chrome (spinner
    arrows, locale-dependent segment layout) doesn't take Tailwind classes
    and looked out of place next to every other custom-built control.
  - **Icon fallback** (migration `0021_itinerary_icon.sql` adds
    `itinerary_blocks.icon`, `components/plans/itinerary-icons.tsx`): when
    a block has no photo, it shows a `forest-600/20`-tinted square with a
    picked icon (food/lodging/transport/activity/sightseeing/flight/hike/
    beach/explore, defaulting to a plain map pin) instead of collapsing to
    nothing — same treatment as `trip_links`' no-preview fallback. The icon
    picker is a row of toggle buttons, disabled whenever a photo URL is
    filled in (photo always wins over icon).
  - **Lint footgun hit while building this**: `ITINERARY_ICONS[key]`
    stored as a lookup table of component references, then rendered as
    `<Icon />`, trips the React Compiler's `react-hooks/static-components`
    rule ("Cannot create components during render") even though nothing
    is actually being dynamically created — a component reference read
    from a table and a component defined inline look the same to that
    rule. Fixed by exporting a single `ItineraryIcon({ iconKey })`
    component with a literal `switch` inside (each branch a
    statically-known JSX tag) instead of a table of components rendered
    from a variable.
- [x] **Leaving a plan, owner transfer, auto-archive** (migration
  `0019_plan_membership_and_invites.sql`, `components/plans/plan-members.tsx`).
  There was previously no way to leave a private plan at all — attendees'
  `leave_trip()` doesn't apply to plans (no waitlist to promote), and
  nothing else called it for `visibility = 'private'` rows.
  - `leave_plan(trip_id)` (`SECURITY DEFINER`): a confirmed non-owner
    member sets their own row to `cancelled`. The **owner can't leave**
    this way — must `transfer_plan_ownership()` first, or use
    `DeleteTripButton` if they're the only one left (see below).
  - `transfer_plan_ownership(trip_id, new_owner_id)`: owner-only, target
    must already be a confirmed member — this hands off an existing
    relationship, it doesn't invite someone new into the role.
  - Removing a member (organizer only) needed no new RPC — the existing
    `"attendees: organizer/admin manage"` policy (migration `0004`) already
    lets the organizer update any attendee row directly, so `PlanMembers`
    just does a plain `supabase.from('attendees').update(...)` client-side.
  - **Auto-archive**: a new `attendees_archive_empty_plan` trigger sets
    `trips.status = 'archived'` (added to the status check constraint) if
    a private plan's confirmed-member count ever hits zero. In practice
    this is mostly a safety net today — the owner can't `leave_plan()`
    without transferring first, and a transfer always leaves the new owner
    confirmed, so a plan only actually empties out via direct admin/DB
    action on `attendees`, not through the normal UI paths.
  - `PlanMembers` renders on the plan workspace (private plans only):
    owner sees "make organizer" / "remove" per other member, everyone else
    sees "leave plan" on themselves. Reuses the same confirm-`Dialog`
    pattern as `JoinTripButton`'s leave flow.
- [ ] **Not implemented — deferred, not forgotten:**
  - **Shared docs** (`trip_docs` table exists, schema-only) — **out of
    scope by explicit user decision (2026-09-20)**, not a gap. Needs a
    private Supabase Storage bucket + Storage RLS + signed-URL access,
    which is its own chunk of work whenever it's wanted.
  - **Notifications for plan events** beyond the direct-invite one added
    this pass (joined/poll added/expense added/etc.) — would need more
    `plan_*` entries in the `notifications` type check constraint the same
    way `plan_direct_invite` was just added; not done, and Web Push/email
    delivery for *any* notification type is already deferred per the
    Phase 1 section above.

## Trip creation customization: DONE

Three tweaks to trip creation/display, requested together, all in
migration `0018_trip_customization.sql`. Applies to both public trips and
private plans (same `TripForm`, same detail page).

- [x] **Rich-text descriptions** (`components/ui/markdown-editor.tsx` +
  `components/ui/markdown-content.tsx`). Deliberately **not** a
  contenteditable/WYSIWYG editor — a plain `Textarea` plus a small toolbar
  (Bold/Italic/Bullet list/Numbered list/Link) that wraps the current
  selection with the matching markdown syntax, insert-a-placeholder if
  nothing's selected. Descriptions are stored as plain markdown text (no
  schema change beyond widening the length cap — see below) and rendered
  via `react-markdown` + `remark-gfm`. This sidesteps HTML sanitization
  entirely: `react-markdown` never renders raw HTML from its input unless
  you explicitly add the `rehype-raw` plugin, which this doesn't — so
  there's no XSS surface from trip descriptions to sanitize against, by
  construction rather than by remembering to escape something. Needed
  `@tailwindcss/typography` (`@plugin` in `app/globals.css`) for the
  `prose` classes markdown output renders through.
  - `trips.description`'s check constraint was `1..2000` chars; markdown
    syntax eats into that budget fast (a few bold words and a short list
    can burn 100+ chars on punctuation alone), so it's now `1..4000`
    (`lib/validators/trip.ts` max raised to match).
  - **Bug fixed (2026-09-20): "rich text isn't rendering"** — turned out
    the renderer was correct all along; the user's actual stored
    description was malformed markdown (`**bold spanning a newline into
    **- a list item` — mismatched `**` delimiters swallowing a list
    marker), produced by the toolbar with no way to see the mistake before
    saving. Confirmed by pulling the raw `trips.description` via a
    service-role diagnostic and feeding it back through `MarkdownContent`
    in isolation — it rendered exactly as broken as the real page, proving
    the bug was in the *data*, not the component. Fixed the actual gap:
    `MarkdownEditor` now has Write/Preview tabs (toolbar hidden, `Preview`
    renders through the same `MarkdownContent` used on the detail page) so
    an author can catch exactly this kind of mismatched-syntax mistake
    before publishing instead of after.
  - **Bug fixed (2026-09-20): huge gap above lists.** `MarkdownContent`'s
    wrapper had a leftover `whitespace-pre-wrap` class from before it used
    real markdown parsing. `react-markdown`'s output includes a literal
    newline text node between sibling block elements (`<p>...</p>\n<ul>`)
    — normally whitespace-collapsed to nothing, but `pre-wrap` preserves
    it as a rendered blank line on top of the actual `my-2` margins.
    Confirmed via computed styles before the fix (8px margins on both
    sides, but a 44px visual gap — one full line-height of preserved
    whitespace) and after (8px, matching the margin exactly). Just removed
    the class; nothing depended on it once markdown owns line breaks.
- [x] **Custom fields** (`trip_custom_fields` table,
  `components/trips/custom-fields-editor.tsx` for authoring,
  `custom-fields-display.tsx` for the read-only stat-grid on the detail
  page). Fully freeform label/value pairs — no fixed schema for "distance"
  / "elevation gain" / etc., the organizer types whatever labels make
  sense for that trip. Saved the same way waypoints already were: an array
  in the create/edit POST/PATCH payload, wholesale-replaced on edit
  (`lib/trip-extras.ts` — shared by both routes now, waypoints could
  arguably move into this file too but wasn't touched this pass).
- [x] **Linked places** (`trip_links` table, `lib/link-preview.ts` for the
  fetch, `components/trips/links-editor.tsx` / `link-preview-card.tsx` for
  authoring/display). Organizer pastes a URL (+ optional display-name
  override); the server fetches it and regex-extracts `<meta
  property="og:title/description/image">` (falling back to `<title>`) —
  no HTML-parser dependency, just enough to read `<head>` tags, and it
  stops reading after the first ~100KB or `</head>`, whichever comes
  first. **This is inherently best-effort**: sites that block simple
  server-side fetches, or that only render OG tags client-side via JS
  (common on some booking platforms), silently get no preview — the raw
  link still saves and still works, just without the card. Re-fetches on
  every edit save (same wholesale-replace tradeoff as custom fields/
  waypoints), so an edit to an unrelated field still re-hits every linked
  URL.
  - **SSRF guard included**: `lib/link-preview.ts`'s `isSafeToFetch()`
    rejects non-http(s) schemes and obvious internal/loopback/link-local
    hostnames (`localhost`, `127.*`, `10.*`, `192.168.*`, `169.254.*`,
    `172.16-31.*`, `::1`) before ever fetching a user-submitted URL
    server-side. **Known gap**: this checks the literal hostname string,
    not what it actually resolves to — a hostname that DNS-resolves to a
    private IP (DNS rebinding) would slip through. Acceptable for a
    best-effort preview feature at current scale; would need a resolve-
    then-check (or a fetch proxy that validates the connected IP) before
    this could be trusted for anything higher-stakes.

## "My Trips" dashboard: DONE

`/my-trips` (`app/[locale]/(main)/my-trips/page.tsx`), linked from the
header nav (logged-in only). Lists every trip where `owner_id = auth.uid()`
— public and private, past and upcoming, no filtering — because the
public `/feed` deliberately filters to `status='published' AND
visibility='public' AND start_at >= now()`, so a private plan (by design)
or a trip whose start date has already passed (also by design — "Upcoming
trips" means upcoming) will **never** show there, which is exactly what
happened to the user mid-session: a newly-created private plan looked
"not showing up" when the feed was doing precisely what it's supposed to.
This page is the fix — "everything I organized" instead of "everything
public and upcoming". `TripCard` got a `visibility` prop to show a small
"Private plan" badge when relevant, and now dims (`opacity-60`) once a
trip's `start_at` has passed, so past vs. upcoming is visible at a glance
in the grid.

## Bug fixes: joined plans invisible on My Trips; RLS recursion 404; join_trip response shape

Bugs the user hit going through the invite/join flow for real:

- **`/my-trips` only ever showed owned trips.** A user who joined someone
  else's private plan via invite had literally nowhere in the app to find
  it again — `owner_id = auth.uid()` was the only filter. Fixed by adding
  a second query (confirmed `attendees` rows, minus anything already in
  the owned set) and splitting the page into "Organizing" / "Joined"
  sections. Confirmed via service-role inspection of the live DB that this
  was a real, reproducible gap, not a one-off report — the user's actual
  joined plan was there in `attendees` with nowhere to surface it.
- **404 right after joining/being invited to a private plan — real root
  cause: RLS recursion, `54001 stack depth limit exceeded`** (migration
  `0020_fix_rls_recursion.sql`). My first attempt at this blamed Next's
  client Router Cache and replaced `AcceptInviteButton`'s
  `router.push()`/`refresh()` with a hard `window.location.href` redirect
  — that change is harmless and stays, but it wasn't the actual bug. A
  temporary dev-only diagnostic on `/trips/[id]` (swap `notFound()` for a
  dump of `{ user, tripError }`, since deleted) caught the real Postgres
  error: **none of the RLS helper functions
  (`is_admin`/`is_active`/`is_organizer`/`is_member`/
  `is_trip_participant`) are `security definer`**, so each one's internal
  query is itself subject to RLS — `trips`' select policy calls
  `is_member()` → queries `attendees` → `attendees`' select policy calls
  `is_organizer()` → queries `trips` again → recurses until Postgres's
  stack blows up. This stayed completely hidden as long as the only person
  reading a private plan was its owner (`owner_id = auth.uid()`
  short-circuits before ever calling `is_member()`), and only surfaces
  once a plan actually has a second, non-owner confirmed member — exactly
  what "does my invited friend see 404" exercises and normal owner-only
  testing never does. Fixed by making every one of those helper functions
  `security definer` (`set search_path = public`), the standard Supabase-
  recommended pattern specifically to prevent this: a definer function's
  internal queries bypass RLS on the tables it touches, so there's no
  policy left to recurse into. **This migration still needs to be pushed**
  — the user's `npx supabase db push` is currently blocked by a separate
  network/connectivity issue (Postgres connection timeout to the pooler
  host), so joining a private plan as a non-owner will keep 404ing until
  both `0019` and `0020` land.
- **Confirmed, separate bug found while investigating**: `POST
  /api/trips/[id]/join` called `join_trip()` — which `returns table
  (status text)`, a set-returning function — via `supabase.rpc(...)`
  *without* `.single()`. Verified empirically (via a scratch page calling
  a sibling table-returning RPC both with and without `.single()`) that
  without it, PostgREST/supabase-js hands back an array of row objects,
  not a bare value — so the route was shipping `{status: [{status:
  "confirmed"}]}` to the client instead of `{status: "confirmed"}`.
  `JoinTripButton` then set its local state to that array, so its own
  `status === 'confirmed'` checks silently failed until a full page
  reload re-derived the real status server-side. Fixed by adding
  `.single()` and unwrapping `data.status`.

## Delete trip: DONE

`DELETE /api/trips/[id]` (organizer-only, 403 otherwise) +
`DeleteTripButton` (`components/trips/delete-trip-button.tsx`), shown next
to "Edit trip" on `/trips/[id]` for both public trips and private plans.
Relies on RLS's existing `"trips: owner deletes own"` policy (migration
`0003`, unused until now) plus the `on delete cascade` FK every child table
already has back to `trips.id` — attendees, messages, waypoints, custom
fields, links, invites, packing/expenses/polls, itinerary blocks all clean
up automatically, no manual cascade code needed. Confirm dialog, same
pattern as `JoinTripButton`'s leave flow. Redirects to `/my-trips` on
success — this is also the reason a plan owner who's the only member left
doesn't need "auto-archive" to have an exit: they can just delete it (see
the Phase 3 section above).

## Phase 2 — Agencies & Tours: DONE except document upload (out of scope by user decision, 2026-09-20)

Built in two passes (2026-09-20): the core loop first (apply → admin
approves → agency creates + publishes a tour → tour appears on the public
feed), then everything else in the same session once the user asked to
finish the phase — QR check-in (scoped down to manual check-in, see
below), reviews + agency responses, tour Q&A (not in the original roadmap
— requested directly, similar shape to trip chat but agency-answers-only
and publicly visible to help other buyers), tour editing, and the feed's
"Verified" tab. **Payments are still Phase 4, untouched by design**: a
tour publishes with a price, but nothing here captures money — same
off-platform-payment posture (SINPE/WhatsApp) the PRD describes for this
stage; see "Payments research notes" below for what was discussed about
it without building anything.

Migrations `0022_agencies.sql` through `0025_checkin.sql` (not yet
pushed — same connectivity/pause issue blocking `0020`/`0021`).

- [x] **`agencies` + `agency_members` tables.** `trips.agency_id` and the
  `trips_tour_requires_fields` check constraint (`type='tour'` requires
  `agency_id`/`price_crc`/`capacity`) already existed since migration
  `0003` — this is the first migration that creates the table the column
  actually points at, and wires up the FK migration 0003's comment said
  would come "when agencies (Phase 2) land". No document upload / agency
  verification storage — kept to the same fields as the PRD's MVP agency
  profile minus `documents_paths` (needs Storage, same reasoning shared
  docs was skipped in Phase 3).
  - **Every new RLS helper here is `security definer` from the start** —
    `is_agency_staff()`, `is_agency_admin()`, and the rewritten
    `is_host_team()` all learned from migration 0020's stack-depth bug
    earlier this session: `is_host_team()` now also queries `trips` and
    `agency_members` directly (not just delegating to `is_organizer()`
    like before), which would reproduce that exact recursion if it weren't
    definer.
  - **A real gap caught and closed while writing this**: the `trips`
    insert policy (migration 0010) only ever checked `owner_id =
    auth.uid() and is_active()` — before this migration, nothing stopped
    any active user from inserting `type='tour', agency_id=<someone
    else's agency>` with themselves as owner_id; RLS had no way to know
    the inserter wasn't actually that agency's staff. Closed by adding
    `(type <> 'tour' or is_agency_staff(agency_id))` to the insert check.
  - `apply_for_agency()` (`SECURITY DEFINER`): creates the agency row
    (`status: 'pending'`) and the applicant's own `'owner'`
    `agency_members` row atomically — doing this as two separate
    client-side inserts would hit a chicken-and-egg problem (the
    `agency_members` insert policy needs `is_agency_admin()` to already
    find a row that insert is trying to create).
  - `add_agency_staff_by_email()`: same `auth.users` email-lookup pattern
    as `create_direct_plan_invite()` (migration 0019) — profiles still has
    no email/username column. Straight to `status: 'active'`, no
    accept-invite step: an owner adding a known colleague isn't the same
    trust boundary as inviting a stranger into a private plan.
  - `set_agency_status()`: the *only* path that can ever change
    `agencies.status` — checks `is_admin()` itself. `agencies.status` is
    deliberately excluded from the client-writable column grant (a single
    shared `authenticated` DB role can't be granted "these columns for
    staff, all columns for admins" — that's not something `GRANT` can
    express), so even an admin changes status through this function, not a
    direct table update.
  - Removing agency staff needed no new RPC — same pattern as removing a
    plan member: `"agency_members: admin staff update"` policy already
    lets an owner/admin-role staff update any member row directly, so
    `AgencyStaffManager` just does a plain `supabase.from('agency_members')
    .update({status:'removed'})` client-side.
- [x] **Agency application** (`/agencies/new`,
  `components/agencies/agency-apply-form.tsx`) → `POST /api/agencies` →
  `apply_for_agency()`.
- [x] **Admin approval queue** (`/admin/agencies`,
  `components/admin/agency-queue.tsx`): pending/approved/suspended/
  rejected with the valid next-action(s) per status (approve/reject a
  pending one, suspend an approved one, reactivate a suspended/rejected
  one) → `PATCH /api/admin/agencies/[id]` → `set_agency_status()`.
- [x] **Tours** (`type: 'tour'` trips, `components/agencies/tour-form.tsx`,
  `POST /api/agencies/[id]/tours`). A **separate form from `TripForm`**,
  not a "tour mode" bolted onto it — tours post to a different endpoint
  (agency-staff-authorized, not owner-based), have no visibility choice
  (always public), and require price/capacity that social trips don't.
  Reuses the same sub-components (`TripMapEditor`, `CustomFieldsEditor`,
  `LinksEditor`, `MarkdownEditor`) and `lib/trip-extras.ts` helpers rather
  than duplicating that logic. **Tours are created as `status: 'draft'`**
  (unlike a social trip, which publishes immediately) — a separate
  `POST /api/agencies/[id]/tours/[tripId]/publish` flips it to
  `'published'`, gated on the *agency* being approved (not the tour
  itself — the PRD treats tour-level admin review as an optional toggle,
  not mandatory for MVP).
  - **UX fixes (2026-09-20)**: price was originally crammed into a
    3-column row with capacity/min-participants, which looked cramped —
    moved to its own full-width row below them. Also had no way back out
    of the form once you'd started it (same gap in `AgencyApplyForm`) —
    both now have a Cancel link next to the submit button.
  - [x] **Tour editing/delete** (second pass): `PATCH`/`DELETE
    /api/trips/[id]` now check `canManageTrip()` (owner OR active staff
    of `trip.agency_id`) instead of `owner_id` alone, and `PATCH` branches
    on `trip.type` to validate against `createTourSchema` (price/capacity
    required, no visibility field) vs. `createTripSchema` for a social
    trip — same route, different validator depending what it's editing.
    `TourForm` gained `mode: 'create' | 'edit'` (mirrors `TripForm`'s
    existing shape) at `/agencies/[id]/tours/[tripId]/edit`.
    `DeleteTripButton` gained an optional `redirectTo` prop so deleting a
    tour lands back on the agency panel instead of `/my-trips` (which
    wouldn't show it anyway for a staff member who isn't `owner_id`).
- [x] **Agency panel** (`/agencies/[id]/panel`,
  `components/agencies/agency-status-banner.tsx` +
  `agency-tour-list.tsx` + `agency-staff-manager.tsx`): status banner
  (nothing shown once approved), tour list with a Publish button on
  drafts, staff list + add-by-email.
- [x] **Public agency profile** (`/agencies/[id]`): business name +
  verified badge (approved only) + description + published tours grid.
  Pending/suspended/rejected agencies are only visible to their own staff
  or an admin (same "not visible to the public" treatment as a draft
  trip) — enforced by RLS (`"agencies: read approved, own staff, or
  admin"`), not just hidden UI.
- [x] **Tours on the feed**: no new query needed — `/feed`'s existing
  filter (`status='published' and visibility='public'`) already matches a
  published tour, since tours are always `visibility='public'`. Just
  extended `TripCard`/`TripCardData` with optional `type`/`priceCrc` to
  show a "Tour" badge + formatted ₡ price instead of nothing.
- [x] **Nav entry point**: a "My Agency" / "List your agency" link
  (`app/[locale]/(main)/layout.tsx`) that routes to the user's agency
  panel if they're staff of one (one extra `agency_members` query,
  `.limit(1)`, same pattern as the existing admin-role check), or to the
  application form if not.
- [x] **Tour Q&A** (migration `0023_tour_questions.sql`,
  `components/agencies/tour-qa.tsx`) — not in the original roadmap,
  requested directly. Public question-and-answer thread on a tour, shape
  borrowed from chat but deliberately not chat: any active user can ask
  (no membership requirement — a tour has no "members" the way a plan
  does, and the whole point is helping people who haven't booked yet
  decide whether to), only the tour's host team can answer, and a
  question can never be edited once posted by anyone (same "no editing"
  posture as chat messages) — deletion is host-team/admin-only
  moderation, deliberately **not** available to the asker themselves, so
  an agency can't quietly delete an awkward question and a buyer can't
  game the record either. Column-grant-restricted the same way as
  `messages`' soft-delete: only `answer`/`answered_by`/`answered_at` are
  writable at all, regardless of who's asking.
- [x] **Reviews + agency responses** (migration `0024_reviews.sql`,
  `components/agencies/tour-reviews.tsx`). Scoped to tours only —
  `reviews.trip_id` directly, not the two-target `reviewee_agency_id`
  shape `data-model.md` sketches; an agency's aggregate rating is a join
  over its tours, not a separate column. **Gating deviates from the PRD
  on purpose**: "attended + completed" as written is unreachable, since
  nothing in this app ever transitions `trips.status` to `'completed'`
  (no cron, no manual action ever sets it). Gated instead on the tour's
  `start_at` already being in the past AND the reviewer's own
  `attendees.attendance = 'attended'` (set by check-in, below) — same
  practical effect, actually reachable. A reviewer *can* delete their own
  review (unlike a Q&A question) — a review is a claim about a real
  experience, not a public-record entry worth freezing.
- [x] **Check-in — scoped down to manual, no QR/camera** (migration
  `0025_checkin.sql`, `components/agencies/tour-checkin.tsx`). The PRD's
  Flow B describes a camera-scanned QR code; built instead as a roster
  with a tap-to-toggle "check in" button per confirmed attendee. Decided
  this deliberately rather than silently: a QR scan's actual value (skip
  typing/searching a name) doesn't add much at the volume a staff member
  running a tour departure list already handles, and building it for real
  would mean adding a camera-scanning library dependency for that.
  `attendees.attendance` existed since migration 0004 but had no write
  path — this is its first one. **Real gap closed along the way**:
  `"attendees: organizer/admin manage"` (migration 0004) only ever
  checked `is_organizer()`, so before this migration no agency staff
  member other than whoever happened to be `trips.owner_id` could have
  checked anyone in even with the UI built — replaced with
  `is_host_team()`, same fix-forward shape as every other RLS policy
  touched this session.
- [x] **Feed "Verified" tab** (`app/[locale]/(main)/feed/page.tsx`).
  Checks agency approval **at read time** via a second query (approved
  agency ids, then `.in('agency_id', ...)`), not just at publish time —
  an agency can be suspended after a tour's already published, and
  nothing currently un-publishes that tour when it happens, so relying on
  the publish-time gate alone would have let a suspended agency's old
  tours keep showing as "verified".
- [ ] **Deferred — tracked, not forgotten:**
  - **Agency document upload / verification storage** — out of scope by
    explicit user decision this session. `agencies` has no
    `documents_paths` column; same Storage-bucket work deferred as shared
    docs (Phase 3).
  - **Badges beyond the existing manual grant** — `verified_agency` was
    already seeded (migration 0012) and is still purely admin-granted via
    `BadgeManager`; nothing auto-grants it on agency approval. `host_10`/
    `fast_responder`/etc. remain unimplemented per the Phase 1 section
    above, unchanged by this pass.
  - **QR/camera check-in** — see above; the underlying check-in flow
    works, just not via a scanned code.
  - **PRO tier** (multi-tenant CRM, revenue reporting, custom branding,
    `plan`/`commission_rate`/`branding_json` columns) — explicitly v2 per
    the PRD, not MVP.

## Payments: SINPE Móvil manual flow DONE, Google/Apple Pay still just research notes

User first asked how hard it'd be to add Google Pay/Apple Pay, and how
SINPE Móvil could work, specifically wanting to avoid Stripe/PayPal-style
commissions and poor Costa Rica support (2026-09-20). Answered as
engineering feasibility, not financial/legal advice — then, in the same
session, asked to actually build the SINPE flow.

- **Google Pay / Apple Pay — still research only, nothing built.** Not
  processors themselves — wallet UIs on top of one. The wallet
  integration itself is easy; the actual blocker is that none of the big
  global processors (Stripe, Braintree, Adyen) support Costa Rica as a
  merchant country today. Would need a CR-based gateway instead
  (**Tilopay**, **ONVO Pay** were named as the two worth evaluating) —
  whether either has completed Apple's Apple Pay merchant certification is
  unverified, a "check with them directly" question. Commission-wise,
  expect roughly Stripe-level rates (~3-4% + IVA) from either; "no
  commission" card/wallet processing doesn't really exist.
- [x] **SINPE Móvil manual evidence flow: DONE** (migration
  `0026_sinpe_payments.sql`). Exactly the v1.5-stage flow the PRD
  describes: agency posts a SINPE phone number on their profile
  (`agencies.sinpe_phone`), a confirmed buyer pays bank-to-bank via their
  own banking app (free, instant, no processor involved anywhere in this
  flow), uploads a screenshot as evidence, and the agency reviews it and
  confirms or rejects.
  - **First Storage bucket in this project** (`payment-evidence`,
    private). Path convention `{attendeeId}/{filename}` — RLS policies on
    `storage.objects` check `(storage.foldername(name))[1]` against the
    attendees row it names: uploader inserts their own, uploader *or*
    host team can read/delete. This is also the first place the "agency
    document upload needs Storage" deferral from earlier in this file
    actually got built out — the bucket/policy pattern here is the
    template for that whenever it's wanted.
  - **Same column-grant conflict as `set_agency_status()`, solved the
    same way**: `attendees.payment_status`/`payment_evidence_path` can't
    go through a normal grant, because a buyer marking their own payment
    submitted and an agency confirming/rejecting it need *different*
    column access under the same shared `authenticated` DB role. Three
    `SECURITY DEFINER` RPCs instead —
    `submit_payment_evidence()` (buyer, checks they own the attendee row
    and it's `confirmed`), `confirm_payment()` and `reject_payment()`
    (host team/admin only, checked via `is_host_team()`). No general
    UPDATE grant on either column exists at all.
  - `components/agencies/tour-payment.tsx` (buyer: shows the SINPE
    number, upload button, pending/paid states) and
    `components/agencies/tour-checkin.tsx` (host team: extended rather
    than duplicated into a second card — same attendee roster already
    doing check-in now also shows payment status with confirm/reject
    actions and a "view evidence" button that generates a signed URL
    client-side via `supabase.storage.createSignedUrl()`).
  - **Automating** SINPE reconciliation (no manual review) still isn't
    attempted — would need a real business-banking API integration per
    agency's own account, a much bigger lift involving compliance
    questions outside what could be assessed here.
  - **Side effect, closed a real gap**: there was no UI at all for an
    agency to edit its own profile after applying — `PATCH
    /api/agencies/[id]` existed (migration 0022) but nothing ever called
    it. `AgencyApplyForm` gained a `mode: 'apply' | 'edit'` (mirrors
    `TripForm`/`TourForm`'s existing shape) and a new `/agencies/[id]/edit`
    page, reachable from a gear icon on the panel — needed anyway so an
    agency could set `sinpe_phone` after the fact, not just at
    application time.

## Master admin panel: DONE

There was no single admin entry point before this — `/admin/reports` and
`/admin/agencies` existed as two unconnected pages, and there was no way
to browse/manage users directly (only reactively, from within a report
ticket already filed against them) or to grant the `admin` role to anyone
through the UI at all.

- [x] **`/admin`** (`app/[locale]/(main)/admin/page.tsx`): dashboard with
  three cards (open reports / pending agencies / total users, each with a
  live count) linking into the three sections below.
- [x] **`/admin/users`** (`components/admin/user-manager.tsx`): search by
  name, ban/suspend/reactivate (same actions the report queue already had,
  now reachable without needing an existing report), and **grant/revoke
  the `admin` role** — the piece that was completely missing. An admin
  can't remove their own admin role from this list (`user.id !==
  currentUserId` guard) — no self-lockout, but nothing stops two admins
  from removing each other, that's an intentional non-goal for now.
- [x] **`components/admin/admin-nav.tsx`**: a small pill-tab nav (Dashboard
  / Reports / Agencies / Users) now included on all four admin pages, so
  moving between sections doesn't mean going back to the header each time.
- [x] Header's "Admin" link now points at `/admin` (the dashboard) instead
  of straight to `/admin/reports`.
- **No UI path exists to grant the *first* admin** — chicken-and-egg,
  since granting admin is itself an admin-only action. Bootstrapping the
  first one is a one-time direct SQL update (see below); after that, every
  further admin grant goes through `/admin/users`.

## Bug fixed: forms only ever showed "Invalid ... data", never why

Every API route that validates with zod already returned the specific
field-level detail (`{ error: { message: 'Invalid tour data.', issues:
<zod .flatten()> } }`) — every form just never read `.issues`, only the
generic top-level `.message`. `lib/format-validation-error.ts`
(`formatValidationIssues()` / `extractErrorMessage()`, tested in
`format-validation-error.test.ts`) humanizes each failing field
(camelCase → "Camel case") and its reason and joins them, e.g. "Cupo
máximo" typed as text on the tour form now says `Capacity: Expected
number, received string` instead of just "Invalid tour data." Wired into
every form that had the same `body?.error?.message ?? fallback` pattern:
`TourForm`, `TripForm`, `AgencyApplyForm`, `OnboardingForm`,
`AgencyTourList`'s publish error.

**Known limitation, not fixed**: field labels are humanized, not
translated, and zod's own validation reasons ("Too small: expected number
to be >=1000") are in English regardless of the app's current locale —
full localization of validation messages would be a separate, larger
piece of work. Still a large improvement over zero detail at all.

## Responsive header: DONE

Header nav had grown to up to 7 items when logged in as admin (feed, my
trips, my agency, create trip, admin, notifications, sign out) — fine on
desktop, genuinely cramped on tablet/phone.
`components/layout/mobile-nav.tsx` collapses everything except the logo
and the notification bell into a hamburger button below `lg` (1024px),
reusing the same `Popover` primitive `NotificationBell` already uses
rather than adding a dedicated sheet/drawer component. Desktop nav is
unchanged, just wrapped in `hidden lg:flex`.

- **Bug caught and fixed while browser-testing at the breakpoint
  boundary**: opened the mobile menu at phone width, then resized past
  `lg` without closing it first — the popover stayed visibly open
  *alongside* the full desktop nav, both rendered at once. Root cause:
  only the hamburger *trigger* button had `lg:hidden`; Radix portals
  `PopoverContent` to `document.body`, so its visibility isn't tied to
  the trigger's — it stays mounted and visible purely because `open`
  state was still `true`, regardless of viewport width. Fixed by also
  adding `lg:hidden` to `PopoverContent` itself, so trigger and content
  visibility are both driven by the same breakpoint instead of only one
  of them.

## Tour templates, private-trip documents, paid-attendee exclusive content: DONE

Three follow-up requests (2026-09-20), each its own migration:

- **Tour templates** (migration `0028`, `tour_templates` table). An agency
  saves a tour's content (everything except dates/booking state — title,
  description, map, custom fields, links, capacity, price) as a reusable
  template, either from scratch (`/agencies/[id]/templates/new`) or from
  an existing tour ("save as template" button in `AgencyTourList`, which
  copies the trip's current fields server-side). "Use" on a template
  (`AgencyTemplateList`) opens `tours/new?template=<id>`, which prefills
  `TourForm` via a new `templateValues` prop — everything except
  start/end, which always start blank since the whole point is a new
  schedule. RLS is staff-or-admin only (`is_agency_staff`/`is_admin`),
  same shape as the rest of an agency's internal tooling — no public
  read branch, unlike `agencies`/published tours.
- **Private-trip document uploads** (migration `0029`, `trip_documents`
  table + second Storage bucket `trip-documents`, path
  `{tripId}/{filename}`, same pattern as `payment-evidence` from `0026`).
  Host team uploads (reservation confirmations, plane tickets, etc.),
  any confirmed member can view/download via a signed URL,
  uploader-or-host-team can delete. `components/plans/trip-documents.tsx`
  is mounted only in the private-plan branch of the trip detail page —
  built generically at the `trips` level (not gated on
  `visibility='private'` in the database) since membership works
  identically for a private plan and a public social trip, but nothing
  currently surfaces it outside private plans.
- **Exclusive content for paid tour attendees** (migration `0030`,
  `tour_exclusive_content` table, one row per tour). WhatsApp group
  links, meeting-point details, anything an agency wants to hold back
  until payment clears. **Deliberately its own table, not a
  `trips.exclusive_content` column** — the existing "trips: read
  published public..." policy lets anyone read a published public tour's
  *entire row*, and Postgres RLS has no column-level granularity, so a
  plain column would leak to every visitor regardless of payment status.
  A separate table gets a genuinely row-conditional SELECT policy
  (`is_host_team(trip_id) OR is_admin() OR` an `attendees` row for
  `auth.uid()` with `status='confirmed' AND payment_status='paid'`) —
  same reasoning that already produced `tour_questions`/`reviews`/
  `tour_templates` as their own tables. Editable via a new field on
  `TourForm` (`exclusiveContent`, optional markdown, max 4000 chars);
  saved through a new `saveTourExclusiveContent()` helper in
  `lib/trip-extras.ts` (upserts if non-empty, deletes the row if
  cleared) called from both the tour-create and tour-edit routes.
  Rendered read-only via `components/agencies/tour-exclusive-content.tsx`
  (a server component — no client-side gating logic needed since the
  query itself already only returns a row when RLS allows it).
- **Known pre-existing gap, not introduced or fixed this session**:
  `attendees.payment_status`/`payment_evidence_path` are exposed the
  same row-level-only way — the "attendees: public read confirmed on
  public trips" policy (migration `0006`) is row-scoped, so a client
  could `select('payment_status, payment_evidence_path')` directly on
  any confirmed attendee of any public trip via the JS client, bypassing
  the fact that the app's own UI only ever surfaces those columns to the
  host team. Flagging for awareness — fixing it would need the same
  separate-table treatment as `tour_exclusive_content` above, or a
  column-level `REVOKE`/`GRANT` on `attendees`, neither of which was in
  scope for this session's requests.

## Waitlist visibility, multi-date tours, agency ratings, feed filters, itinerary UX: DONE

Five follow-up requests (2026-09-20):

- **Waitlist visibility** (migration `0031`, one RPC, no table changes).
  Waitlisting itself already existed end-to-end since migration `0004`
  (`join_trip()` confirms if a seat's free, else waitlists;
  `leave_trip()` promotes the earliest waitlisted row when a seat frees
  up) — what was missing was visibility. `components/trips/
  waitlist-panel.tsx` gives the host team a roster (their existing RLS
  access already covers every waitlisted row, no new policy needed);
  `get_my_waitlist_position()` is a small SECURITY DEFINER RPC so a
  regular attendee can see their own position, which the existing "read
  own or organizer or admin" policy alone can't answer since it only
  ever exposes a caller's *own* row, never the others ahead of them a
  position count requires. `JoinTripButton` shows "You're on the
  waitlist (#3)" when a position is available.
- **Multi-date tours** (migration `0032`, `trips.tour_group_id`).
  Deliberately NOT a shared-capacity-pool redesign — every date is still
  its own fully independent `trips` row (own capacity/attendees/chat/
  reviews/check-in/payment state), linked to its siblings only by
  `tour_group_id` pointing at the primary date's id. Zero changes to
  `join_trip`/`leave_trip`/capacity triggers/check-in/payments/reviews —
  all of that machinery works exactly as it did for a single-date tour,
  applied once per date. `TourForm` gained a repeatable "additional
  dates" list (create mode only); the tours API route creates a sibling
  `trips` row per extra date (copying content, not booking state) and
  sets `tour_group_id` on all of them. The trip detail page shows an
  "Other dates" pill row linking between siblings. **Known v1
  limitation**: editing one date's content (title/description/etc.)
  doesn't propagate to its siblings — each is independently editable,
  by design (see the migration's own comment), but worth knowing if an
  agency expects a single edit to update every date at once.
- **Agency rating rollup**: `agencies/[id]/page.tsx` now averages
  `reviews.rating` across every one of the agency's tours (two queries —
  agency's tour ids, then reviews `.in()` those ids — same established
  pattern as My Trips/Verified feed elsewhere, not an embedded-resource
  filter), shown next to the verified badge. Exported the `Stars` helper
  from `tour-reviews.tsx` (was file-local) to reuse it here rather than
  duplicating a star-rendering component.
- **Feed price/date filters**: `components/trips/feed-filters.tsx`, a
  plain `method="get"` form (no client JS, matching how category/
  Verified/Near-me are already plain links) with max-price and date-
  range inputs, hidden inputs carrying the other active filters forward.
  Server-side: date range clamps its lower bound to `max(now, dateFrom)`
  so a past date can't resurrect already-started trips; the price filter
  uses `.or('price_crc.lte.X,price_crc.is.null')` so it narrows tours
  over budget without hiding social trips (which have no price at all).
- **Itinerary UX**: the always-visible "add stop" form (every field
  expanded even for a read-only viewer's view of a short itinerary) now
  collapses behind an "Add stop" button, matching the collapsed-by-
  default pattern the rest of the app uses for secondary actions. Added
  a day-jump pill row (only when there's more than one day) that anchor-
  links down to that day's section — useful once an itinerary has more
  than 2-3 days and the list gets long. Also added a subtle vertical
  connector line behind each day's stops for a lighter timeline feel.
  No new functionality here (still no editing an existing block, only
  add/delete), purely a decluttering/navigation pass.

## Not started

- **Notification delivery channels**: Web Push (VAPID), Resend email, and
  T-24h/T-2h trip reminders. The in-app notification pipeline these would
  ride on (`notifications` table + triggers, migration `0008`) already
  exists — this is purely about adding delivery channels on top of it.
  Needs external setup before any code is useful: a VAPID keypair for
  Web Push, a Resend account + API key for email, and a scheduler for the
  reminders (Supabase `pg_cron` or an external periodic trigger hitting a
  route handler) — deferred pending those.
- Phase 4 (real payment capture / card processor integration) — untouched;
  the SINPE Móvil manual-evidence flow is done (see "Payments" above) and
  covers the same ground the PRD's v1.5 stage calls for. Phase 2 is done
  except document upload, Phase 3 is done except shared docs/Storage (both
  explicit user decisions) — see `docs/roadmap.md` for the full breakdown.

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
