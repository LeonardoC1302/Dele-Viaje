# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two co-equal audiences, confirmed with the user:

- **Local explorers ("ticos")**: Costa Ricans organizing casual group trips with friends — a weekend hike, a beach day, a volcano climb. They create or join free public "social trips," coordinate via built-in chat, split expenses, and manage packing lists. Price-sensitive, CRC-native, mobile-first.
- **Tour buyers**: people (locals or tourists) browsing and booking paid, agency-run tours (guided hikes, surf lessons, multi-day trips) with transparent pricing, verified-agency badges, and reviews before they commit.

A third, smaller-footprint audience uses the product but isn't a home-page audience: **agencies/guides** who publish and manage tours through a dedicated panel, and a **platform admin** (the founder) who approves agencies and moderates reports.

## Product Purpose

Dele Viaje is a single app that replaces the WhatsApp-group-and-spreadsheet chaos of organizing a trip with friends, while also functioning as a marketplace for verified local tour agencies — both social ("let's climb Chirripó Saturday, who's in") and commercial ("book a guided Chirripó tour from a verified operator") trips live in the same product, visually distinguished, so a user never has to leave the app to go from "find people" to "find a professional."

Success = a trip that used to require a scattered group chat (who's coming, what to pack, who owes who, where's the itinerary, here's the confirmation PDF) now happens inside one shared, purpose-built workspace; and = a tourist or local can find and book a tour from a real, reviewed, verified agency without relying on word-of-mouth or an unverified social-media post.

## Positioning

Confirmed with the user: Dele Viaje's actual competition isn't other booking platforms — it's the WhatsApp group chat and Facebook event a trip currently gets organized in. The mechanism a neighboring product can't copy without becoming this product: RSVP + waitlist + group chat + packing list + shared expenses + collaborative itinerary + (for private plans) shared trip documents, all attached to the *same* trip object a chat thread can never structurally hold. On the marketplace side, the same mechanism extends to agencies: a verified badge, aggregate rating across every tour an agency has run, and a manual-but-real payment-evidence flow (SINPE Móvil, Costa Rica's dominant instant bank transfer) that undercuts card-processor commissions competitors like Stripe/PayPal charge — deliberately not those, since Costa Rica merchants find them costly and under-supported.

## Operating Context

- **Bilingual from day one**: every user-facing string ships in Spanish and English (`next-intl`, always-locale-prefixed routes: `/es/...`, `/en/...`). Costa Rica market first, LATAM/tourism-destinations expansion later.
- **Currency**: Costa Rican colones (CRC) only — no multi-currency support exists or is planned for v1.
- **Two trip shapes, one entity**: a "trip" row is either a free/public **social trip** (anyone can RSVP), an invite-only **private plan** (friends/family workspace: packing list, expenses, polls, itinerary, documents, direct/link invites), or an agency-run, priced **tour** (capacity, price, manual check-in, SINPE payment evidence, tour Q&A, reviews, optional multi-date scheduling, optional paid-attendee-exclusive content, optional reusable templates for agencies that re-run the same tour).
- **Real, live data exists**: this is not a pre-launch mockup — there are already seeded/real tours (e.g. a Cerro Chirripó tour, an Acatenango tour) and a working admin approval queue for agencies.
- **Money moves off-platform, by design, not as a stopgap**: SINPE Móvil is a first-class payment method (agency posts a phone number, buyer pays via their own banking app and uploads a screenshot as evidence, agency confirms/rejects) — not a placeholder waiting for Stripe. Stripe/card-processor integration is explicitly deferred/research-only.
- **A ground-up frontend redesign is starting now.** Every functional capability documented in `docs/frontend-migration-reference.md` must survive the redesign unchanged; only the visual system and component implementation are in scope for replacement. This PRODUCT.md and the eventual DESIGN.md govern the *new* visual world; the current UI is evidence/anti-reference, not a spec to preserve visually.

## Capabilities and Constraints

Full detail lives in `docs/frontend-migration-reference.md` (feature inventory, DB schema, routes, components) and `docs/PRD.md` (original intent + deviation notes) — summarized here for product-level orientation:

- Auth + profiles (roles: user, agency staff/admin/owner, platform admin), account status enforcement (active/suspended/banned).
- Social trips: create, RSVP with automatic waitlisting/promotion, group chat (with edit support), attendee list, packing list, expenses, polls, collaborative itinerary, reports/moderation.
- Private plans: everything a social trip has, plus invite-only membership (direct invite by email or shareable link), member roles (owner/transfer/leave), and private trip document uploads (reservations, tickets, etc.) restricted to the host team and members.
- Agencies/tours marketplace: agency application + admin approval, staff roles, tour publishing (draft → published), tour editing/deletion, reusable tour templates, optional multi-date tours (same content, several independently bookable dates), manual check-in roster, SINPE Móvil payment evidence + review, tour Q&A (public ask, agency-only answer), reviews + agency responses, aggregate agency rating, paid-attendee-exclusive content (e.g. WhatsApp group links).
- Discovery: combined feed + map, category/verified/near-me tabs, price and date-range filters.
- Notifications (in-app only — no email/push yet), master admin panel (agency approval queue, user management, reports).
- Constraint: every RLS-gated capability in the current backend must remain reachable from the new UI — this is a visual rebuild, not a functional rewrite.
- Undecided: whether the tourist-facing marketplace and the local-organizer social product get materially different home-page treatments beyond visual distinction (both were confirmed as co-equal audiences, but section-by-section emphasis is a new-work decision, not decided here).

## Brand Commitments

- Name: **Dele Viaje** — Costa Rican slang for "go for the trip / make it happen." The name itself is a binding brand commitment (not up for renaming as part of this redesign).
- Confirmed tone: **warm, local, casual** — Tico slang energy, approachable and community-driven, explicitly *not* corporate travel-agency polish. This is a voice/tone commitment; specific palette/type/visual language is undecided and belongs to the upcoming DESIGN.md, not here.
- Verified-agency badge/status is an existing trust signal (`agencies.status = 'approved'`) and should read as a real credential, not decoration.

## Evidence on Hand

- Real seeded product data exists (live tours, e.g. Cerro Chirripó, Acatenango) but no real customer testimonials, press mentions, or case studies exist yet — future work must not fabricate these.
- No production analytics/metrics are available to cite (e.g. "10,000 trips organized") — do not invent numbers.
- Existing screenshots/UI are available as implementation evidence in the running app, not as brand/visual evidence — see `docs/frontend-migration-reference.md` for what to preserve functionally.

## Product Principles

1. **The trip is the unit, not the chat message.** Every feature (RSVP, packing, expenses, documents, itinerary) attaches to a persistent trip object, not a scrolling thread — this is the entire reason the product exists instead of a group chat.
2. **Two audiences, one home, visually distinct.** Social trips and paid tours coexist in the same feed/product without either one being treated as the "real" product and the other a bolt-on.
3. **Trust is earned in-product, not claimed.** Verification (agency approval), reputation (reviews/ratings), and payment evidence are all real, checkable mechanisms — never decorative badges.
4. **Costa Rica-first, not Costa-Rica-only.** SINPE Móvil, CRC pricing, and es/en bilingual support reflect the current market; the product is built to expand to other LATAM/tourism markets later, not hard-coded to assume it never will.
5. **Warm and local over polished and generic.** The brand voice explicitly rejects corporate travel-agency tone in favor of the casual energy the name itself carries.

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond standard web accessibility practice; treat WCAG AA as the floor pending explicit guidance.
