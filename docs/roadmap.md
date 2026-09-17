# Dele Viaje — Roadmap & Milestones

Single developer, free stack, PWA. Estimates are solo-dev and optimistic; each phase has a **definition of done** used as the gate before moving on.

---

## Phase 0 — Foundations ⚙️ *(1–2 weeks)*
**Goals:** repo conventions, running app shell, Supabase wired, i18n + PWA + design system locked.

- [ ] Read bundled Next 16 docs (`node_modules/next/dist/docs`); record conventions in `docs/architecture.md` (caching, route handlers, proxy, PWA).
- [ ] Supabase project + `supabase/migrations/0001_profiles.sql` (+ auth trigger), RLS helpers (`lib/rls`).
- [ ] Auth: Google + email/password, SSR cookie session, signup/login pages, `/api/auth/callback`.
- [ ] Onboarding flow (locale, name, avatar, prefs).
- [ ] i18n: framework decision (`next-intl`) + `messages/es.json`, `messages/en.json` skeleton.
- [ ] PWA: manifest, icons, service worker, iOS install hint.
- [ ] **Homepage animated nature hero (GSAP + ScrollTrigger, see PRD §4.8.1):** client-only island (`useGSAP`), parallax leaf layers (decorative-only, `aria-hidden`), `prefers-reduced-motion` → static fallback, no `window` at module scope → SSR-safe; e2e asserts hero + parallax on `/es` + `/en` and static under reduced-motion.
- [ ] **Design system (Taste skill mandatory):** design read + dials + palette/typography/radius/icons lock in `docs/design-taste.md`; base `components/ui`.
- [ ] CI: `pnpm lint`, `tsc --noEmit`, Vitest setup, Playwright smoke.
- **Definition of done:** `pnpm dev` boots a branded, i18n'ed, PWA-installable shell with the **animated nature-hero parallax active** on `/es` + `/en` (and static under reduced-motion); auth→onboarding end-to-end; CI green.

---

## Phase 1 — Social Core 🌲 *(3–4 weeks)*
**Goals:** public social trips work end-to-end (create → discover → join → chat). The product is usable by real hikers.

- [ ] Migrations `0002_trips` + `0003` attendees/waitlist triggers; seat/waitlist integrity.
- [ ] Trip CRUD (draft→publish), recurrence (weekly), itinerary blocks.
- [ ] Feed (Upcoming / Near me / My trips) + filters + MapLibre map view + Nominatim geocode.
- [ ] RSVP, leave, auto-waitlist promotion, seat churn rules.
- [ ] Chat (Realtime) + system events + moderation basics + WhatsApp group link.
- [ ] Profiles (public/partial), follow, badges seed.
- [ ] Notifications pipeline: DB rows → in-app inbox + Web Push (VAPID) + Resend email; reminders T-24h/T-2h.
- [ ] Super-admin basics: report queue, ban/suspend users, approve nothing yet.
- **Definition of done:** two seeded users create and join trips on live feed; chat realtime works; reminders fire; e2e Flow A green (create→publish→RSVP→chat).

---

## Phase 2 — Marketplace (Agencies) 🏷️ *(3–4 weeks)*
**Goals:** verified tour listings with reservations, reviews with QR check-in, reputation.

- [ ] Migrations `0004 needs` `0005` agencies, members, reviews, logo/cover storage.
- [ ] Agency application + super-admin approval pipeline.
- [ ] Agency Panel: publish tours (price CRC, capacity, min-participants, itinerary blocks), manage reservations, QR check-in, manual attendance.
- [ ] Feed: `Verified` tab + verified badge on cards.
- [ ] Reviews: gated to attended + completed; agency responses; admin hide.
- [ ] Reputation scores + badges (`verified_agency`, `fast_responder`, `host_10`, `great_host`, `good_participant`).
- [ ] Super-admin: metrics dashboard, approve/reject/suspend agencies, moderate tours.
- **Definition of done:** agency creates tour → approved → reservation → QR check-in → review; e2e Flow B green.

---

## Phase 3 — Private Plans & Workspace 🔒 *(2–3 weeks)*
**Goals:** invite-only collaborative plans with all utilities. (Phases 2↔3 are interchangeable; data model is independent.)

- [ ] Migrations: `visibility` on trips, `plan_invites`, `packing_items`, `expenses`, `polls/poll_votes`, `trip_docs`.
- [ ] Visibility model + RLS (private invisible everywhere; member-only reads).
- [ ] Invites: direct (username/email) + expiring links; revoke; join flow idempotent.
- [ ] Workspace UI: packing list, prerequisites (assigned), budget + equal split calc, polls, shared docs, collaborative itinerary; module lock.
- [ ] Permission layer (owner/co-host structure vs member content) via RLS helpers.
- [ ] Notifications for plan events; owner transfer / archive on empty.
- **Definition of done:** host creates private plan → invites 3 people via link → collaborative checklist/poll/budget → private project invisible to non-members; e2e Flow C green.

---

## Phase 4 — Monetization 💰 *(5–7 weeks, starts after traction validation)*
- **v1.5 (manual, ~1 week):** `payment_status` on attendees; super-admin/agency marking paid; "no refund/no-show" messaging in UI; simple attendance ledger export.
- **v2 (Stripe):**
  - [ ] Verify Stripe Atlas (US LLC) + Connect Global Payout CR availability in production (re-verify at build time — feature shipped Feb 2026).
  - [ ] Connect onboarding for agencies (KYC) → payouts to CR bank accounts.
  - [ ] Checkout Sessions for tour booking; webhooks; refund flow (≥48h free window), auto-cancel refunds; commission (10–15%) as application fee.
  - [ ] SaaS PRO plan (~$25–30/mo): Stripe Billing/Portal — CRM (client list from RSVPs), reports, multi-user, branding.
  - [ ] Super-admin: dispute queue, payout health dashboard.
- **Definition of done:** a real CR agency receives a real CRC payout minus commission; PRO subscription live.

---

## Post-MVP / Growth (stacked backlog)
- KMP shared module + native apps (see architecture §2).
- AI content moderation, auto-badges, geofence check-in.
- Search: text index (PG `tsvector`) + radius refactor to PostGIS.
- WhatsApp Business notifications (official API is not free — revisit).
- Guest no-account "join via link" for private plans (phone OTP).

---

## Milestone gate checklist (every phase)
1. `pnpm lint` + `tsc --noEmit` clean.
2. Unit/integration tests for the module's invariants green.
3. Playwright flows for that phase green.
4. Docs updated (data-model, api, architecture reflect reality).
5. Manual QA on Safari iOS (PWA install) + Chrome Android + desktop at least once.

## Team-of-one guardrails
- One feature branch per module; small PRs; never commit secrets; `.env.local` only.
- Keep `docs/*` current in the same PR as the code (doc-as-code).