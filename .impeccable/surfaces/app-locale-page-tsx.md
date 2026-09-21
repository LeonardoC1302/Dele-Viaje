---
version: 1
slug: "app-locale-page-tsx"
primary_target: "app/[locale]/page.tsx"
related_targets: []
---

# Home page — Cordillera, dossier world

Scope: `app/[locale]/page.tsx` and `components/landing/*`. Visitor mode: Persuade. Audience: two co-equal groups (local organizers, tour buyers) per PRODUCT.md. Task: make the two-sided offer (organize free/social vs. book verified/paid) intelligible in one viewport and prove it with real trip data, not stock imagery.

This surface **inherits the world recorded in `app-locale-main-layout-tsx`** (Expedition Dossier, seed `7902b9f6`). It keeps its own Persuade composition — a marketing header instead of the folder rail, a full-viewport hero — but it does not get its own palette, geometry or type. Where the two briefs disagree, the shell brief wins.

## Direction contract

THESIS: The home page is a ridgeline view of Costa Rica's own terrain with real upcoming trips sitting on it as proof, refusing the drone-shot-beach-photo-plus-search-bar template every travel app defaults to. It opens the dossier world rather than advertising a different one: the trips shown here are the same folder-tabbed cards the feed uses, so what a visitor sees before signing up is literally what they get after.

OWN-WORLD: Inherited from the shell brief and unchanged. Forest green ground, dawn orange spent only on the single primary action, warm sand paper (#fbf8f2) as the only ground. Crisp field-guide geometry — 6px panels, hairlines and ground-tint steps instead of shadows, pill radius on buttons/chips/avatars only. Schibsted Grotesk display over Work Sans body with the uppercase wide-tracked micro-label above every region. The ridgeline is the signature drawing. **Superseded:** this brief's previous "rounded-soft cards (18–24px radius)" line and its "landing-only fonts" scoping — the user replaced the soft-card system with crisp field-guide geometry as a durable, app-wide change, and both faces now load app-wide.

STORY: A visitor reads in one line that this replaces the WhatsApp-group chaos of organizing a trip AND is a place to book real verified tours; sees the ridgeline prove "Costa Rica" without a stock photo; sees the two paths (organize free / book verified) at equal weight; sees real upcoming trips as proof the product is live; acts via "Explorar viajes" or "Crear viaje."

FIRST VIEWPORT: Sticky marketing header (wordmark left, links center, locale switch and sign-in right, collapsing to wordmark + menu below `lg`). Hero fills the viewport minus the header: eyebrow, two-line headline with one dawn-colored emphasis word, subtext, two CTAs (primary dawn, ghost outline), all left-aligned in a max-640px column, with the ridgeline silhouette and its sun anchored along the hero's bottom edge, uniformly scaled and top-anchored so the peaks and sun are never the part that gets cropped.

FORM: Own-grounded Costa Rica outdoor-editorial system, chosen by the user from a 5-then-3-card comparison round after two prior rounds (8 directions total), then re-grounded in the Expedition Dossier surface round (seed `7902b9f6`). Code-led: no image generation in this session, so the ambition lives in this block and the signature interaction, audited in behavior at the finish review.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Content notes (confirmed with user)

- Preserve every existing landing section's *function*: header (locale switch, sign in/out, mobile menu), hero CTAs (→ /feed, → /trips/new), the 3-way how-it-works breakdown (social/tour/private), agencies CTA, footer link columns.
- The old "Waitlist" email-capture section is retired (stale pre-launch copy — the product has launched with real users). Replaced with a real trip showcase section reading live published trips from the DB.
- The agencies CTA's "founding group / before launch" framing is stale; agency applications are live now.
- No raster assets: every graphic (ridgeline, icons, wordmark peak) is inline SVG, code-led for those regions.
