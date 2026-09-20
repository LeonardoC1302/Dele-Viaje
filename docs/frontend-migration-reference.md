# Dele Viaje — Frontend Migration Reference

## Purpose / scope

This document exists so a **full ground-up frontend redesign** (new visual
design system, rebuilt components, possibly a different component library)
preserves **100% of existing functionality**. It is an inventory of what
must keep working, not a redesign plan and not a design system spec —
`docs/design-taste.md` (the current visual language) is explicitly being
superseded by whatever comes out of the redesign, and this doc doesn't
prescribe anything about how the new UI should look.

Treat every feature, route, RLS policy, and database column below as a
requirement the new UI must still be able to reach, not as documentation of
implementation detail to copy verbatim. Where the current implementation
has a known quirk or limitation, it's called out so the redesign doesn't
accidentally "fix" something that was intentional, or silently reintroduce
a bug that was already fixed.

Source of truth this doc was built from: `PROJECT_STATUS.md` (phase-by-
phase build log, read in full), all 32 files in `supabase/migrations/`
(read in full — every table described below is the *cumulative end state*
after every `ALTER`, not any single migration in isolation), and a full
`Glob` enumeration of `app/**/page.tsx`, `app/api/**/route.ts`, and
`components/**/*.tsx` (not just what's mentioned in the log).

Two migrations groups are flagged in `PROJECT_STATUS.md` as **not yet
pushed to the live database** as of the last update (2026-09-20):
`0020`–`0032`. Everything below describes the schema/RLS as written in the
migration files (i.e. the intended, checked-in state), which is also what
any rebuilt frontend should be coded against — confirm with whoever's
running `npx supabase db push` before assuming a given table/column/policy
is live in a specific environment.

---

## 1. Feature inventory

Organized by domain. For each feature: what it does, who can do it, and
what currently implements it.

### 1.1 Auth & onboarding

- **Sign up / log in** — Google OAuth and email/password via Supabase
  Auth. Anyone (unauthenticated visitor).
  - Pages: `/login`, `/signup`, `/signup/check-email` (all under the
    `(auth)` route group, outside `(main)`).
  - Components: `components/auth/login-form.tsx`,
    `components/auth/signup-form.tsx`, `components/auth/google-button.tsx`.
  - Server: `app/actions/auth.ts` (Server Actions for login/signup),
    `GET /api/auth/callback` (OAuth + PKCE callback),
    `POST /api/auth/signout`.
  - Locale-aware redirects throughout (the `NEXT_LOCALE` cookie persists
    next-intl's resolved locale for redirects from plain Route Handlers,
    which sit outside the `[locale]` segment).
- **Onboarding** — first-login gate: display name, locale, interest
  categories. Required before trip creation is allowed.
  - Any authenticated user with `profiles.onboarding_done = false`.
  - Page: `/onboarding`. Component: `components/auth/onboarding-form.tsx`.
  - `PATCH /api/onboarding`.
- **Account status enforcement (ban/suspend)** — a `banned`/`suspended`
  profile is blocked from: creating a trip, sending a chat message,
  joining a trip (`join_trip()` raises `ERR_ACCOUNT_NOT_ACTIVE`), creating
  a follow, creating a plan invite, adding packing items/expenses/polls,
  itinerary blocks. **Not** blocked: `leave_trip()`/`leave_plan()`
  (a banned user can still give up a seat), editing own profile, filing a
  report (can still dispute the ban), reading content. Enforcement doesn't
  force-sign the user out.

### 1.2 Profiles

- **Own profile / settings** — display name, avatar, bio, locale,
  category prefs are edited via onboarding's underlying fields (no
  separate settings page beyond onboarding as currently built).
- **Public profile page** (`/users/[id]`) — avatar, bio, follower/
  following counts, their published public trips (`TripCard` reuse),
  `FollowButton` (hidden on own profile / logged out), granted `BadgeList`.
  Anyone can view; only admins see extra (badge grant/revoke) controls.
  - Public-safe fields are read via `profiles_public()` (a `SECURITY
    DEFINER` function, not a view/table) — never query `profiles` directly
    for anyone but the current user.
- **Follows** — follow/unfollow a user (also usable to follow an agency's
  owner profile — same table, no agency-specific column).
  - Any active user, not on self. `components/profile/follow-button.tsx`.
  - `POST /api/follows/{profileId}`, presumably `DELETE` too (see route
    map — confirm exact verbs in the route file).
- **Badges** — small icon chips shown on a profile (`verified_agency`,
  `fast_responder`, `host_10`, `great_host`, `good_participant`), manual
  admin grant/revoke only (no auto-rules implemented for any of them, even
  though 3 of the 5 could theoretically be computed now).
  - Viewer: anyone (badges are public read). Grant/revoke: admin only.
  - `components/profile/badge-list.tsx` (display),
    `components/admin/badge-manager.tsx` (admin toggle grid, inline on the
    profile page, not a separate route).

### 1.3 Social trips (public)

- **Create a social trip** — title, markdown description, category,
  meeting point + optional extra stops (map-based), start/end, capacity,
  join deadline, custom fields, linked places. Publishes immediately (no
  draft flow exists in the UI even though `trips.status` supports
  `'draft'`).
  - Any authenticated user past onboarding. Page: `/trips/new`
    (protected). `POST /api/trips`.
  - `components/trips/trip-form.tsx` (`mode: 'create' | 'edit'`, shared
    with edit), `components/trips/trip-map-editor.tsx` (multi-stop map),
    `components/trips/custom-fields-editor.tsx`,
    `components/trips/links-editor.tsx`,
    `components/ui/markdown-editor.tsx`.
- **Edit a social trip** — organizer only. `/trips/[id]/edit`, `PATCH
  /api/trips/[id]` (also re-checks `owner_id`/`canManageTrip()` server-
  side even though RLS is the real enforcement).
- **Delete a trip** — organizer (or host team for a tour) only.
  `DELETE /api/trips/[id]`, `components/trips/delete-trip-button.tsx`
  (confirm dialog; optional `redirectTo` prop so deleting a tour returns
  to the agency panel instead of `/my-trips`). Relies on `on delete
  cascade` FKs for every child table — no manual cascade code.
- **Discovery feed** — `/feed` (public, no login required). Category
  filter, "Near me" tab (geolocation + haversine radius), "Verified" tab
  (tours from approved agencies only, checked at read time not just
  publish time), price/date-range filters, List/Map toggle.
  - `components/trips/feed-view.tsx`, `feed-filters.tsx`,
    `near-me-button.tsx`, `trip-map.tsx` (clustered MapLibre GeoJSON
    source), `trip-card.tsx`.
- **Trip detail page** (`/trips/[id]`) — branches hard on
  `visibility: 'private'` (private plan layout, see §1.4) vs a public
  social trip / tour layout (join button, waitlist, attendee list, chat
  link, itinerary, reviews/Q&A/payment for tours).
- **Multi-stop / multi-meeting-point map** — meeting point (required,
  `trips.location_name`/`lat`/`lng`) plus any number of ordered
  `trip_waypoints`, each tagged `kind: 'meeting_point' | 'stop'`
  (multiple pickup points for a bus tour, or multiple destinations).
  Reorderable via up/down buttons (no drag-and-drop). Geocoded via
  Nominatim (`GET /api/geocode`) or placed by clicking the map. A dashed
  route line previews instantly then upgrades to a real OSRM road route
  after a 600ms debounce (`GET /api/directions`).
  - Editor: `trip-map-editor.tsx`. Read-only viewer:
    `trip-route-map.tsx`.
- **RSVP / waitlist** — join (`confirmed` if a seat's free, else
  `waitlisted`) / leave. Transactional (`pg_advisory_xact_lock`) so
  concurrent joins on the last seat can't oversell. Leaving auto-promotes
  the longest-waiting waitlisted attendee.
  - Any active user, not the organizer (no self-RSVP), not on an
    already-started or already-joined trip.
  - `components/trips/join-trip-button.tsx` (handles: logged out,
    organizer, confirmed, waitlisted-with-position, full, started).
    `POST /api/trips/[id]/join`, `POST /api/trips/[id]/leave`.
- **Waitlist visibility** — a waitlisted attendee sees their own numeric
  position (`get_my_waitlist_position()` RPC); the host team sees a full
  waitlist roster (`components/trips/waitlist-panel.tsx`, no RPC needed —
  covered by existing host-team read access).
- **Attendee list** — confirmed attendees shown publicly on a published
  public trip. `components/trips/attendee-list.tsx`.
- **Custom fields** — freeform label/value stat pairs on a trip (distance,
  elevation, difficulty, whatever the organizer wants), no fixed schema.
  Host-team write, anyone who can read the trip can read them.
  `custom-fields-editor.tsx` / `custom-fields-display.tsx`.
- **Linked places** — organizer pastes a URL (+ optional label override);
  server fetches `og:title/description/image` best-effort (regex over
  the first ~100KB of `<head>`, SSRF-guarded against internal/loopback
  hosts — known gap: checks the literal hostname string, not the
  DNS-resolved IP, so DNS rebinding isn't defended against). No preview
  is not an error — the raw link still saves and displays.
  `links-editor.tsx` / `link-preview-card.tsx`, `lib/link-preview.ts`.
- **Itinerary** — day-grouped ordered blocks (day/time/label/description/
  photo URL or a picked icon fallback). Any member/host-team can add
  (host team on a public trip, any member on a private plan); only host
  team can delete; no edit. Rendered on both public trips and private
  plans (same RLS, same component). Day-jump pill nav + collapsed "Add
  stop" form once an itinerary has more than a couple entries.
  `components/plans/itinerary-list.tsx`,
  `components/plans/itinerary-icons.tsx`,
  `components/ui/time-picker.tsx` (custom hour/5-min-step selects, not
  native `<input type=time>`).
- **Chat (per trip)** — Realtime room, organizer + confirmed attendees
  read & send, waitlisted attendees read-only. Soft delete (sender or
  organizer/host team). Editing is sender-only (`edit_message()` RPC).
  System-event rows (`joined`/`left`/`promoted`) auto-posted by a DB
  trigger, rendered client-side from `event_type` so they're locale-
  correct regardless of who's viewing. **Not implemented**:
  `cancelled`/host-announcement system events, `chat_settings`
  (WhatsApp link, announcements-only, mute — schema for this was never
  built, unlike most other "not implemented" items which at least have a
  table).
  - `/trips/[id]/chat`, `components/chat/chat-room.tsx`.
  - **Realtime footgun**: always create one Supabase browser client per
    component (state/ref) and `await supabase.auth.getSession()` before
    `.channel(...).subscribe()` — a fresh client subscribed to
    immediately can silently receive zero events since RLS needs
    `auth.uid()` resolved first.
- **Report content** — flag a trip, a chat message, or a user.
  `components/reports/report-button.tsx` (reason `Select` + optional
  details), `POST /api/reports`. Hidden on your own messages / yourself.

### 1.4 Private plans / collaborative workspace

A private plan is **not a separate entity** — it's a `trips` row with
`visibility: 'private'`. Membership reuses `attendees` (`status:
'confirmed'`) exactly like a social trip, reached via invite instead of
open RSVP. `join_trip()`/`leave_trip()` are never used for plans.

- **Create a private plan** — same `TripForm`, `visibility` choice
  (public social trip vs private plan) shown only at create time —
  immutable after publish. The owner is auto-confirmed into `attendees`
  via a DB trigger the moment the plan row is created (so they show up
  as a member of their own plan).
- **Invite links** — organizer/host team generates a token link
  (`expires_at`, optional `max_uses`), revocable (soft — `revoked_at`,
  keeps use history). `components/plans/invite-manager.tsx`.
  `POST/GET /api/trips/[id]/invites`, `DELETE /api/invites/[inviteId]`.
- **Direct (email) invites** — same `plan_invites` table/token/accept
  flow as a link invite, just pre-addressed to one profile
  (`invited_profile_id`), delivered as an in-app notification (no email
  sending exists). Looked up by email against `auth.users` via a
  `SECURITY DEFINER` function since `profiles` has no email column.
  `POST /api/trips/[id]/invites/direct`.
- **Invite landing / accept** — `/invite/[token]` shows "You're invited
  to X" (or why the link doesn't work: revoked/expired/exhausted) via a
  read-only `preview_plan_invite()` RPC, before the visitor commits.
  Accepting calls `accept_plan_invite()` (idempotent). A direct invite
  rejects anyone but the named invitee.
  `components/plans/accept-invite-button.tsx`,
  `POST /api/invites/accept`.
- **Packing list** — add item (optionally assign to a member — doubles as
  "prerequisites"), toggle done, host-team-only delete. Any member can
  add/toggle. `components/plans/packing-list.tsx`.
- **Budget / expenses** — log an expense (payer, amount CRC, description).
  Equal split across members computed client-side on every render, never
  stored (avoids staleness as membership changes). Delete by creator or
  host team. `components/plans/expenses-list.tsx`.
- **Polls** — question + 2+ options, toggleable voting (upsert on
  `(poll_id, profile_id)` — revoting moves your vote, doesn't double-
  count), live vote-count bars, close (`closes_at`) or soft-delete by
  creator or host team. `components/plans/polls-list.tsx`.
- **Shared documents** — host team uploads (reservation confirmations,
  tickets, etc.) to a private Storage bucket (`trip-documents`, path
  `{tripId}/{filename}`); any confirmed member views/downloads via a
  signed URL; uploader or host team deletes. Mounted only in the
  private-plan branch of the trip detail page, though the schema/RLS work
  identically for a public trip. `components/plans/trip-documents.tsx`.
  (Note: `docs/*` elsewhere may still call this "not built" — it's the
  most recently landed feature, migration `0029`.)
- **Leaving a plan / owner transfer / removal** —
  - `leave_plan(trip_id)`: confirmed non-owner sets their own row to
    `cancelled`. Owner **cannot** leave this way.
  - `transfer_plan_ownership(trip_id, new_owner_id)`: owner-only, target
    must already be a confirmed member.
  - Removing a member: organizer does a plain `attendees.update()` client
    side (no RPC needed — existing policy already allows it).
  - `components/plans/plan-members.tsx` (owner sees "make organizer" /
    "remove" per member; everyone else sees "leave plan" on themselves).
  - **Auto-archive**: if a private plan's confirmed-member count ever
    hits zero, a trigger sets `trips.status = 'archived'` — a safety net,
    rarely reachable via the normal UI paths.
- **My Trips dashboard** (`/my-trips`) — "Organizing" (owned) + "Joined"
  (confirmed via `attendees`, minus owned) sections, public and private,
  past and upcoming, unfiltered by date/visibility (unlike `/feed`).
  `TripCard` shows a "Private plan" badge and dims past trips.

### 1.5 Agencies & tours (marketplace)

- **Apply for an agency account** — business name, legal name/id,
  description, location, optional SINPE phone. Creates the agency
  (`status: 'pending'`) and the applicant's own `'owner'` membership
  atomically.
  - Any active authenticated user. `/agencies/new`,
    `components/agencies/agency-apply-form.tsx` (`mode: 'apply' |
    'edit'`), `POST /api/agencies` → `apply_for_agency()`.
- **Edit agency profile** — `/agencies/[id]/edit`, reachable from a gear
  icon on the panel. `PATCH /api/agencies/[id]`.
- **Admin approval queue** — pending → approve/reject; approved →
  suspend; suspended/rejected → reactivate. Every status change funnels
  through `set_agency_status()` (admin-only, column-grant can't express
  "these columns for staff, all for admins" under one shared DB role).
  Admin only. `/admin/agencies`, `components/admin/agency-queue.tsx`,
  `PATCH /api/admin/agencies/[id]`.
- **Agency staff management** — owner/admin-role staff add by email
  (`add_agency_staff_by_email()`, straight to `active`, no accept step)
  or remove (`agency_members.update({status:'removed'})` client-side).
  `components/agencies/agency-staff-manager.tsx`.
- **Public agency profile** (`/agencies/[id]`) — business name, verified
  badge (approved only), description, published tours grid, aggregate
  star rating rolled up across all the agency's tour reviews. Pending/
  suspended/rejected agencies visible only to their own staff or an
  admin.
- **Agency panel** (`/agencies/[id]/panel`) — status banner (empty once
  approved), tour list with Publish button on drafts, staff manager.
  `agency-status-banner.tsx`, `agency-tour-list.tsx`,
  `agency-staff-manager.tsx`.
- **Create/edit/publish a tour** — a *separate form* from `TripForm`
  (`components/agencies/tour-form.tsx`), not a mode bolted on — different
  endpoint (agency-staff-authorized), no visibility choice (always
  public), price/capacity required. Created as `status: 'draft'`;
  `POST /api/agencies/[id]/tours/[tripId]/publish` flips it live, gated
  on the *agency* being approved. Edit via `canManageTrip()` (owner OR
  active staff). `/agencies/[id]/tours/new`,
  `/agencies/[id]/tours/[tripId]/edit`,
  `POST /api/agencies/[id]/tours`, shared `PATCH/DELETE
  /api/trips/[id]`.
- **Multi-date tours** — a repeatable "additional dates" list at create
  time; the API creates one fully independent sibling `trips` row per
  date (own capacity/attendees/chat/reviews/check-in/payment — nothing
  shared), linked only by `tour_group_id` pointing at the primary date.
  The trip detail page shows an "Other dates" pill switcher. **Known v1
  limit**: editing one date's content does not propagate to siblings.
- **Tour templates** — save a tour's reusable content (everything except
  dates/booking state) either from scratch
  (`/agencies/[id]/templates/new`) or via "save as template" on an
  existing tour. "Use" opens `tours/new?template=<id>`, prefilling
  `TourForm` (dates always blank). Staff/admin only, no public read.
  `components/agencies/agency-template-list.tsx`,
  `tour-template-form.tsx`, `POST /api/agencies/[id]/templates`,
  `POST /api/agencies/[id]/tours/[tripId]/save-as-template`.
- **Tours on the feed** — no special query; a published tour naturally
  matches the existing public-feed filter. `TripCard` shows a "Tour"
  badge + formatted ₡ price when `type: 'tour'`.
- **Tour Q&A** — public question-and-answer thread on a tour. Any active
  user can ask (no booking/membership requirement); only host team can
  answer; a question can never be edited by anyone once posted; deletion
  is host-team/admin moderation only (not available to the asker — keeps
  the record trustworthy both ways). `components/agencies/tour-qa.tsx`.
- **Reviews + agency responses** — scoped to tours only. Reviewer must
  have `attendees.attendance = 'attended'` (set by check-in) on a tour
  whose `start_at` is already past (deviates from the PRD's "attended +
  completed" gate — `trips.status` never actually reaches `'completed'`
  in this app, so that would be unreachable). Reviewer can delete their
  own review (unlike a Q&A question — a review is a claim about a real
  experience, not a record worth freezing). Agency can add one response
  per review (host-team-only column grant). `components/agencies/
  tour-reviews.tsx` (exports the shared `Stars` component).
- **Manual check-in** — no QR/camera; a roster with a tap-to-toggle
  check-in button per confirmed attendee (`attendees.attendance =
  'attended'`). Host team only. `components/agencies/tour-checkin.tsx`.
- **SINPE Móvil manual payment flow** — agency posts a SINPE phone number
  on their profile; a confirmed buyer pays bank-to-bank via their own
  banking app (off-platform, no processor), uploads a screenshot as
  evidence to a private `payment-evidence` bucket
  (`{attendeeId}/{filename}`), and the host team reviews it and
  confirms/rejects.
  - Buyer: `submit_payment_evidence()` (own attendee row, must be
    `confirmed`). Host team: `confirm_payment()` / `reject_payment()`
    (reject resets to `payment_status: 'none'`, clears the evidence path,
    doesn't delete the file).
  - `components/agencies/tour-payment.tsx` (buyer view: SINPE number,
    upload, pending/paid state), `tour-checkin.tsx` (host view: extends
    the same roster with payment status + confirm/reject + "view
    evidence" via a client-generated signed URL).
  - **Known pre-existing gap**: `attendees.payment_status`/
    `payment_evidence_path` are exposed at row-level only — the "public
    read confirmed on public trips" policy is row-scoped, so a client
    could select those columns directly via the JS client on any
    confirmed attendee of any public trip, even though the app's own UI
    never surfaces them outside the host team. Not fixed; would need the
    same separate-table treatment `tour_exclusive_content` got, or a
    column-level REVOKE/GRANT.
- **Exclusive content for paid attendees** — one row of markdown per
  tour (WhatsApp group link, real meeting-point detail, etc.), readable
  only by host team, admin, or a confirmed attendee with `payment_status
  = 'paid'`. Deliberately its own table (RLS has no column-level
  granularity, so this couldn't safely be a `trips` column). Edited via
  a field on `TourForm`; rendered via
  `components/agencies/tour-exclusive-content.tsx` (server component —
  the query itself only returns a row when RLS allows it, no client-side
  gating logic).
- **Verified feed tab** — checks agency approval **at read time**
  (second query against currently-approved agency ids), not just at
  tour-publish time, since a suspension after publish doesn't currently
  un-publish the tour.

### 1.6 Notifications

- **In-app inbox only.** Web Push (VAPID), Resend email, and T-24h/T-2h
  trip reminders are explicitly deferred (not built), by user decision.
  The pipeline (table + triggers) exists and is ready for those channels
  to ride on top later.
- Types: `trip_joined` (attendee confirms → notifies organizer, skipped
  for waitlisted joins), `waitlist_promoted`, `new_message`,
  `new_follower`, `plan_direct_invite`. All written server-side (trigger
  or `SECURITY DEFINER` function) — users never insert notification rows
  directly.
- `NotificationBell` (`components/notifications/notification-bell.tsx`) —
  logged-in `(main)` header only. Initial list + related actor/trip data
  fetched server-side in the layout; live updates over a Realtime channel
  scoped to `notifications:{userId}`. Opening the popover marks unread as
  read (column-scoped `PATCH`, same soft-delete-style grant pattern as
  chat).
- **Not implemented**: plan-event notifications beyond the direct-invite
  one (joined/poll-added/expense-added/etc. would need more `plan_*`
  types added to the check constraint).

### 1.7 Moderation & admin

- **Report queue** — target `trip | user | message` from the app's own
  UI (the DB check constraint also allows `review | agency | plan` for
  future use, not currently reachable from any UI). Status transitions
  (open → investigating → resolved/dismissed), internal admin-only note,
  inline ban/suspend/reactivate for `target_type: user` tickets.
  Admin only, server-checked (not just hidden nav). `/admin/reports`,
  `components/admin/report-queue.tsx`.
- **Ban/suspend/reactivate + grant/revoke admin role** —
  `/admin/users`, `components/admin/user-manager.tsx`: search by name,
  same ban/suspend actions as the report queue reachable directly, plus
  granting/revoking the `admin` role itself (an admin can't remove their
  own admin role — no self-lockout — but two admins can remove each
  other, an accepted non-goal). **No UI path to grant the very first
  admin** — chicken-and-egg; bootstrapped via a one-time direct SQL
  update.
- **Admin dashboard** (`/admin`) — three live-count cards (open reports /
  pending agencies / total users) linking into the sections above plus
  agency approval. `components/admin/admin-nav.tsx` — pill-tab nav
  (Dashboard/Reports/Agencies/Users) on all four admin pages.
- Admin nav link in the header renders only for `role === 'admin'`.

### 1.8 Landing / marketing / PWA shell

- **Homepage** (`/[locale]`, outside `(main)`) — GSAP-parallax abstract-
  shape hero (`components/landing/canopy-blobs.tsx`, deliberately
  abstract, not literal trees/leaves), how-it-works bento
  (`how-it-works.tsx`), agencies CTA (`agencies-cta.tsx`), waitlist
  capture (`waitlist.tsx` — **UI only, not wired to any backend list**),
  footer (`footer.tsx`). Fully bilingual. Own `Navbar`
  (`components/landing/navbar.tsx`), separate from the `(main)` header.
- **PWA** — manifest (`app/manifest.ts`), icons (`app/icon.tsx`,
  `apple-icon.tsx`, generated via `next/og` from `lib/app-icon.tsx`, an
  evergreen-tree glyph — not a letter monogram), minimal service worker
  (`public/sw.js`, no offline caching strategy), iOS install hint
  (`components/pwa/ios-install-hint.tsx`),
  `components/pwa/service-worker-register.tsx`.
- **i18n** — every route lives under `app/[locale]/...`; `es` (default) /
  `en`, always prefixed. Locale switcher in the navbar/header.
  `NEXT_LOCALE` cookie persists resolved locale for redirects from plain
  Route Handlers outside `[locale]`.
- **Responsive header** — `components/layout/mobile-nav.tsx` collapses
  everything but logo + notification bell into a hamburger below `lg`
  (1024px), reusing the `Popover` primitive.

---

## 2. Full database schema reference

Cumulative end state after every migration (`0001`–`0032`), grouped by
domain. RLS policies are summarized in plain English, not full SQL.
Column grants are noted where a table uses the "narrow column grant
instead of a broad UPDATE policy" pattern (appears repeatedly — see
§6 non-negotiables).

### 2.1 Identity & social

**`profiles`** (PK `id` = `auth.users.id`)
`display_name`, `avatar_url`, `bio` (≤500), `locale` (`es`/`en`), `phone`,
`onboarding_done` bool, `category_prefs text[]`, `role` (`user`/`admin`),
`status` (`active`/`banned`/`suspended`), `last_seen_at`, timestamps.
- RLS: select — own row or admin. Update — own row only. Admin — full
  access to all rows (separate `for all` policy).
- No public row-level read policy at all — public-safe fields are
  exposed exclusively via `profiles_public()` below.
- Trigger `handle_new_user()` (`SECURITY DEFINER`, on `auth.users`
  insert) auto-creates the profile row.

**`profiles_public()`** — `SECURITY DEFINER` function (not a view, to
avoid Supabase's "Security Definer View" linter flag), returns `id,
display_name, avatar_url, bio, created_at` for every profile. Granted to
`anon, authenticated`.

**`follows`** (PK `(follower_id, followed_id)`)
`follower_id`, `followed_id` (both FK profiles), `created_at`. Unique
pair, check `follower_id <> followed_id`.
- RLS: read — public (anyone). Insert — own `follower_id` + `is_active()`.
  Delete — own `follower_id`.
- Trigger `notify_new_follower()` writes a `new_follower` notification.

**`badges`** (PK `code`) — `label_es`, `label_en`, `icon`. Seeded rows:
`verified_agency`, `fast_responder`, `host_10`, `great_host`,
`good_participant`.
- RLS: read — public. Write — admin only.

**`user_badges`** (PK `(profile_id, code)`) — `granted_at`.
- RLS: read — public. Write — admin only (manual grant/revoke, no
  auto-rules implemented for any badge).

**`report_tickets`**
`reporter_id`, `target_type` (`trip|user|message|review|agency|plan`),
`target_id`, `reason` (≤200), `description` (≤2000, nullable), `status`
(`open|investigating|resolved|dismissed`), `admin_note`, `created_at`,
`resolved_at`.
- RLS: insert — reporter creates own. Select — reporter reads own, or
  admin reads all. Update — admin only.
- App-level (zod) restricts `target_type` to `trip|user|message` even
  though the DB constraint allows more.

### 2.2 Trips (core)

**`trips`**
`id`, `type` (`social`/`tour`), `visibility` (`public`/`private`,
immutable after publish by convention — not DB-enforced), `owner_id` (FK
profiles), `agency_id` (FK agencies, `on delete set null`), `title`
(3–120 chars), `description` (1–4000 chars, markdown), `cover_url`,
`category`, `location_name`, `lat`/`lng` numeric(9,6), `start_at`/
`end_at`, `capacity`, `min_participants`, `join_deadline`, `status`
(`draft|published|full|in_progress|completed|cancelled|suspended|
archived`), `recurrence_id` (unused — no recurrence feature built),
`price_crc`, `confirmed_count` (denormalized, trigger-maintained),
`cancellation_reason` (unused — no cancel flow built), `tour_group_id`
(FK trips, self-referential, links sibling multi-date tours), timestamps.
- Checks: `end_at > start_at`; `type='tour'` requires
  `agency_id`/`price_crc`/`capacity` all set; `min_participants <=
  capacity`.
- Indexes: `start_at`, `(status, start_at)`, `(visibility, status)`,
  `category`, `tour_group_id`.
- RLS select: published+public, OR own (`owner_id`), OR `is_member(id)`
  (private plan member / confirmed attendee), OR `is_host_team(id)`
  (organizer or agency staff — covers draft tours), OR admin.
- RLS insert: `owner_id = auth.uid() AND is_active() AND (type <> 'tour'
  OR is_agency_staff(agency_id))`.
- RLS update/delete: `owner_id = auth.uid() OR is_host_team(id) OR
  is_admin()`.
- Trigger `join_owner_to_private_plan()`: auto-confirms the owner into
  `attendees` when `visibility='private'`.
- Trigger `sync_trip_confirmed_count()`: keeps `confirmed_count` in sync
  with actual confirmed `attendees` rows.
- **Not implemented despite schema support**: draft→publish flow for
  social trips (`draft` status exists, nothing sets/uses it outside
  tours), `in_progress`/`completed` auto-transitions, min-participants
  auto-cancel, recurrence.

**`trip_waypoints`**
`trip_id`, `label` (1–160), `lat`/`lng` numeric(9,6), `sort`, `kind`
(`meeting_point`/`stop`, default `stop`), `created_at`.
- RLS: read — mirrors trip read access (published+public, own, or
  admin — note: does **not** include `is_member`/`is_host_team`, only
  the original 3-branch check from before private plans/agencies
  existed; in practice a private-plan/tour viewer who can read the trip
  itself may still get an empty waypoints read — worth re-verifying
  against the live policy before the redesign relies on it for those
  cases). Write — organizer or admin only (`is_organizer`, not
  `is_host_team` — so agency staff who aren't the tour's `owner_id`
  can't edit tour waypoints, a narrower policy than most other
  tour-adjacent tables).

**`trip_custom_fields`**
`trip_id`, `label` (1–60), `value` (1–200), `sort`, `created_at`.
- RLS: read — mirrors trip read (published+public, own, member, admin).
  Write — host team or admin (`for all`).

**`trip_links`**
`trip_id`, `url` (1–2000), `label` (≤160, optional), `og_title`,
`og_description`, `og_image_url`, `sort`, `created_by`, `created_at`.
- RLS: read — mirrors trip read. Write — host team or admin (`for all`).

**`itinerary_blocks`**
`trip_id`, `day_index` (≥0), `start_time` time, `label` (1–160),
`description`, `photo_url`, `icon` (added migration `0021`), `sort`,
`created_by`, `created_at`.
- RLS: read — mirrors trip read (published+public, own, member, admin).
  Insert — `created_by = auth.uid() AND is_active() AND (is_host_team OR
  (is_member AND trip.visibility = 'private'))` — i.e. host team on a
  public trip, any member on a private plan. Update/delete — host team
  or admin only (no edit exists in the UI, only add/delete).

**`attendees`** (RSVP + plan membership + check-in + payment state)
`trip_id`, `profile_id`, `status`
(`confirmed|waitlisted|cancelled|removed|no_show`), `attendance`
(`checked_in`/`attended`, nullable), `joined_at` (waitlist order key),
`payment_status` (`none|pending|paid`), `payment_evidence_path` (added
`0026`), timestamps. Unique `(trip_id, profile_id)`.
- RLS select: own row, OR `is_organizer(trip_id)`, OR admin; **plus** a
  second public-read policy — anyone can read `status='confirmed'` rows
  on a published public trip (the "who's going" list). (Payment columns
  ride along with this — see the known gap in §1.5.)
- RLS write: `is_host_team(trip_id) OR is_admin()` (`for all` — covers
  manual removal, check-in, direct status edits by staff).
  Regular users never write `attendees` directly; every user-facing
  mutation goes through a `SECURITY DEFINER` RPC:
  - `join_trip(trip_id) returns text` — locks per-trip
    (`pg_advisory_xact_lock`), confirms if capacity allows else
    waitlists, blocked if not `is_active()`, trip not published, past
    join deadline, already started, or already joined.
  - `leave_trip(trip_id) returns void` — cancels own row; if it was
    `confirmed`, promotes the earliest `waitlisted` row (`order by
    joined_at`). Not gated on `is_active()` (a banned user can still
    leave).
  - `get_my_waitlist_position(trip_id) returns int` — count of
    waitlisted rows ahead of the caller's own, +1.
  - `submit_payment_evidence(attendee_id, storage_path)` — buyer only,
    own row, must be `confirmed`; sets `payment_status='pending'`.
  - `confirm_payment(attendee_id)` / `reject_payment(attendee_id)` —
    host team/admin only; reject resets to `none` + clears the evidence
    path (file itself left in storage).
- Trigger `sync_trip_confirmed_count()` (on trips, see above).
- Trigger `notify_trip_joined()` / `notify_waitlist_promoted()` (writes
  `notifications` rows).
- Trigger `post_chat_system_event()` — posts a system chat message on
  join/promote/leave.
- Trigger `archive_empty_private_plan()` — auto-archives a private plan
  once confirmed-member count hits 0.

### 2.3 Chat

**`messages`**
`trip_id`, `sender_id` (nullable for system rows), `body` (nullable for
system rows, else 1–2000), `edited_at`, `deleted_at`, `kind`
(`user`/`system`), `event_type` (`joined|left|promoted`, system only),
`actor_id` (system only), `created_at`.
- Check `messages_system_shape`: a `user` row must have `sender_id` +
  `body` and no `event_type`; a `system` row must have `sender_id null`,
  `body null`, `event_type` + `actor_id` both set.
- RLS select: `is_trip_participant(trip_id)` (organizer, or confirmed/
  waitlisted attendee) or admin.
- RLS insert: `kind='user' AND sender_id=auth.uid() AND (is_organizer OR
  is_member) AND is_active()`.
- RLS update (soft-delete only): `sender_id=auth.uid() OR
  is_organizer(trip_id) OR is_admin()` — **column-grant restricted** to
  `deleted_at` only (broad row policy, narrow column grant, so a
  moderating organizer can't also rewrite `body`).
- Editing (`body`) goes through `edit_message(message_id, body)`
  (`SECURITY DEFINER`, sender-only, blocks editing system rows or
  already-deleted rows) — not a column grant, because the soft-delete
  policy's organizer branch would otherwise let an organizer rewrite
  someone else's text too.
- Trigger `post_chat_system_event()` (on `attendees`, described above).
- Realtime enabled (`postgres_changes`, INSERT + UPDATE) via
  `alter publication supabase_realtime add table messages`.
- **Not built**: `chat_settings` table (WhatsApp link, announcements-
  only, mute) — no schema exists for it at all, unlike most other
  deferred items.

### 2.4 Private-plan workspace

**`plan_invites`**
`trip_id`, `token` (uuid, unique, bearer secret), `created_by`,
`expires_at`, `max_uses` (nullable), `uses` (default 0), `revoked_at`,
`invited_profile_id` (nullable FK profiles — set = direct invite, null =
bearer link), `created_at`.
- RLS: read/create/revoke — host team or admin only. No public select
  policy at all (a token is looked up only via the RPCs below, which
  bypass RLS as `SECURITY DEFINER`).
- `accept_plan_invite(token) returns uuid` — validates not revoked/
  expired/exhausted, and if `invited_profile_id` is set, that it matches
  the caller; inserts/updates the caller into `attendees` as
  `confirmed`; idempotent.
- `preview_plan_invite(token) returns table(trip_id, title, description,
  is_valid, reason)` — read-only, for the invite landing page, no
  membership granted, no general table access needed.
- `create_direct_plan_invite(trip_id, email) returns uuid` — host-team
  only; looks the invitee up in `auth.users` by email (profiles has no
  email column); creates a `plan_invites` row with `max_uses=1`,
  `expires_at = now()+30d`, `invited_profile_id` set; writes a
  `plan_direct_invite` notification carrying the token + trip title in
  `data` (the invitee can't read the private trip row via RLS yet to
  look up the title themselves).

**`packing_items`**
`trip_id`, `name` (1–160), `done`, `done_by`, `assigned_to`,
`created_by`, `sort`, `created_at`.
- RLS: select — member or host team or admin. Insert — member or host
  team, own `created_by`, active. Update — member or host team or admin
  (toggle done / reassign — any member, not just the creator). Delete —
  host team or admin only.

**`expenses`**
`trip_id`, `paid_by`, `amount_crc` (>0), `description` (1–200),
`created_at`.
- RLS: select — member or host team or admin. Insert — member or host
  team, own `paid_by`, active. Delete — creator or host team or admin.
  (No update policy — expenses aren't editable, only deletable.)

**`polls`** + **`poll_votes`**
`polls`: `trip_id`, `question` (1–200), `options` jsonb array,
`closes_at`, `created_by`, `deleted_at`, `created_at`.
`poll_votes`: `poll_id`, `profile_id`, `option_key`, `created_at`, unique
`(poll_id, profile_id)`.
- `polls` RLS: select — member/host team/admin. Insert — member or host
  team, own `created_by`, active. Update (close/soft-delete) — creator
  or host team or admin.
- `poll_votes` RLS: select — via parent poll's membership. Write (`for
  all`, toggleable) — own `profile_id`, active, and the parent poll's
  trip membership checked inline.

**`trip_docs`** — legacy/unused schema-only table from migration `0016`
(no upload UI, no Storage bucket wired to it). Columns: `trip_id`,
`name`, `size`, `mime`, `storage_path`, `uploaded_by`, `created_at`.
RLS: member/host-team read, member/host-team upload, host-team delete.
**Superseded in practice by `trip_documents` (§2.5, migration `0029`)** —
the actually-shipped feature uses a different table and a real Storage
bucket. Don't confuse the two; `trip_docs` has no live UI path.

### 2.5 Documents & payment evidence (Storage)

**`trip_documents`** (migration `0029`, the real "shared docs" feature)
`trip_id`, `uploaded_by`, `storage_path`, `file_name` (1–200),
`file_size`, `content_type`, `created_at`.
- RLS: select — member or host team or admin. Insert — host team or
  admin only, own `uploaded_by` (unlike `packing_items`/`expenses`,
  regular members can't upload, only the host team). Delete — uploader
  or host team or admin.
- **Storage bucket `trip-documents`** (private). Path convention:
  `{tripId}/{filename}`. Storage RLS on `storage.objects`: insert — host
  team or admin (checked via `is_host_team((storage.foldername(name))
  [1]::uuid)`); select — member or host team or admin; delete — host
  team or admin (not the uploader alone, unlike payment-evidence below).
- Rendered via `components/plans/trip-documents.tsx`, mounted only on
  the private-plan branch of the trip detail page (works identically for
  a public trip, just not surfaced there yet).

**`payment-evidence` bucket** (migration `0026`, first Storage bucket in
the project) — private. Path convention: `{attendeeId}/{filename}`.
Storage RLS: insert — the uploader must own the named `attendees` row;
select/delete — the attendee's own profile, or host team, or admin.
No dedicated metadata table — the path itself is stored on
`attendees.payment_evidence_path`.

### 2.6 Agencies & tours

**`agencies`**
`owner_id`, `business_name` (3–120), `legal_name` (≤160), `legal_id`
(≤60, cédula jurídica), `description` (≤2000), `location_name` (≤160),
`status` (`pending|approved|suspended|rejected`), `sinpe_phone` (≤20,
added `0026`), timestamps. **Not built**: `documents_paths` (agency
verification document upload — no Storage bucket for this exists, by
explicit user decision), `plan`/`commission_rate`/`branding_json`
(PRO-tier columns from the PRD — never added, v2/out of MVP scope).
- RLS select: `status='approved' OR is_agency_staff(id) OR is_admin()`.
- RLS insert: `owner_id=auth.uid() AND is_active()` (via
  `apply_for_agency()` in practice, but the policy itself would allow a
  direct insert too).
- RLS update: `is_agency_admin(id) OR is_admin()`, **column-grant
  restricted** — only `business_name, legal_name, legal_id, description,
  location_name, sinpe_phone` are writable via the grant; `status` is
  excluded and can only change through `set_agency_status()`
  (`SECURITY DEFINER`, admin-only check inside the function, since a
  single `authenticated` role can't be granted "status for admins only,
  other columns for staff too" via plain `GRANT`).
- `apply_for_agency(business_name, legal_name, legal_id, description,
  location_name, sinpe_phone default null) returns uuid` — creates the
  agency row and the applicant's `'owner'` `agency_members` row
  atomically (avoids a chicken-and-egg window where neither insert
  policy could yet be satisfied by the other).
- `set_agency_status(agency_id, status)` — admin-only.
- `add_agency_staff_by_email(agency_id, email, role)` — agency-admin-
  role staff only; role must be `admin`/`staff`; looks the target up in
  `auth.users` by email; upserts an `active` `agency_members` row.

**`agency_members`**
`agency_id`, `profile_id`, `role` (`owner|admin|staff`), `status`
(`active|removed`), unique `(agency_id, profile_id)`, `created_at`.
- RLS select: `is_agency_staff(agency_id) OR is_admin()`.
- RLS insert/update: `is_agency_admin(agency_id) OR is_admin()`.
  (Removal is a plain `update(status='removed')` through this policy,
  same pattern as plan-member removal.)

**`tour_templates`**
`agency_id`, `created_by`, `name` (3–120), `title` (3–120), `description`
(1–4000), `category`, `location_name` (2–160), `lat`/`lng` double
precision, `waypoints`/`custom_fields`/`links` jsonb arrays (default
`[]`), `capacity` (1–500), `min_participants` (1–500, nullable),
`price_crc` (1000–10,000,000), timestamps.
- RLS: staff-or-admin for every action (select/insert/update/delete),
  no public branch at all — templates are internal agency working docs.

**`tour_questions`**
`trip_id`, `asked_by`, `question` (1–500), `answer` (1–1000, nullable),
`answered_by`, `answered_at`, `created_at`.
- RLS select: mirrors trip read (published+public, own, host team,
  admin) — Q&A visibility follows the tour's own visibility, not gated
  on having booked.
- RLS insert: any active user, only on a `type='tour'` trip.
- RLS update: host team or admin, **column-grant restricted** to
  `answer, answered_by, answered_at` — the question text is never
  editable by anyone once posted.
- RLS delete: host team or admin only (never the asker — keeps the
  public Q&A record trustworthy both directions).

**`reviews`**
`trip_id`, `reviewer_id`, `rating` (1–5), `body` (≤1000, nullable),
`response_text` (1–1000, nullable), `responded_at`, `created_at`, unique
`(trip_id, reviewer_id)`.
- RLS select: mirrors trip read.
- RLS insert: reviewer owns `reviewer_id`, active, AND exists a
  `type='tour'` trip with `start_at < now()` where the caller's
  `attendees.attendance = 'attended'`.
- RLS update: host team or admin, **column-grant restricted** to
  `response_text, responded_at` (one response per review, agency-side
  only — reviewer's own rating/body is never editable after posting).
- RLS delete: own `reviewer_id` or admin (unlike Q&A, the reviewer *can*
  retract their own review).

**`tour_exclusive_content`** (PK `trip_id`, one row per tour)
`content` (1–4000, markdown), `updated_at`.
- RLS select: host team, admin, OR a confirmed attendee with
  `payment_status='paid'` on that trip.
- RLS insert/update/delete: host team or admin only.
- Deliberately a separate table rather than a `trips` column — RLS has
  no column-level granularity, and the existing "read published public"
  policy on `trips` would otherwise leak this to every visitor regardless
  of payment status.

### 2.7 Notifications

**`notifications`**
`profile_id`, `type` (`trip_joined|waitlist_promoted|new_message|
new_follower|plan_direct_invite`), `trip_id` (nullable), `actor_id`
(nullable), `data` jsonb (default `{}`), `read_at`, `created_at`.
- RLS select: own `profile_id` only.
- RLS update: own `profile_id`, **column-grant restricted** to
  `read_at` only.
- No insert policy for `authenticated` at all — every row is written
  server-side by a `SECURITY DEFINER` trigger/function:
  `notify_trip_joined()`, `notify_waitlist_promoted()`,
  `notify_new_message()`, `notify_new_follower()`, and
  `create_direct_plan_invite()`.
- Realtime enabled, scoped per-user (`notifications:{userId}` channel).

### 2.8 Cross-cutting RLS helper functions

All `security definer, set search_path = public` (a historical fix —
migration `0020` found and closed a stack-depth RLS-recursion bug caused
by these *not* being definer originally; every helper added afterward
was written as definer from the start).

| function | params | purpose |
|---|---|---|
| `is_admin()` | — | caller is `role='admin' and status='active'` |
| `is_active()` | — | caller's `profiles.status = 'active'` |
| `is_organizer(trip_id)` | trip | caller is `trips.owner_id` |
| `is_member(trip_id)` | trip | caller has a `confirmed` `attendees` row |
| `is_host_team(trip_id)` | trip | `is_organizer` OR (trip has an
  `agency_id` AND caller is active staff of it via `is_agency_staff`) |
| `is_trip_participant(trip_id)` | trip | `is_organizer` OR caller is
  `confirmed`/`waitlisted` — chat read gate |
| `is_agency_staff(agency_id)` | agency | active `agency_members` row |
| `is_agency_admin(agency_id)` | agency | active `agency_members` row
  with `role in ('owner','admin')` |

Also: `set_updated_at()` (generic `before update` trigger, used on
`profiles`, `trips`, `agencies`, `tour_templates`,
`tour_exclusive_content`).

### 2.9 Not built at all (schema never created)

For completeness — these appear in `docs/data-model.md`'s original
target design but have **no table, column, or RPC** in any migration:
`trip_series` (recurrence), `chat_settings`, `push_subscriptions`,
`config` (currency rates / feature flags), `attendee_log` (audit log).

---

## 3. Route map

### 3.1 Pages under `app/[locale]/...`

| Path | Renders | Data needed |
|---|---|---|
| `/` (`(marketing)`-equivalent, actually just `app/[locale]/page.tsx`) | Homepage: hero, how-it-works, agencies CTA, waitlist, footer | none (static/marketing) |
| `/login` | Login form (Google + email/password) | none |
| `/signup` | Signup form | none |
| `/signup/check-email` | "check your email" confirmation | none |
| `/onboarding` | Onboarding form (name/locale/categories) | current profile |
| `/feed` | Discovery feed, List/Map, filters, tabs | published public trips + tours, agency approval status, geolocation (Near me) |
| `/trips/new` | Create social trip (protected: login + onboarding) | none |
| `/trips/[id]` | Trip detail — branches on visibility/type | trip row, waypoints, custom fields, links, itinerary, attendees, (tour) reviews/Q&A/payment/exclusive content, (plan) workspace modules |
| `/trips/[id]/edit` | Edit social trip (organizer only) | trip + its extras |
| `/trips/[id]/chat` | Realtime chat room | messages, participant check |
| `/my-trips` | Organizing / Joined trip lists | owned trips + confirmed-attendee trips |
| `/users/[id]` | Public profile | `profiles_public()`, follow counts, published trips, badges |
| `/invite/[token]` | Plan invite landing/accept | `preview_plan_invite()` |
| `/agencies/new` | Agency application form | none |
| `/agencies/[id]` | Public agency profile | agency row (RLS-gated by status), published tours, aggregate rating |
| `/agencies/[id]/edit` | Edit agency profile (staff/admin) | agency row |
| `/agencies/[id]/panel` | Agency panel: status, tour list, staff | agency, its tours, staff list |
| `/agencies/[id]/tours/new` | Create tour (optionally `?template=<id>`) | template values if provided |
| `/agencies/[id]/tours/[tripId]/edit` | Edit tour | tour + extras |
| `/agencies/[id]/templates/new` | Create a tour template from scratch | none |
| `/agencies/[id]/templates/[templateId]/edit` | Edit a template | template row |
| `/admin` | Admin dashboard | open report count, pending agency count, total users |
| `/admin/reports` | Report queue | report tickets + resolved-target info |
| `/admin/agencies` | Agency approval queue | agencies by status |
| `/admin/users` | User search + ban/suspend/role grant | profiles |

All of the above except `/`, `/login`, `/signup*` live under the
`(main)` route group (shared header/nav/notification bell layout).
`/login`, `/signup`, `/signup/check-email`, `/onboarding` live under
`(auth)`.

### 3.2 API routes under `app/api/**`

| Route | Methods | Purpose | Auth |
|---|---|---|---|
| `/api/auth/callback` | GET | OAuth + PKCE callback | none (public entrypoint) |
| `/api/auth/signout` | POST | sign out | session |
| `/api/onboarding` | PATCH | complete onboarding | session |
| `/api/follows/[profileId]` | (see route file — follow/unfollow) | follow / unfollow a profile | session, active |
| `/api/geocode` | GET | authenticated proxy to Nominatim | session |
| `/api/directions` | GET | authenticated proxy to OSRM | session |
| `/api/trips` | POST | create a social trip (or private plan) | session, active, onboarded |
| `/api/trips/[id]` | GET/PATCH/DELETE | trip detail / edit / delete — branches validator on `type` (social vs tour) | PATCH/DELETE: owner or host team |
| `/api/trips/[id]/join` | POST | `join_trip()` wrapper | session, active |
| `/api/trips/[id]/leave` | POST | `leave_trip()` wrapper | session |
| `/api/trips/[id]/leave-plan` | POST | `leave_plan()` wrapper | session |
| `/api/trips/[id]/transfer-owner` | POST | `transfer_plan_ownership()` wrapper | plan owner |
| `/api/trips/[id]/invites` | GET/POST | list / create plan invite links | host team |
| `/api/trips/[id]/invites/direct` | POST | `create_direct_plan_invite()` wrapper | host team |
| `/api/invites/[inviteId]` | DELETE | revoke an invite | host team |
| `/api/invites/accept` | POST | `accept_plan_invite()` wrapper | session |
| `/api/reports` | POST | file a report | session |
| `/api/agencies` | POST | `apply_for_agency()` wrapper | session, active |
| `/api/agencies/[id]` | PATCH | edit agency profile | staff/admin |
| `/api/agencies/[id]/members` | POST/DELETE | add/remove agency staff | agency admin |
| `/api/agencies/[id]/tours` | POST | create a tour (draft) | agency staff |
| `/api/agencies/[id]/tours/[tripId]/publish` | POST | draft → published | agency staff, agency approved |
| `/api/agencies/[id]/tours/[tripId]/save-as-template` | POST | copy a tour's fields into a new template | agency staff |
| `/api/agencies/[id]/templates` | GET/POST | list / create templates | agency staff |
| `/api/agencies/[id]/templates/[templateId]` | GET/PATCH/DELETE | template detail / edit / delete | agency staff |
| `/api/admin/agencies/[id]` | PATCH | `set_agency_status()` wrapper | admin |

Reads not listed here (attendees, messages, itinerary, packing/expenses/
polls, reviews, Q&A, notifications, follows lists, etc.) are done
directly from Server/Client Components via the Supabase client — RLS is
the enforcement layer, no route handler needed. **Note**: several routes
sketched in the *original* `docs/api.md` (e.g. dedicated `/checkin`,
`/waitlist`, `/messages/[mid]`, `/push/*`, `/admin/metrics`) were never
built as separate endpoints — those actions go through direct
Supabase-client table writes (RLS-gated) or the `SECURITY DEFINER` RPCs
listed in §2, not a Route Handler. Don't assume an endpoint exists just
because an older doc lists it; check this table or the actual
`app/api` tree.

---

## 4. Component inventory

One-line purpose per component, grouped by directory. This tells the
redesign what visual/interactive pieces need to exist — not how they
should look.

### `components/ui` (base primitives, currently Radix-based)
`avatar.tsx` (client-only, image+initials fallback), `badge.tsx`,
`button.tsx` (CVA variants), `calendar.tsx` (react-day-picker wrapper),
`card.tsx`, `date-time-field.tsx` (custom date+time picker, no native
`<input type=date>`), `dialog.tsx` (confirm modals), `input.tsx`,
`markdown-content.tsx` (renders stored markdown via react-markdown +
remark-gfm), `markdown-editor.tsx` (Write/Preview tabs + toolbar),
`popover.tsx`, `select.tsx` (custom, no native `<select>`),
`skeleton.tsx` (loading placeholders), `textarea.tsx`, `time-picker.tsx`
(hour/5-min-step custom selects).

### `components/landing`
`agencies-cta.tsx`, `canopy-blobs.tsx` (GSAP parallax hero background),
`footer.tsx`, `hero.tsx`, `how-it-works.tsx` (bento grid), `navbar.tsx`
(marketing-page header, separate from the app header), `waitlist.tsx`
(UI-only email capture, not wired to a backend).

### `components/auth`
`google-button.tsx`, `login-form.tsx`, `signup-form.tsx`,
`onboarding-form.tsx`.

### `components/trips`
`attendee-list.tsx` (confirmed roster on a public trip),
`custom-fields-display.tsx` / `custom-fields-editor.tsx` (freeform
label/value stats), `delete-trip-button.tsx` (confirm-dialog delete),
`feed-filters.tsx` (plain-GET price/date filter form), `feed-view.tsx`
(List/Map toggle container), `join-trip-button.tsx` (all RSVP states),
`link-preview-card.tsx` / `links-editor.tsx` (linked-place OG preview
cards + authoring), `near-me-button.tsx` (geolocation-gated feed link),
`trip-card.tsx` (feed/list card, handles social + tour + private-plan
badge variants), `trip-form.tsx` (create/edit social trip),
`trip-map-editor.tsx` (multi-stop authoring map), `trip-map.tsx`
(clustered feed map), `trip-route-map.tsx` (read-only numbered route),
`waitlist-panel.tsx` (host-team waitlist roster).

### `components/plans` (private-plan workspace)
`accept-invite-button.tsx`, `expenses-list.tsx`, `invite-manager.tsx`
(link generation/revoke + email invite field), `itinerary-icons.tsx`
(icon-key → glyph switch, avoids the React Compiler
"static-components" lint issue), `itinerary-list.tsx` (day-grouped
blocks, day-jump nav, collapsed add-form), `packing-list.tsx`,
`plan-members.tsx` (owner/member management, leave/transfer), \
`polls-list.tsx`, `trip-documents.tsx` (signed-URL upload/download list).

### `components/agencies`
`agency-apply-form.tsx` (apply/edit modes), `agency-staff-manager.tsx`,
`agency-status-banner.tsx`, `agency-template-list.tsx`,
`agency-tour-list.tsx` (panel's tour list + publish button),
`tour-checkin.tsx` (roster: check-in + payment confirm/reject),
`tour-exclusive-content.tsx` (paid-attendee-only content, server
component), `tour-form.tsx` (create/edit tour, multi-date support),
`tour-payment.tsx` (buyer-side SINPE flow), `tour-qa.tsx` (public Q&A
thread), `tour-reviews.tsx` (reviews list + `Stars` shared component),
`tour-template-form.tsx`.

### `components/admin`
`admin-nav.tsx` (pill-tab nav across all 4 admin pages),
`agency-queue.tsx` (approval queue), `badge-manager.tsx` (grant/revoke
grid, inline on a profile page), `report-queue.tsx`,
`user-manager.tsx` (search + ban/suspend/role grant).

### `components/chat`
`chat-room.tsx` (Realtime room, optimistic send, edit/delete, system
event rendering).

### `components/notifications`
`notification-bell.tsx` (popover inbox, Realtime updates, mark-read).

### `components/reports`
`report-button.tsx` (reusable flag+dialog, used on trips/messages/
users).

### `components/profile`
`badge-list.tsx` (granted-badge chips), `follow-button.tsx`.

### `components/layout`
`mobile-nav.tsx` (hamburger popover, `lg`-breakpoint collapse).

### `components/pwa`
`ios-install-hint.tsx`, `service-worker-register.tsx`.

---

## 5. Explicit non-negotiables for the redesign

- **Every RLS-gated capability listed in §1/§2 must remain reachable
  from the new UI.** RLS is the actual authorization boundary — a
  missing button doesn't remove the capability from the database, it
  just makes the app worse at exposing what a user is already allowed to
  do. In particular, don't drop UI for: waitlist position, message
  editing, agency staff management, tour Q&A moderation delete,
  exclusive-content gating by payment status, plan ownership transfer.
- **Bilingual `es`/`en` via `next-intl` must be preserved for all
  user-facing text**, with `es` as the default locale and every route
  living under `/[locale]/...`. Badge labels (`label_es`/`label_en`) and
  a few other pieces of admin-editable data are localized as *data
  columns*, not i18n message keys — don't collapse that distinction.
- **The manual SINPE payment evidence flow's both steps must exist**:
  buyer upload (`submit_payment_evidence`) *and* host-team review
  (`confirm_payment`/`reject_payment` + a way to view the uploaded
  evidence via a signed URL). Neither half is optional — this is the
  only payment flow in the app; there is no automatic capture.
- **Every place a "no editing after posting" rule exists must stay
  enforced in the UI, not just the DB**: chat messages (delete or
  sender-only edit, never organizer-edit), tour Q&A questions (never
  editable, delete is host-team/admin only, never the asker), reviews
  (rating/body never editable after posting, only the agency's one
  response is). The redesign shouldn't add an edit affordance the RLS
  layer would silently reject.
- **Column-grant-restricted writes must stay narrow in the new UI's
  request shapes.** Several tables intentionally split "read the row"
  from "write only these specific columns" (agencies.status via
  `set_agency_status()`, messages.deleted_at, notifications.read_at,
  tour_questions.answer*, reviews.response_text/responded_at,
  attendees.payment_status/payment_evidence_path). Don't build a form
  that PATCHes a whole row where the backend only ever allowed a column
  subset — it'll just fail against the same RLS/grants.
- **Private plans stay invisible to non-members everywhere** — not just
  gated on the detail page. A non-member gets `notFound()`-equivalent,
  never a 403 that reveals the plan exists. Preserve this in feed/search/
  profile-adjacent surfaces too (a private plan must never appear on
  `/my-trips`-style listings, `/users/[id]`, or search for anyone but a
  member).
- **Multi-date tours are independent bookings, not a shared pool.** Any
  new "choose a date" UI must link to genuinely separate trip detail
  pages (own capacity, chat, reviews, check-in, payment) via
  `tour_group_id`, not merge them into one booking flow.
- **Realtime features (chat, notifications) must follow the
  one-client-per-component + await-session-before-subscribe pattern**
  conceptually, whatever framework/library the redesign uses for
  realtime — the historical bug (silently zero events until reload) is
  an RLS-auth-timing issue, not a component-structure issue, so it will
  recur in any implementation that opens a Realtime channel before the
  session is resolved.
- **Draft tours and pending/suspended/rejected agencies stay invisible
  to the public** — only host team/staff and admins can see them,
  mirroring how a private plan is invisible. Don't let a redesigned
  agency directory or tour listing leak unapproved content via a looser
  client-side filter.
- **Currency is CRC-integer everywhere money is stored or entered**
  (`price_crc`, `amount_crc`) — there is no USD storage anywhere in the
  current schema despite the original PRD's USD-estimate display idea;
  don't introduce currency conversion state that the backend has nowhere
  to persist.
- **The redesign should not assume payment capture, recurrence,
  QR/camera check-in, shared docs beyond `trip_documents`, or automated
  notification delivery (push/email/reminders) exist** — none of these
  are built. If the redesign's brief implies any of them, that's new
  scope beyond "preserve existing functionality," not a gap in this
  inventory.
