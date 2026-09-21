---
version: 1
slug: "app-locale-main-layout-tsx"
primary_target: "app/[locale]/(main)/layout.tsx"
related_targets: ["app/[locale]/(main)/feed/page.tsx","app/[locale]/(main)/trips/[id]/page.tsx"]
---

# Authenticated app shell — Expedition Dossier

Scope: `app/[locale]/(main)/layout.tsx` and every surface inside it (feed, trip detail, private-plan workspace, agency panel, admin, forms). Visitor mode: Operate. Audience: signed-in local organizers, tour buyers, agency staff, platform admin. Task: let someone find a trip, read one as a single object, and act on it — RSVP, chat, pack, split, check in, pay — without the product ever feeling like five pages that share a URL prefix.

This brief governs the *app*. The home page has its own brief (`app-locale-page-tsx`), which inherits this world but keeps its own Persuade composition.

## Direction contract

THESIS: Every trip is a physical case folder with real cut tabs, and the app shell is the rail those folders hang in. It refuses the arrangement every trip app and dashboard ships — a top bar over one scrolling plane of identical rounded cards, where a trip's itinerary, chat, packing list and expenses are separate pages that merely share a URL prefix.

OWN-WORLD: Cordillera, unchanged in palette and voice. Forest green (600/700) as the structural ground; dawn orange (500) scarce and spent only on the single primary action of a surface; warm sand paper (#fbf8f2) as the only page ground — a cool white or neutral gray anywhere is a bug. Crisp field-guide geometry (user-confirmed durable change, replacing the previous 18–24px soft-card system): panels at 6px, separation by hairline and ground-tint step rather than shadow, pill radius reserved for buttons, chips and avatars. Schibsted Grotesk display over Work Sans body, with an uppercase wide-tracked micro-label above every region. The ridgeline is the one drawing this product owns. Folder vocabulary throughout: manila-tinted faces, tabs cut into the top edge, the active tab joined to its face with no line between them, inactive tabs recessed and darker.

STORY: A signed-in user sees a rail of the places they can be, pulls one folder, and reads a trip as one object — case label, status stamp, tabs. Moving from a trip's itinerary to its chat is leafing through the same folder, not navigating to another page; the identity of the thing being read never reloads. They act from inside the folder, and the primary action is always the one dawn-colored thing on screen.

FIRST VIEWPORT: A persistent left folder rail (icon + label, forest ground, active item marked by a dawn edge and a lighter face) holding the top-level destinations: Feed, My Trips, Agencies, Admin where permitted, with the notification bell and account at its foot. On a phone the rail becomes a bottom tab bar, and the folder tab strip scrolls horizontally rather than wrapping. The content plane is a single folder face on warm paper whose tab strip runs along its top edge; the active tab joins the face seamlessly while inactive tabs sit recessed a step darker on the sand ramp. A trip's title is set on the face as a case label with its status stamped beside it in the micro caps. The primary action sits top-right of the folder face, in dawn, alone.

FORM: Expedition Dossier — index 7 of 7 on my own ordered list of derived structures, the lowest-ranked candidate I produced. The roll dealt 3/7/2 with index 3 (Base-Camp Bands) leading, and the user locked index 7 over both the lead and my top-ranked candidate (Field-Guide Spread). Seed key `7902b9f6`, scope surface, mode operate. Code-led build: no image generation exists in this session, so there is no comp and no apology for one — the ambition lives in the FIRST VIEWPORT block and the signature interaction below, which the finish reviewer audits in behavior.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Signature interaction

Leafing. Switching a trip's tab does not navigate the page identity: the folder face stays, the tab joins, and the content cross-fades with a 180ms rise while the case label and status stamp hold still. The tab strip is the only thing that moves. Under `prefers-reduced-motion` the cross-fade becomes an instant swap and nothing translates.

## Constraints (confirmed with the user)

- Function is untouchable; every visual and structural decision is open. Every RLS-gated capability in `docs/frontend-migration-reference.md` §1/§2 must stay reachable, and §5's non-negotiables bind this build in full — both halves of the SINPE evidence flow, no edit affordance where RLS forbids editing, private plans invisible (not 403) to non-members, draft tours and unapproved agencies invisible to the public, multi-date tours as genuinely separate bookings.
- Bilingual es/en via `next-intl`, `es` default, every route under `/[locale]/...`. Badge labels stay localized as data columns, not message keys.
- CRC integers everywhere money is stored or entered; no currency conversion state.
- Do not assume payment capture, recurrence, QR check-in, push/email notifications, or reminders exist — none are built.

## Unresolved

- Whether the folder tab strip survives on the busiest surface (a private plan carries itinerary, chat, packing, expenses, polls, documents and members). If the strip wraps to two rows it stops reading as a folder; scroll-or-collapse is the stated risk on the locked card and is the first thing to test at 390px.
