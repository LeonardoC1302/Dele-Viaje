# Dele Viaje — Technical Architecture

Project id: `dele-viaje`
Stack baseline: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + MapLibre + PWA.

> **IMPORTANT — this repo runs a modified Next.js (16.3.5) with breaking changes.** Every implementation task MUST read the bundled docs before writing code: `node_modules/next/dist/docs/` (App Router: `01-app/…`, incl. `15-route-handlers`, `16-proxy`, caching model). Do NOT apply out-of-training-data conventions blindly.

---

## 1. Principles

1. **Free stack only** (no paid infra): Supabase free, Vercel free or Cloudflare, Resend free, MapLibre/OSM, Web Push (VAPID), GitHub Actions.
2. **Next.js = single Backend-for-Frontend (BFF).** Auth/session via Supabase cookies; server components + route handlers; most writes also enforced server-side.
3. **RLS is the source of truth for authorization.** Never trust the client. React UI is a view over authorized Postgres rows.
4. **API-first where it matters:** trip join/leave, waitlist, chat, check-in, invites, reviews are explicit routes (testable, replayable). Reads default to Server Components + Supabase client (RLS).
5. **Payment-ready schema in v1 even though money moves in v2.**
6. **Taste skill is the mandatory UI standard** (see `docs/design-taste.md`).

---

## 2. Stack Decision Matrix

| Concern | Choice | Rationale / Cost |
|---|---|---|
| Framework | Next.js 16 (App Router), TS, Tailwind v4, pnpm | One codebase; user's existing skill |
| Auth | Supabase Auth (Google + email/password) | free, JWT, RLS integration |
| Database | Supabase Postgres (neon-style PG 15+) | free, triggers, RLS, views |
| Storage | Supabase Storage (covers, docs, avatars) | free tier; EXIF/GPS strip on ingest |
| Realtime | Supabase Realtime (chat, presence) | free; room-based channels |
| Email | Resend (SMTP) | free tier; transactional + reminders |
| Push | Web Push API + VAPID | free, no infra |
| Maps | MapLibre GL JS + OSM tiles + Nominatim (geocode, rate-limited) | free/no keys |
| Async/jobs | PG triggers → notification rows; Supabase scheduled webhooks / pg_cron for reminders; downloads in route handlers | free |
| PWA | Web app manifest + service worker (Next 16 docs) | no store fees |
| Tests | Vitest + Testing Library; Playwright e2e | free |
| CI | GitHub Actions (lint, tsc, unit, e2e) | free |
| Deploy | Vercel free (or Cloudflare) | free |
| Payments v2 | Stripe Atlas (US LLC) + Connect Global Payouts to CR | v2 only |
| KMP (later) | Shared business-logic module for future native apps | strategic, not MVP |

### KMP note (decision context)
Kotlin Multiplatform is viable for future native iOS/Android with shared logic + Compose UI, but KMP web (WASM/Compose for Web) is immature for a marketplace + B2B panels. Payment/map/push/chat SDKs are native-per-platform. PWA covers mobile reach for free with zero store fees. **Strategy: Next.js PWA now; reusable KMP "shared" module later** (models + client) if traction demands native apps.

---

## 3. High-Level Topology

```
[Browser] PWA
   │  (RSC / route handlers / supabase-js + realtime channel)
   ▼
Next.js 16 (Vercel)
   │  cookies-based Supabase session (SSR)
   ├── Supabase Auth (Google, email)
   ├── Postgres + RLS + triggers + views
   ├── Supabase Storage (images, docs)
   ├── Supabase Realtime (chat, presence)
   └── External: Resend (email), MapLibre+OSM (tiles), Nominatim (geocode)
```

Background work:
- Notification rows written inside the same DB transaction as the acting write (trigger or route).
- Push/email dispatch: subscribe to new `notifications` rows via a small worker/route or a Supabase scheduled function; web-push sent from a Next route to the VAPID endpoint. (MVP: dispatch synchronously in route; queue when volume grows.)
- Reminders T-24h/T-2h: Supabase scheduled function/pg_cron inserts notification rows → dispatcher sends.

---

## 4. Auth, Session & Authorization

- Supabase Auth with `auth.users` → `profiles` row created via trigger (see data-model).
- Session strategy: **cookie-based SSR** (`createServerClient` pattern per bundled Next 16 docs); client uses `supabase-js` browser client for realtime + storage only.
- Authorization model (three layers, all enforced):
  1. **RLS**: per-table read/write policies (public content readable by all; private trips/plans/messages/workspace readable only by members; writes gated by role helpers).
  2. **Route handlers**: business invariants (seat counting, waitlist order, invite token validity, review gating) — RLS guarantees row-level, routes guarantee process-level rules.
  3. **UI**: server components render only what RLS allows; optimistic client updates still validated server-side on commit.

Shared SQL helpers used by policies:
- `is_member(trip_id)` — EXISTS in `attendees` with status confirmed.
- `is_organizer(trip_id)` — owner OR co-host.
- `is_host_team(trip_id)` — owner, co-host, or agency staff (for tours).
- `is_admin()` — platform owner role.
- `is_agency_staff(agency_id)`.
- `can_review(trip_id)` — checked-in/attended + trip completed.

---

## 5. Modules / Repo Layout (proposed)

```
app/
  (marketing)/          # landing (public)
  (auth)/               # login, signup, onboarding, callback
  (main)/               # authenticated shell: nav, feed, map, search
    feed/page.tsx, map/page.tsx, search/page.tsx
    trips/[id]/…, trips/new/…
    u/[username]/…      # public profile
  (plans)/plans/[id]/…  # private plans + workspace
  (panel)/panel/…       # agency panel
  (admin)/admin/…       # super-admin
  api/                  # route handlers (see api.md)
  login/…               # auth pages via (auth) group
components/
  ui/                   # base (Taste-styled)
  trips/, chat/, plans/, agency/, admin/
lib/                    # supabase clients, helpers, validators
  rls.ts, money.ts, dates.ts, i18n.ts, push.ts
messages/               # next-intl locale files
supabase/
  migrations/           # SQL migrations (see data-model)
  functions/            # scheduled / edge functions
public/                 # icons, manifest, workers
tests/                  # vitest + playwright
docs/                   # this documentation set
```

---

## 6. Key Implementation Notes (per bundled Next docs)

- Server Components for reads; `'use client'` leaf islands for interactivity (chat, map, forms, workspace).
- Route Handlers (`app/api/**/route.ts`) for writes that need business rules; validate with zod on the server.
- Caching/revalidation: follow `01-app/…/08-caching`, `09-revalidating`; trip detail pages use deterministic + tag-based revalidation on join/leave/status change.
- Proxy note: Next 16 moves middleware → **Proxy** (`16-proxy.md`); use it for locale routing / auth-required redirects.
- Streaming + loading skeletons for feeds (matches Taste empty/loading state rules).
- Fonts via `next/font` (never external `<link>`).
- **GSAP + ScrollTrigger (homepage hero):** client island only — `"use client"`, register GSAP + ScrollTrigger inside the island, animate transform/opacity only, `prefers-reduced-motion` → static (no parallax in MVP; decorative aria-hidden layers behind content, no scroll-jacking). No `window`/`document` at module scope.

---

## 7. Realtime (Chat & Live Updates)

- Model: 1 channel per trip room: `trip:{id}`; presence for "online members".
- Row-level realtime enabled on `messages` with RLS filtering; presence broadcasts typed/online state.
- System messages written as DB rows (not client-injected) to keep history authoritative.
- Workspace updates (checklist, polls, expenses) broadcast via realtime row changes; optimistic UI + reconciliation.

---

## 8. Files & Media Pipeline

- Uploads go **client → signed URL → Storage bucket** (`covers`, `trip-docs`, `avatars`, `review-meta` not needed).
- **EXIF/GPS stripping** applied server-side on upload (sharp or exiftool wrapper — verify bundling works on the platform).
- Downsizing: create a web-ready cover variant (max 1600px, optimized JPEG/AVIF).
- Public read via storage public bucket with RLS on metadata only (paths are non-guessable UUIDs).
- Private docs are accessed via signed URLs with short TTL; RLS protects metadata/list.

---

## 9. i18n & Localization

- Library: `next-intl` (or the App Router i18n pattern that matches bundled docs) — decided in Phase 0.
- Locales: `es` (default for CR traffic), `en`. Structure: `messages/es.json`, `messages/en.json`, namespaced per domain (`nav, trips, chat, plans, agency, admin, common`).
- Locale from: cookie → account preference → browser → default `es`. Manual toggle persisted.
- All user-generated content is plain strings (no auto-translate in MVP; agency can add `title_en/description_en` at publish — stretch goal).

## 10. Currency & Money Display

- `price_crc int` (colones, no decimals) on tours. USD never authored; displayed estimate only:
  - `config.currency_rates` single-row table: `usd_to_crc`, updated weekly (free API lookup) or by super-admin override.
  - Rendering: `es` → `₡ 25,000`; `en` → `≈ US$ 47`.
- v1.5 manual payment flag on `attendees` (`payment_status: none|pending|paid`, `paid_at`, `paid_by_host` bool). All money columns exist from day 1; no capture.

## 11. Payments (v2) — Integration Blueprint

- **Platform**: Stripe Atlas US LLC (one-time ~$500) → Stripe account (platform mode, Connect).
- **Agencies**: Connect standard/express accounts; **Global Payouts with Accounts v2 supports Costa Rica bank destinations (added Feb 2026)** → payout to CR accounts. KYC via Connect onboarding.
- **Flow**: Checkout Session (or Payment Links) → `booking` created → trip attendance finalized → payout `balance.transaction` with `application_fee` (commission 10–15%) → webhooks update status → refunds via `refund` + Dispute handling.
- Schema pre-built: `attendees.payment_json jsonb` + tables `bookings` (v2). Do not build now; keep the contract.

## 12. Performance, Security & Compliance

- RLS for all multi-tenant data; no PII in client payloads beyond own rows.
- Rate limits on: invite generation, chat send, review post, RSVP flips.
- Input validation server-side (zod) on every route; file type/size checks.
- CSP + no `dangerouslySetInnerHTML` without sanitization.
- Privacy-lite roadmap: data export (user), account deletion with cascade (content anonymization or removal by policy).
- Caching: `stale-while-revalidate` public pages; private pages `no-store`.
- Vitals targets: LCP < 2.5s, INP < 200ms, CLS < 0.1 (Lighthouse gate in CI on landing).

## 13. Observability (free tier)

- Vercel logs; Sentry free tier optional later.
- Minimal custom metrics: `notifications_sent`, `push_errors`, `realtime_errors`, job failures — via pino logging + a `metrics` table.
- Super-admin dashboard reads aggregated views (see data-model `mv_*`/views).

## 14. Decide-Later (open questions tracked)

1. next-intl vs bundled i18n pattern (Phase 0).
2. Notification dispatcher: Next cron route vs Supabase scheduled functions (Phase 1).
3. Service worker strategy within Next 16 constraints (PWA shell only vs runtime caching).
4. EXIF-strip implementation at edge vs serverless (sharp bundle size).
5. Stripes availability timing for CR payouts in production (Phase 4 verification).