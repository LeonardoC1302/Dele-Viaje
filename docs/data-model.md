# Dele Viaje — Data Model

Postgres 15+ via Supabase. Money as integers (CRC colones). All timestamps `timestamptz`, UTC. All tables RLS-protected unless noted. **RLS policies are the authorization layer** (see `architecture.md §4`).

Legend: 🔒 RLS enforced · 🔵 referenced in RLS helper keys.

> **Status note (2026-09-20):** this document is the *original target*
> design, kept for historical intent. The actual, current schema (all 32
> migrations applied cumulatively) has diverged and grown substantially —
> new tables (`agencies`, `agency_members`, `tour_templates`,
> `tour_questions`, `reviews`, `tour_exclusive_content`,
> `trip_waypoints`, `trip_custom_fields`, `trip_links`,
> `trip_documents`, `report_tickets`, `badges`/`user_badges`,
> `follows`), two Storage buckets (`payment-evidence`,
> `trip-documents`), several columns not listed below (`trips.
> tour_group_id`, `agencies.sinpe_phone`, `attendees.
> payment_evidence_path`, `itinerary_blocks.icon`, `messages.kind/
> event_type/actor_id/edited_at`), and RLS helper functions beyond §8
> (`is_host_team`, `is_agency_staff`, `is_agency_admin`,
> `is_trip_participant`, `get_my_waitlist_position`). **The full current
> schema — every table's cumulative end-state columns/constraints, every
> RLS policy in plain English, every SECURITY DEFINER function, and both
> Storage buckets — is documented in `docs/frontend-migration-reference.md`
> §2.** Treat *that* section as the source of truth for "what's actually
> in the database"; treat this file as intent/rationale for the parts
> that haven't changed, and as a record of what was *never* built (see
> the inline notes below): `trip_series`/recurrence, `chat_settings`,
> `push_subscriptions`, `config`, `attendee_log`, PostGIS radius search
> (the real implementation is a bounding-box + haversine approximation,
> `lib/geo.ts`, no PostGIS extension).

---

## 1. Identity & Profiles

### `profiles` 🔒
| column | type | notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` (created by trigger) |
| display_name | text | required after onboarding |
| avatar_url | text NULL | storage path |
| bio | text NULL | ≤ 500 |
| locale | text | `es` / `en` |
| phone | text NULL | future OTP/WhatsApp |
| onboarding_done | bool | default false |
| category_prefs | text[] | interests/activities |
| role | text | `user` \| `admin` |
| status | text | `active` \| `banned` \| `suspended`, default `active` |
| last_seen_at | timestamptz | |
| created_at / updated_at | timestamptz | |

RLS: read own + public-safe (name/avatar/bio/reviews/trips-created); anything sensitive own-only or admin.
Triggers: `on_auth_user_created` → insert profile.

### `follows` 🔒
`follower_id uuid` (FK profiles) · `followed_id uuid` (FK profiles, may reference agency owner profile)
Unique `(follower_id, followed_id)`. No self-follow (check). RLS: read public; write own rows.

### `badges` + `user_badges` 🔒
`badges(code text PK, label_es, label_en, icon)` — seed set (see PRD §4.7).
`user_badges(profile_id FK, code FK, granted_at)` — PK `(profile_id, code)`; admin/manual grant MVP.

---

## 2. Agencies

### `agencies` 🔒
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK profiles | must be the creating user |
| business_name | text | public label |
| legal_name | text NULL | |
| legal_id | text | cédula jurídica |
| description | text NULL | |
| cover_url | text NULL | |
| location_name | text NULL | headquarter region |
| status | text | `pending` \| `approved` \| `suspended`, default `pending` |
| documents_paths | text[] | storage paths (permits, cédula) — admin-only read |
| plan | text | `free` \| `pro`, default `free` (pro in v2) |
| commission_rate | numeric | default 0.12 (v2) |
| branding_json | jsonb | logo, colors, fonts (v2) |
| created_at / updated_at | timestamptz | |

RLS: public approves → read business profile + tours + reviews; owner/`agency_member` full; `documents_paths` admin-only.

**As actually built**: `documents_paths`/`plan`/`commission_rate`/
`branding_json` were never added — no agency document upload exists
(explicit scope cut), and the PRO-tier columns are still purely v2/
future. A real column that *is* live but isn't listed above:
`sinpe_phone text` (migration `0026`, the agency's SINPE Móvil number for
the manual payment flow). `status` can only change via the
`set_agency_status()` admin-only function, never a direct client update
(see `docs/frontend-migration-reference.md` §2.6).

### `agency_members` 🔒
`agency_id FK · profile_id FK · role text ('owner'|'admin'|'staff') · status ('active'|'invited'|'removed') · invited_email text NULL`
Unique `(agency_id, profile_id)`. RLS: owner manages; staff read.

---

## 3. Trips

### `trips` 🔒 (core)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| type | text | `social` \| `tour` |
| visibility | text | `public` \| `private` — immutable after publish |
| owner_id | uuid FK profiles | organizer (social host / private host) |
| agency_id | uuid FK agencies NULL | set for `tour` |
| title | text | |
| description | text | |
| cover_url | text NULL | storage |
| category | text | activity taxonomy (hike, beach, waterfall, tour…) |
| location_name | text | display label |
| lat / lng | numeric(9,6) | meeting point |
| start_at / end_at | timestamptz | |
| capacity | int NULL | NULL = unlimited |
| min_participants | int NULL | tours |
| join_deadline | timestamptz NULL | NULL = until start |
| status | text | draft/published/full/in_progress/completed/cancelled/suspended |
| recurrence_id | uuid NULL | FK `trip_series` (simple weekly) |
| price_crc | int NULL | tours only, integer colones |
| confirmed_count | int | denormalized, maintained by triggers |
| cancellation_reason | text NULL | shown to members on cancel |
| created_at / updated_at | timestamptz | |

Indexes: `(start_at)`, `(status, start_at)`, `(visibility, status)`, `(category)`, GIST `(ll_to_earth(lat,lng))` or `ST_MakePoint` for radius (decide PostGIS vs earthdistance — PostGIS preferred via `postgis` ext, it's free).

**As actually built**: no PostGIS/GIST index exists — "Near me" is a
plain bounding-box SQL pre-filter plus an exact haversine cut in
application code (`lib/geo.ts`), no radius index. A real column not
listed above: `tour_group_id uuid` (migration `0032`, self-referential FK
to `trips.id`, links independent sibling rows for a multi-date tour —
each date keeps its own capacity/attendees/chat/payment state, this is
purely a "same tour, different date" link, not a shared pool).
`recurrence_id`/weekly recurrence was never implemented — column exists,
nothing sets or reads it. `status='draft'` is only ever used by tours
(agency-created; flips via a dedicated publish endpoint); social trips
always publish immediately, there's no draft UI for them. `'archived'`
was added to the status check constraint (migration `0019`) as the
terminal state for an emptied-out private plan.

Check constraints: `type='tour' → agency_id NOT NULL AND price_crc IS NOT NULL AND capacity IS NOT NULL`; `min_participants ≤ capacity`; `end_at > start_at`.
Trigger: maintain `confirmed_count` (on attendee changes); `full/auto-status` rollover (in_progress/completed/cancelled); min-participants auto-cancel.
RLS: `status='published' AND visibility='public'` → read all; private → `is_member(trip_id)` (or host team); owner/co-host/agency staff write; admin full.

### `trip_series` 🔒
`id uuid PK · trip_id uuid FK (prototype) · weekday int · time_utc text` — simple weekly. Future instances materialized in `trips` (not stored as virtual).

### `itinerary_blocks` 🔒
`id uuid PK · trip_id FK · day_index int (0-based, multi-day ready) · start_time timetz NULL · label · description NULL · photo_url NULL · sort int`
RLS: read with trip; write — public social/owner+cohost; private plans → all members add, owner/cohost edit/delete (per PRD §4.5).

### `attendees` 🔒 (RSVP + membership + check-in + payment state)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK | |
| profile_id | uuid FK | |
| status | text | `confirmed` \| `waitlisted` \| `cancelled` \| `removed` \| `no_show` |
| attendance | text NULL | `checked_in` \| `attended` (host mark) |
| joined_at | timestamptz | waitlist order key |
| payment_status | text | `none` \| `pending` \| `paid` (v1.5+) |
| payment_json | jsonb NULL | v2 Stripe refs |
| created_at / updated_at | timestamptz | |

Unique `(trip_id, profile_id)`. Partial unique index on `(trip_id)` WHERE `status='confirmed'` allows at most capacity via trigger + admission transaction (prevents oversell).
RLS: organizers read all; users read own; waitlisted can read limited trip info.
**Business rules (route-level + triggers):** transcript of join/leave/promote; waitlist auto-promotion in `joined_at` order inside one transaction.

---

## 4. Chat

### `messages` 🔒
`id uuid PK · trip_id FK · sender_id FK · body text · edited_at NULL · deleted_at NULL · created_at`
Realtime enabled (RLS-filtered). RLS: `is_member(trip_id)` OR host team read/write self; co-hosts delete any; hosts delete any.

### `chat_settings` 🔒 (per room)
`trip_id PK FK · whatsapp_link text NULL · announcements_only bool default false · mute_deadline timestamptz NULL`

---

## 5. Private Plans — Workspace

### `plan_invites` 🔒
`id uuid PK · trip_id FK · token text UNIQUE (uuid) · created_by FK · expires_at timestamptz · max_uses int NULL · uses int default 0 · revoked_at timestamptz NULL · created_at`
RLS: write host team; read host team + (validate link by public insert — token entry creates membership, then RLS applies).

### `packing_items` 🔒
`id uuid PK · trip_id FK · name text · done bool default false · done_by uuid NULL FK · assigned_to uuid NULL FK (prerequisite) · created_by FK · sort int`
RLS: members read; members create/update (done toggle any); host team delete.

### `expenses` 🔒
`id uuid PK · trip_id FK · paid_by FK · amount_crc int · description text · created_at`
Split computed (equal across active members), never stored. RLS: members full CRUD (delete by creator or host team).

### `polls` + `poll_votes` 🔒
`polls(id PK, trip_id FK, question, options jsonb, closes_at NULL, created_by, deleted_at NULL)`
`poll_votes(id PK, poll_id FK, profile_id FK, option_key text)` · unique `(poll_id, profile_id)`.
RLS: members; vote toggleable; owner deletes poll.

### `trip_docs` 🔒
`id uuid PK · trip_id FK · name text · size int · mime text · storage_path text · uploaded_by FK · created_at`
RLS: members read (signed URL flow), members upload; host team delete. Private docs → non-public bucket + short-TTL signed URLs.

---

## 6. Reviews & Reputation

### `reviews` 🔒
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK | |
| reviewer_id | uuid FK profiles | |
| reviewee_agency_id | uuid NULL FK agencies | tours review the agency; social reviews the host |
| rating | int | 1–5 |
| comment | text | |
| response_agency_id NULL + response_text NULL + responded_at | | agency reply |
| status | text | `active` \| `hidden` |
| created_at | timestamptz | |

Unique `(trip_id)` partial WHERE status='active' AND reviewer not deleted. **Gate:** insert allowed only if `can_review(trip_id)` = attendee `checked_in`/`attended` AND trip `completed` (enforced via RLS + route).
RLS: public read active; reviewers write own; admin hide.

**As actually built, deviates from the design above**: no
`reviewee_agency_id` column — reviews are `trip_id`-scoped only (an
agency's rating is computed live by averaging across its tours' reviews,
not stored). No `status`/hidden-moderation column — deletion (own
reviewer or admin) is the only moderation path, there's no soft-hide
state. Column is `body`, not `comment`. The gate is different because
`trips.status` never reaches `'completed'` in this app: it's `start_at <
now()` AND the reviewer's own `attendees.attendance = 'attended'`
(set by check-in) instead of `can_review()`/`checked_in` — same
practical effect, actually reachable. Scoped to tours only; there is no
social-trip or organizer/participant review feature. See
`docs/frontend-migration-reference.md` §2.6 for the exact current shape.

### Reputation views (computed, not stored)
- `v_profile_score(profile_id)` → avg rating, count.
- `v_agency_score(agency_id)` → avg rating, count.

---

## 7. Moderation, Notifications, Push

### `report_tickets` 🔒
`id PK · reporter_id FK · target_type text (trip|user|message|review|agency|plan) · target_id uuid · reason text · description text NULL · status (open|investigating|resolved|dismissed) · admin_note NULL · created_at / resolved_at`
RLS: reporter create + read own; admin full.

### `notifications` 🔒
`id PK · profile_id FK · type text · payload jsonb · read_at NULL · created_at index(profile_id, read_at)`
Written transactionally with the source write (trigger or route). Push/email dispatch consumes unread rows.

**As actually built**: column is `data jsonb` (not `payload`), plus a
`trip_id`/`actor_id` pair of nullable FKs alongside it. `type` is
currently constrained to exactly five values:
`trip_joined | waitlist_promoted | new_message | new_follower |
plan_direct_invite` — the PRD's fuller event list (poll_added,
new_expense, doc_uploaded, reservation events, admin events, reminders,
etc.) was never added. **No dispatch consumer exists** — rows are
written and read in-app only; nothing reads unread rows to push a
Web Push/email notification, because neither channel is built (see
`push_subscriptions` below).

### `push_subscriptions` 🔒 — **not built**
`id PK · profile_id FK · endpoint text UNIQUE · keys_json jsonb · created_at`
RLS: own rows.

No migration creates this table. Web Push was never implemented — this
stays as a design placeholder for when it is.

### `config` (no RLS; app reads) — **not built**
`config(key text PK, value jsonb, updated_at)` — seeds: currency rates `{usd_to_crc}`. Admin write.

No migration creates this table. There is no currency-rate config, no
USD display anywhere, and no feature-flag mechanism — everything is CRC-
only and every "feature" toggles by which code paths exist, not a
runtime flag.

### `trip_docs` vs `trip_documents` — naming trap

`trip_docs` (this section, migration `0016`) is **schema-only and has no
live UI path** — it was created with the original private-plans
migration but never wired to an upload flow or a Storage bucket. The
actually-shipped "shared documents" feature (migration `0029`) created a
**separate, differently-shaped table**, `trip_documents`, plus a real
private Storage bucket (`trip-documents`). See
`docs/frontend-migration-reference.md` §2.4/§2.5 for both tables' exact
columns — don't confuse the two when tracing "where does a plan
document actually get stored."

---

## 8. RLS Helper Functions (reusable SQL)

```sql
create or replace function is_admin() returns boolean
  language sql stable as $$ select exists(select 1 from profiles
  where id = auth.uid() and role = 'admin' and status = 'active') $$;

create or replace function is_member(trip_id uuid) returns boolean
  language sql stable as $$ select exists(select 1 from attendees
  where trip_id = is_member.trip_id and profile_id = auth.uid()
    and status = 'confirmed') $$;

create or replace function is_organizer(trip_id uuid) returns boolean ... -- owner OR co_host on trips
create or replace function is_host_team(trip_id uuid)  returns boolean ... -- organizer OR (tour) agency staff
create or replace function is_agency_staff(agency_id uuid) returns boolean ...
create or replace function can_review(trip_id uuid) returns boolean ...
```

**As actually built**: every helper function above is `security
definer` (a fix, migration `0020` — plain `stable sql` helpers caused an
RLS-recursion stack-depth crash the moment a non-owner read a private
plan; see `docs/frontend-migration-reference.md` §2.8). Additional
helpers exist beyond this list: `is_host_team(trip_id)` (organizer OR
active agency staff of the trip's agency — the actual "host team"
concept used almost everywhere `can_review`/co-host-style checks were
sketched above), `is_agency_staff(agency_id)` /
`is_agency_admin(agency_id)`, `is_trip_participant(trip_id)` (chat read
gate: organizer or confirmed/waitlisted attendee),
`get_my_waitlist_position(trip_id)`. `can_review(trip_id)` as sketched
here was never built as its own function — the equivalent logic is
inlined directly into the `reviews` insert RLS policy instead. There is
no co-host concept anywhere in the app (`is_organizer` is strictly
`owner_id = auth.uid()`), so "owner OR co-host" language throughout this
doc should be read as "owner" only, plus "or agency staff" wherever
`is_host_team` is actually what's used.

Policies example (private trip read):

```sql
create policy "private trip read: members only"
  on trips for select using
  (visibility <> 'private' or is_organizer(id) or is_member(id));
```

---

## 9. Constraints, Triggers & Integrity Checklist (build-time)

- [ ] Seat admission in one transaction with `pg_advisory_xact_lock(trip_id)`; partial unique index to cap confirmed.
- [ ] Waitlist promotion strictly by `joined_at` order; two cancels → sequential promotions.
- [ ] `confirmed_count` trigger keeps `trips.full` state consistent.
- [ ] Auto-status: `in_progress` at start_at, `completed` at end_at (scheduled or lazy on read — decide Phase 1).
- [ ] Min-participants auto-cancel 24h before start (scheduled job) → notify all, archive.
- [ ] Visibility immutable post-publish (`draft` only).
- [ ] Recurrence: prototype FK + materialized instances; past instances locked.
- [ ] Money integer CRC everywhere; rounding rule "last payer takes the difference".
- [ ] EXIF/GPS stripped before storage writes.
- [ ] Invites: unique token; `expires_at`/`max_uses` honored even if token valid.
- [ ] No self-follow, no self-invite, rate-limit invite/chat/review routes.
- [ ] Audit/log: `attendee_log(id, trip_id, profile_id, action, at)` for join/leave/remove/promote/cancel (transparency + support).