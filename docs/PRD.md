# Dele Viaje — Product Requirements Document (PRD)

Working title: **"Dele Viaje"** (Costa Rican slang for "let's go / make it happen"). Rebrand-safe for international expansion (docs use the neutral project name `Dele Viaje` / codebase id `dele-viaje`).

- Status: Draft v0.1
- Audience: product + engineering
- Market: Costa Rica first (validation), LATAM/tourism-destinations later

---

## 1. Product Summary

A single app / infrastructure that powers **two kinds of trip creators**:

1. **Regular users** create free, public "social trips" (e.g., "group to climb Cerro Chirripó this Saturday"). People join, chat, and coordinate.
2. **Certified agencies / guides** use an **agency panel** to publish "official" paid tours (capacity, price, itinerary, integrated payments, cancellations, etc.).

Both kinds of plans live in the **same feed/map** but are visually distinct (one is social/free, the other is a priced, verified product). The experience blends **Meetup + Airbnb Experiences + a touch of Instagram** (trip photos, reviews, profiles).

**Private plans** extend the same `trip` entity with `visibility: private`: invite-only plans for friends/family that include a collaborative **workspace** (packing list, budget, polls, shared docs, collaborative itinerary).

### One-liner

> Find or create a trip — public or private, free or paid — with the people you want, and coordinate in one place.

---

## 2. Goals & Non-Goals (MVP)

### Goals
- Two-sided marketplace: users (RSVP, chat, review) and agencies (publish verified paid tours).
- Private collaborative plans for groups of friends/family.
- One feed + map surfacing all public content, distinguished visually between social and verified/paid.
- Reputation (reviews + badges) as the trust layer.
- ES + EN from day one. PWA delivery (free infra, no store fees).
- Monetization designed now, built in v2 (see §9).

### Non-Goals (explicitly out of MVP scope)
- Real payment capture (Stripe) — **deferred to v2**. Paid tours exist as listings with price and reservation; money movement is off-platform (see §9).
- PRO SaaS plan (CRM, reports, multi-user, branding) — v2.
- Algorithmic feed / personalization beyond simple tabs + filters.
- Geo-fencing check-in, native mobile apps (KMP) — later phases.
- Content moderation AI — manual queue for MVP.

---

## 3. Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Local explorer** ("tico") | Costa Rican looking for weekend plans with others | Discover social trips, RSVP, chat, coordinate. Local currency (CRC). |
| **Tourist** | Visitor (often English-speaking, USD) | Find verified tours, trusted agencies, transparent pricing, reviews. |
| **Social organizer** | Any user creating free public trips | Publish quickly, manage RSVPs/waitlist, run group chat, QR check-in. |
| **Private plan host** | Creates invite-only plans (friends/family) | Invite people, collaborative checklist/budget/polls/docs/itinerary, private chat. |
| **Agency / guide** | Tour operator selling experiences | Agency profile, publish tours w/ itinerary & price, manage reservations, get paid (v2). |
| **Platform owner** | You | Super-admin: approvals, moderation, disputes, metrics. |

---

## 4. Core Domains & Feature Spec

### 4.1 Auth & Profiles
- Supabase Auth: **Google OAuth** + **email/password**. (Phone/OTP considered later; WhatsApp tie-in is copper for CR.)
- On first login → **onboarding flow** (locale, display name, avatar, bio, interests/categories).
- Profile: `display_name`, `avatar_url`, `bio`, `locale (es/en)`, badges, follows, social trips created.
- **Partial visibility**: public = name, avatar, bio, reviews, public trips **created**. Private = "trips joined" (RSVP list). Private plans: **completely invisible** on profile (not even a counter).
- Follows: users can follow people **and** agencies.
- Roles: `user`, `organizer` (self-flag, hoists social features), `agency_member` (via agency), `admin` (platform owner).

### 4.2 Trips — the core entity

| Field group | Details |
|---|---|
| type | `social` (free) or `tour` (paid, agency-owned) |
| visibility | `public` or `private` (fixed at creation; change requires `draft` state) |
| Basics | title, description, cover image, category, location name + lat/lng, start_at, end_at |
| Capacity | optional for social; required for tours. `min_participants` for tours |
| Join | join_deadline; RSVP open (social) or reserve spot (tour) |
| Status | `draft → published → full → in_progress → completed` + `cancelled`, `suspended` |
| Recurrence | simple weekly pattern → auto-generated instances (each editable individually; "edit this / edit series") |
| Itinerary | ordered time-blocks with `day_index` (supports multi-day like Chirripó cheaply) |
| Price | `tour` only: `price_crc` (integer, CRC). USD shown as estimate (see §4.8) |
| Moderation | reportable; suspendable by super-admin |

**Status transitions**
```
draft ──publish──▶ published ──▶ full ──▶ in_progress ──▶ completed
                      │            ▲
                      ▼            │
                   cancelled ◀──── (host or auto, min-participants rule)
                      ▼
                   suspended (super-admin only)
```
- `full` is derived: set when confirmed == capacity; reverted when a seat frees (waitlist promotion).
- `in_progress` auto at start_at; `completed` auto after end_at (host can also mark).
- Recurs-generator: future instances created in bulk; past instances immutable via UI.

### 4.3 RSVP, Waitlist & Membership
- **Social public**: open RSVP, instant `confirmed`. Host can remove anyone (with notification).
- **Tour**: "Reserve spot" → `confirmed` (v2: becomes paid booking with payment state).
- **Private plan**: membership = `attendees(status='confirmed')`. No waitlist, no approval required (invite is the gate). Guests can leave; host/co-hosts can remove.
- **Automatic waitlist** (public trips): on cancel/seat-free, promote first-in-line (by `joined_at`) transactionally. Both sides notified. If free spot appears after join_deadline, host decides.
- Seat counts are transactional (see §7 data integrity).

### 4.4 Chat (per trip, real-time)
- Supabase Realtime.
- Room auto-created on publish/create; join-gated:
  - Public trip: confirmed attendees (+ waitlisted read-only) + host/co-hosts.
  - Private plan: all members.
- System events injected: user joined / left / cancelled / host announcements / trip cancelled / promoted from waitlist.
- Moderation: member mute, message delete; messages delete-able by sender or host/co-hosts; super-admin sees report queue.
- Optional on public trips: "Open WhatsApp group" link (host sets) as a funnel-out valve.

### 4.5 Private Plans — Workspace Utilities
All accessible only to members; permission split:
- **Structure** (title, dates, location, organizer, base list): owner + co-organizers.
- **Content** (everything below): all members can contribute. Owner can lock a module.

| Module | Behavior |
|---|---|
| Packing list | Shared checklist; each item `done` + `done_by`; members add/toggle |
| Prerequisites | Items with `assigned_to` (who brings what) + status |
| Budget / expenses | Expense: payer, amount CRC (int), concept; equal split auto-calculated across active members (not stored) |
| Polls | Options + togglable votes; optional `closes_at`; owner deletes |
| Shared docs | PDF/map/itinerary uploads (Supabase Storage); visible to all members |
| Itinerary | Reuses `itinerary_blocks`; members contribute blocks; owner/co-hosts edit/delete |

Invitations:
- **Direct**: by username or email within the app → notification.
- **Link with expiry**: token, `expires_at`, `max_uses`, revocable. Entering auto-joins. Rate-limited. No self-invite, no duplicates (`unique(attendees(trip_id, profile_id))`).

### 4.6 Check-in (QR) & Reviews
- Host/agency displays QR (or scans); attendee scans → `checked_in`; host may also mark `attended` manually as fallback.
- **Reviews open only to attendees** (`checked_in` or `attended`) **after the trip completes**; 1–5 stars + text; optional agency response.
- Private plans: **no reviews**.
- Review moderation: report → pending → hidden. Fraud signal: reviewer marked `no_show`.

### 4.7 Reputation & Badges
- Score 0–5 (avg, recency-weighted) + review count. Shown on profiles / trip cards.
- Badges (code → label in both locales):
  - `verified_agency` (agencies approved by platform)
  - `fast_responder` (median chat reply < 30 min across recent trips)
  - `host_10` (hosted 10+ trips)
  - `great_host` (avg review ≥ 4.7 with ≥ 5 reviews)
  - `good_participant` (≤ 1 no-show, ≥ 5 attended)
- Super-admin grants/removes badges manually (MVP), auto-rules later.

### 4.8 Search, Feed & Map
- Tabs: **Upcoming / Near me / Verified (agencies) / My trips** (+ **Private plans** section for members).
- Filters: category, date range, price (tour), capacity.
- Map: MapLibre GL + OSM, one pin per trip (meeting point), cluster at high zoom. "Near me" uses GPS + radius.
- Currency: prices stored CRC integer; USD estimate via configurable weekly rate (free lookup + super-admin override). Shown as "≈ US$xx". One side of the UI uses the locale default (CRC for `es`, USD estimate for `en`).

### 4.8.1 Landing / Homepage - Animated Nature Hero (MVP)
Marketing surface, product-shaped. One standalone homepage (PWA-installable shell), not a separate marketing site.

- **Hero (animated):** full-viewport (`min-h-[100dvh]`), forest/leaf **parallax backdrop** (GSAP ScrollTrigger), headline ≤ 2 lines, subtext ≤ 20 words, ≤ 4 text elements, 2 CTAs (`Find a trip` / `Create a trip`).
- **Parallax layers:** 3–5 leaf/forest layers at distinct speeds (near/far). Decorative-only: `aria-hidden`, behind content, pointer-events-none, `prefers-reduced-motion` → static (no parallax in MVP; GSAP ScrollTrigger only, no scroll-jacking).
- **CTA discipline:** ≤ 3-word labels, one line each; no emoji in CTAs; single accent (forest green) locked per skill §8.
- **SSR-safe:** animation is client component only (`useGSAP`); no `window` at module scope; `prefers-reduced-motion` respected; PWA shell offline → static hero.
- **DoD:** e2e asserts hero visible on `/es` + `/en`, parallax active, reduced-motion path static, CTA routes correct.

### 4.9 Agencies & Panel
- Onboarding: application (business name, legal ID (cédula/jurídica), description, documents upload) → **super-admin manual approval**.
- Agency profile: public page, verified badge, tours, reviews.
- Members: roles `owner | admin | staff`. Owner manages.
- **Panel (MVP, free tier)**: publish/edit tours + itinerary blocks, manage reservations, QR check-in, messaging, scan-results, basic stats (reservations/attendance).
- Tour publish: `draft → published` (super-admin review optional in MVP via toggle).
- **PRO tier (v2)**: client CRM, revenue/reporting, multi-user strengthening, custom branding.

### 4.10 Super-Admin (platform owner)
- Approve agencies + optionally tours.
- Users: ban/suspend/unsuspend; view report tickets queue; moderate content (trips/messages/reviews/agencies).
- Metrics: DAU/WAU, trips created, RSVPs, tour reservations, conversion to check-in.
- Currency override; badges; manual booking flags (v1.5 manual payment marking).

### 4.11 Notifications
Channels: **in-app inbox + Web Push (VAPID) + Email (Resend)**.

Events:
- Social: RSVP confirmed, waitlisted, promoted from waitlist, trip cancelled, new follower, new message in joined trip, trip reminder (T-24h/T-2h).
- Private: invited_to_plan, member_joined_plan, poll_added, new_expense, doc_uploaded, checklist_item_done, itinerary_updated, plan_reminder (T-24h/T-2h), invite_expiring_soon.
- Agency: new reservation, reservation cancelled, review received, payout ready (v2).
- Admin: agency application pending, report ticket opened.

---

## 5. Registration & First-Use Flows

1. **Sign up** → Google or email/password → onboarding (locale, name, avatar, categories).
2. **First browse** → feed "Upcoming"; CTA cards teach create/join; empty states guide.
3. **Create a trip** (social/private) → wizard: basics → schedule → location (map picker) → capacity → publish.
4. **Join a trip** → details → RSVP → chat opens.
5. **Private plan invite** → notification/link → joined → workspace tabs.
6. **Agency** → apply → documents → super-admin approves → onboarding checklist → publish first tour.

---

## 6. Content & Community Safety (MVP)

- Report tickets: target `trip | user | message | review | agency`, reason + description.
- Super-admin queue with actions: hide content, remove message, suspend user/agency, dismiss.
- Profanity/abuse fallback filters are **not** enabled by default (manual first); AI filtering is a later phase.

---

## 7. Edge Cases & Policies (baked into behavior)

**Trips**
- Visibility change → must be in `draft` (prevents "flying" public RSVPs to private, or leaking private plans).
- Join deadline: social = up to start time (host can close manually); tour = 48h before start or when full.
- Min participants (tour): not filled 24h before → **auto-cancel + notify all** (+ v2 auto-refund).
- Cancel (social): host cancels → all notified (push+email), explanation thread, archived.
- Recurrence: past instances immutable; future bulk-editable; "edit this / edit series".
- Timezones: store UTC; render `America/Costa_Rica` (no DST: no wall-clock drift risk for recurrences).

**RSVP/Waitlist**
- Double-cancel race → promote sequentially in `joined_at` order, single transaction.
- Seats transactional: unique partial index + counter to prevent oversell.
- Removed by host → notification; may rejoin if spot.

**Payments (v2 design pre-bakes)**
- Refund window: full refund ≥ 48h before start; none < 48h. Host cancels → 100% refund auto.
- No-show: no refund; freed spot auto-reoffered to waitlist.
- Currency round: split rounding resolved by "last payer takes the difference".

**Private plans**
- Removed member: contributions persist (attributed); re-join only via fresh invite.
- Owner leaves: ownership transfer prompt; if nobody remains → auto-archive.
- Revoked link: no new joins; existing members unaffected.
- Capacity optional; if set and full, link invites rejected until a seat frees.

**Content & privacy**
- Image uploads validated; **EXIF/GPS stripped** on ingest.
- RLS everywhere: private trips/plans, chats, workspace unreadable unless member.
- PWA offline: public feed shell cached; private data **online-only** (session-bound).

---

## 8. Monetization (runs later, designed now)

1. **Transaction commission** on paid tours (10–15%), deducted at payout.
2. **SaaS PRO** for agencies (~$25–30/mo): CRM, reports, multi-user, custom branding.
3. Free tier: publish + panel + base stats (keeps the marketplace liquid).

### Payment rollout stages
- **MVP (now):** payments deferred. Tours are listings with "Reserve" (no charge). Agencies coordinate off-platform (SINPE/WhatsApp). Super-admin can mark `paid` manually (**v1.5**).
- **v2:** Stripe. **Constraint (verified): Costa Rica cannot open a standard Stripe account.** Path: **Stripe Atlas** (US LLC, ~$500 one-time) as the platform; **Stripe Connect** with **Global Payouts / Accounts v2** — Costa Rica became a supported cross-border payout destination (Feb 2026) — so agencies receive payouts to CR bank accounts. Commission deducted from payout. KYC via Connect.

---

## 9. Success Metrics (MVPs)

| Metric | Target (post-launch, 90d) |
|---|---|
| Signups to first join | ≥ 40% |
| Joins to chat participation | ≥ 60% |
| Trips created per 100 MAU | ≥ 5 |
| Tours w/ reservation conversion | ≥ 15% of views |
| Private plans created per 100 MAU | ≥ 8 |
| Review rate (attended) | ≥ 30% |
| Check-in rate (attended) | ≥ 70% |