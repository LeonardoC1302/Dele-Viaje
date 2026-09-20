# Dele Viaje — Roadmap & Milestones

Single developer, free stack, PWA. Estimates are solo-dev and optimistic; each phase has a **definition of done** used as the gate before moving on.

> **Status as of 2026-09-20 (see `PROJECT_STATUS.md` for the full
> phase-by-phase build log this summary is drawn from):** Phases 0–3 are
> all **DONE**, with a small number of explicit, user-decided scope cuts
> (shared docs originally deferred — since built as `trip_documents`,
> migration `0029`; agency document/verification upload still deferred).
> Phase 4 (real payment capture) is untouched, but its **v1.5 manual
> stage — SINPE Móvil evidence upload + agency review — is done**
> (migration `0026`), which covers the same ground the v1.5 bullet below
> asks for. Several follow-up features beyond the original phase scope
> also shipped: agencies/tours/reviews/Q&A/check-in (Phase 2 work,
> migrations `0022`–`0025`), tour templates, multi-date tours, agency
> rating rollups, feed price/date filters, and a master admin panel.
> Notification **delivery channels** (Web Push, Resend email, T-24h/T-2h
> reminders) remain genuinely not started — the in-app inbox pipeline
> they'd ride on already exists. See `docs/frontend-migration-reference.md`
> for the full current feature/schema/route inventory.

---

## Phase 0 — Foundations ⚙️ *(1–2 weeks)* — **DONE**
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

## Phase 1 — Social Core 🌲 *(3–4 weeks)* — **DONE** (core features; notification *delivery channels* deferred, user decision 2026-09-17)
**Goals:** public social trips work end-to-end (create → discover → join → chat). The product is usable by real hikers.

- [x] Migrations `0003` (trips) + `0004`/`0005`/`0006` attendees/waitlist triggers; seat/waitlist integrity.
- [x] Trip CRUD — **create publishes immediately, no draft→publish flow was built for social trips** (tours are the exception — see Phase 2, tours *do* have draft→publish). No recurrence (weekly pattern) was ever built — `trips.recurrence_id` is schema-only, unused. Itinerary blocks: built (migration `0016` schema, UI landed later alongside Phase 3, with icon fallback added in `0021`).
- [x] Feed (category tabs / Near me / Verified) + price/date filters + MapLibre map view (clustered) + Nominatim geocode. "My trips" is its own dashboard (`/my-trips`), not a feed tab.
- [x] RSVP (`join_trip`), leave (`leave_trip`), auto-waitlist promotion, seat churn rules, waitlist position visibility (migration `0031`).
- [x] Chat (Realtime) + system events (migration `0013`) + message editing (migration `0027`) + moderation basics (soft delete, report button). **Not built**: WhatsApp group link / `chat_settings` (no schema at all for mute/announcements-only/link).
- [x] Profiles (public via `profiles_public()`, partial visibility), follow (migration `0011`), badges seed (migration `0012`, manual grant only — no auto-rule badges).
- [ ] Notifications pipeline: DB rows → **in-app inbox only, DONE**. Web Push (VAPID), Resend email, and T-24h/T-2h reminders are **explicitly deferred** (user decision 2026-09-17), not outstanding work — they need external accounts/keys before they're worth wiring up.
- [x] Super-admin basics: report queue (migration `0009`), ban/suspend enforcement (migration `0010`). Agency approval came with Phase 2.
- **Definition of done:** met for everything except live reminders (deferred, see above).

---

## Phase 2 — Marketplace (Agencies) 🏷️ *(3–4 weeks)* — **DONE except agency document upload** (out of scope by explicit user decision, 2026-09-20)
**Goals:** verified tour listings with reservations, reviews with QR check-in, reputation.

- [x] Migrations `0022`–`0025`: agencies, `agency_members`, tours (`trips.type='tour'`), tour Q&A, reviews, check-in.
- [x] Agency application (`apply_for_agency()`) + super-admin approval pipeline (`set_agency_status()`, `/admin/agencies`).
- [x] Agency Panel (`/agencies/[id]/panel`): publish tours (price CRC, capacity, min-participants, itinerary blocks, multi-date via `tour_group_id` — migration `0032`), manage staff, **manual check-in** (roster tap-to-toggle — **not** QR/camera scanning, scoped down deliberately, see below).
- [x] Feed: `Verified` tab (checks agency approval at read time, not just publish time) + "Tour" badge/price on cards.
- [x] Reviews: gated on tour `start_at < now()` + reviewer `attendance='attended'` — **deviates from the original "attended + completed" gate below**, because `trips.status` never actually reaches `'completed'` anywhere in the app (no cron, no manual transition), so that gate would have been permanently unreachable. Agency responses: one per review, column-grant restricted. Admin can delete (moderation) via the shared delete policy; no separate "hide" state was built.
- [x] Reputation: badges unchanged from Phase 1 (still manual-grant only, including `verified_agency` — nothing auto-grants it on approval). Agency aggregate star rating: computed live by averaging `reviews.rating` across the agency's tours (no stored score column).
- [x] Super-admin: agency approve/reject/suspend, admin dashboard (`/admin`) with live counts, user ban/suspend/role-grant (`/admin/users`). **Not built**: a metrics dashboard (DAU/WAU/conversion aggregates) — the admin dashboard only shows open-report/pending-agency/user counts, not usage analytics.
- **Definition of done:** met, with check-in scoped to manual (not QR) by deliberate decision — see `PROJECT_STATUS.md`'s Phase 2 section for the reasoning (QR's actual value over a tap-to-toggle roster didn't justify a camera-scanning dependency at this scale).
- **Built beyond original Phase 2 scope**: tour templates (migration `0028`), exclusive content for paid attendees (migration `0030`), the SINPE Móvil manual payment flow (migration `0026`, see Phase 4 below).

---

## Phase 3 — Private Plans & Workspace 🔒 *(2–3 weeks)* — **DONE except shared docs originally, now also DONE** (shared docs were deferred by decision, then built anyway as `trip_documents`, migration `0029`, 2026-09-20)
**Goals:** invite-only collaborative plans with all utilities. (Phases 2↔3 are interchangeable; data model is independent.)

- [x] Migrations: `0016` (visibility on trips, `plan_invites`, `packing_items`, `expenses`, `polls`/`poll_votes`, `trip_docs` schema-only), `0017` (owner auto-membership fix), `0019` (direct invites, leave/transfer/auto-archive), `0020` (RLS recursion fix — required before any non-owner member could read a plan at all), `0029` (real document uploads via `trip_documents`, superseding the unused `trip_docs` table from `0016`).
- [x] Visibility model + RLS (private invisible everywhere via `notFound()`-style handling; member-only reads, `is_member(id)` branch on the `trips` select policy).
- [x] Invites: direct (**email**, not username — `profiles` has no username column) + expiring links; revoke (soft, `revoked_at`); join flow idempotent (`accept_plan_invite()`).
- [x] Workspace UI: packing list, prerequisites (an item with `assigned_to` set — same table, not a separate concept), budget + equal split calc (computed client-side, never stored), polls, **shared docs (done — see above)**, collaborative itinerary. **Not built**: per-module owner lock (packing/budget/itinerary aren't individually lockable — always all-members-can-contribute).
- [x] Permission layer via RLS helpers (`is_member`/`is_host_team`, not separate owner/co-host structure — there's no co-host concept anywhere in this app, only owner vs. member).
- [ ] Notifications for plan events — only `plan_direct_invite` exists; joined/poll-added/expense-added/etc. were never added to the `notifications.type` check constraint. Owner transfer (`transfer_plan_ownership()`) / auto-archive-on-empty (`archive_empty_private_plan()` trigger): both done.
- **Definition of done:** met — verified end-to-end including the invite → join → workspace flow; the RLS-recursion bug (migration `0020`) was found and fixed specifically while testing this flow with a real non-owner member.

---

## Phase 4 — Monetization 💰 *(5–7 weeks, starts after traction validation)*
- **v1.5 (manual) — DONE** (migration `0026`, 2026-09-20, built as "SINPE Móvil" specifically rather than a generic manual-mark-paid flow): `attendees.payment_status`/`payment_evidence_path`; buyer uploads bank-transfer screenshot evidence to a private Storage bucket, host team confirms/rejects via `confirm_payment()`/`reject_payment()`. "No refund/no-show" messaging in UI and an attendance ledger export were **not** built — only the pay/evidence/confirm loop itself.
- **v2 (Stripe) — untouched, still fully speculative:** researched only (Google Pay/Apple Pay feasibility discussed 2026-09-20 — blocked on no major processor supporting Costa Rica as a merchant country yet; **Tilopay**/**ONVO Pay** named as CR-specific gateways worth evaluating instead of Stripe Atlas if/when this is picked up).
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