# Dele Viaje — Project Status

Living log of what's actually built, for picking this up in a fresh session.
Source of truth for *intent* is still `docs/PRD.md`, `docs/architecture.md`,
`docs/data-model.md`, `docs/api.md`, `docs/roadmap.md` — this file tracks
*what's real right now* versus what those docs describe as the target.
Supersedes the old `PHASE0_STATUS.md` (deleted, this file replaces it).

Last updated: 2026-09-17.

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

## Phase 1 — Social Core: IN PROGRESS

- [x] **Trips**: `trips` table (schema supports `type: tour` and
      `visibility: private` per the data model, but only `social` +
      `public` trips are actually creatable right now — tours need
      agencies (Phase 2), private plans are Phase 3).
  - Create: `/trips/new` (protected: login + onboarding required) →
    `POST /api/trips`. Publishes immediately, no draft state yet.
  - Discovery feed: `/feed` (public), category filter via URL query,
    proper empty states, no map view yet (location is a plain text field —
    no MapLibre/Nominatim integration).
  - Detail: `/trips/[id]`.
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
- [ ] Everything else in Phase 1 per `docs/roadmap.md`: notifications
      (in-app inbox, Web Push, Resend email, T-24h/T-2h reminders),
      follows, badges, super-admin basics (report queue, ban/suspend).

## Not started

Phase 2 (agencies/tours), Phase 3 (private plans + workspace), Phase 4
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
