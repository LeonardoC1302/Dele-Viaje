# Dele Viaje — project status

A ground-up rebuild of the frontend. The database, the API surface, and
every feature are carried over unchanged; the entire presentation layer
is new.

The previous app lives at `../trip-planner` and is kept as reference and
anti-reference. Nothing visual was inherited from it.

---

## Why this repo exists

Two rounds of incremental restyling on the old app (token swaps, accent
colors, icon labels) were judged by the product owner as "no major
changes to the interface." The conclusion was that a visual system can't
be refactored into existence one utility class at a time — the
composition itself had to change. So the presentation layer was rebuilt
from scratch against a locked visual world, and the backend was ported
verbatim.

## What was ported vs. rebuilt

| Layer | Decision |
|---|---|
| 32 SQL migrations (`supabase/migrations/`) | **Ported verbatim.** Same Supabase project, zero schema risk. |
| 30 API route handlers (`app/api/**`) | **Ported verbatim.** No design in them; already correct against the RLS policies. |
| `lib/` — Supabase clients, zod validators, geo, formatting | **Ported verbatim.** |
| `i18n/`, `messages/` | **Ported**, then extended with new keys for the new surfaces. |
| Design tokens, every page, every component | **Rebuilt.** |

Porting the backend was an explicit product-owner decision: rebuilding
route handlers would have re-introduced risk on already-solved problems
(the RLS recursion crash, seat-admission races, waitlist ordering) with
no visual payoff.

---

## The design system: Cordillera / Expedition Dossier

The visual world ("Cordillera") was chosen by the product owner in an
earlier round. The *composition* — how the app is structured — was
chosen in a surface-scope round (seed `7902b9f6`, mode `operate`) from
three dealt options.

The locked direction is **Expedition Dossier**: every trip is a case
folder with real cut tabs, and the app shell is the rail those folders
hang in. Notably this was index 7 of 7 on the build thread's own ranked
list — its weakest candidate. The roll dealt it, the owner picked it
over both the dealt lead and the build thread's own top pick.

Full direction contracts (development-only, never shipped to the
browser):

- `.impeccable/surfaces/app-locale-main-layout-tsx.md` — the app shell
  and every signed-in surface.
- `.impeccable/surfaces/app-locale-page-tsx.md` — the home page, which
  inherits the shell's world but keeps its own Persuade composition.

### The three load-bearing decisions

Changing any one of these changes the character of the whole app:

1. **The page is warm paper, never cool gray-white.** `sand` replaces
   `neutral` entirely as the surface and text family. A neutral gray
   anywhere is a bug.
2. **Geometry is crisp.** Panels sit at 6px; radii top out at 14px. The
   pill radius is reserved for genuinely pill-shaped things (buttons,
   chips, avatars) so roundness stays meaningful. This replaced the
   original Cordillera contract's 18–24px soft cards — a durable system
   change, confirmed by the product owner.
3. **Depth comes from tint, not shadow.** Surfaces separate by moving
   along the sand ramp. The shadow scale exists only for things that
   genuinely leave the page plane (popovers, dialogs).

Plus one scarcity rule: **dawn orange marks exactly one primary action
per surface.** If two things on a screen are dawn, one of them is wrong.

### Signature pieces

- `components/cordillera/ridgeline.tsx` — the one drawing the product
  owns. Three profiles, three grounds. Read the tone docs before using
  it on a colored band; `forest-700` and `forest-800` are both
  near-black and a dark ridge on a dark band renders as nothing.
- `components/cordillera/folder.tsx` — `Dossier`, `CaseHeader`,
  `StatusStamp`, `FolderTabs`, `FolderFace`, `Leaf`, `PageBody`. The
  seam between the active tab and the face is the entire illusion.
- `components/app-shell/folder-rail.tsx` — the rail on desktop, a bottom
  tab bar on a phone.

---

## Verification status

Green: `tsc --noEmit`, `eslint .`, `vitest run` (15/15), `impeccable
detect --json` (clean across the whole project), `next build`. Message
catalogs are at key parity: 607 keys in each of `es` and `en`.

### Finish review

Three rounds with the Impeccable finish reviewer, final disposition
**ship**. What that covers, stated precisely because it is narrower than
"the app is approved": the dawn hierarchy on home / feed / trip detail,
the on-world map style, the removal of the eyebrow class, the
how-it-works rebuild, the leafing interaction, the mobile case header,
and the tab-strip edge.

It is **not** a whole-surface clearance. The private-plan workspace, the
agency panel, the admin folders, chat, and every other signed-in state
were never captured and were never in the review matrix.

Round two's fixes introduced three regressions of their own (the mobile
case header stack, the feed title wrap, an inconsistent section rule),
all caught by the reviewer and fixed in round three — worth knowing
before assuming a fix here is free.

### Known environment trap — read before debugging "broken" interactivity

**In this environment the in-app Browser pane blocks the Turbopack HMR
websocket, which stalls client hydration in `next dev`.** Symptoms: the
map never mounts, entrance animations never run, nav links have no React
internals attached. This is *not* an app defect — the same pages hydrate
correctly under `next build && next start`.

Consequence: **verify interactivity against the production build**, not
the dev server. `scripts/capture-review.mjs` captures review screenshots
and is written to run against `next start` for exactly this reason.

### Not yet verified

- The private-plan workspace at phone width with its full seven-tab
  strip. The strip's behavior was verified at 375px with 8 synthetic
  tabs (one row, no wrap, scrolls internally, no horizontal page
  scroll), but the live workspace needs a signed-in account with a
  private plan and has not been exercised.
- Any flow requiring an authenticated session: joining, chat, the SINPE
  payment evidence round trip, agency panel, admin queues.

---

## Non-negotiables carried forward

`../trip-planner/docs/frontend-migration-reference.md` §5 binds this
build in full. In particular: both halves of the SINPE evidence flow,
no edit affordance where RLS forbids editing, private plans invisible
(not 403) to non-members, draft tours and unapproved agencies invisible
to the public, multi-date tours as genuinely separate bookings, and
bilingual es/en with `es` as default.

## Setup

Copy `.env.example` to `.env.local` and fill it — the variables are
identical to the previous app, and it points at the same Supabase
project.

```bash
pnpm install
pnpm dev
```
