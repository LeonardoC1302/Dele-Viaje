---
name: Dele Viaje
description: A Costa Rican field dossier — warm paper, cloud-forest green, and one line of dawn.
colors:
  cloud-forest: "#1B4332"
  cloud-forest-live: "#2D6A4F"
  cloud-forest-night: "#081C15"
  cloud-forest-lit: "#4FB096"
  dawn: "#E8823C"
  dawn-risen: "#ED8F47"
  dawn-deep: "#CF6A28"
  dawn-wash: "#FBE4CD"
  lowland-page: "#FBF8F2"
  manila-face: "#FFFDF7"
  pressed-well: "#F5F0E6"
  hairline: "#EAE2D3"
  hairline-strong: "#D9CDB8"
  ink: "#1A1611"
  ink-muted: "#6B5D47"
  ink-faint: "#8E7E64"
  night-page: "#100D0A"
  night-face: "#1A1611"
  alarm: "#B91C1C"
typography:
  display:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "5rem"
    fontWeight: 800
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.375
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "Schibsted Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  none: "0px"
  sm: "3px"
  panel: "6px"
  lg: "10px"
  xl: "14px"
  pill: "9999px"
spacing:
  hairline-pad: "10px"
  tight: "12px"
  face-pad: "20px"
  face-pad-wide: "28px"
  gutter: "16px"
  gutter-wide: "28px"
components:
  button-primary:
    backgroundColor: "{colors.dawn}"
    textColor: "#100D0A"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.dawn-risen}"
  button-secondary:
    backgroundColor: "{colors.cloud-forest}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.cloud-forest-live}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "#2E2720"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#4C4132"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  folder-face:
    backgroundColor: "{colors.manila-face}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  folder-tab-active:
    backgroundColor: "{colors.manila-face}"
    textColor: "#1A1611"
    rounded: "6px 6px 0 0"
    padding: "10px 16px"
  folder-tab-rest:
    backgroundColor: "#F5F0E6"
    textColor: "{colors.ink-muted}"
    rounded: "6px 6px 0 0"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.pressed-well}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "8px 12px"
    height: "40px"
  chip-rest:
    backgroundColor: "{colors.manila-face}"
    textColor: "#4C4132"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-selected:
    backgroundColor: "{colors.cloud-forest}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  status-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.cloud-forest}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  rail:
    backgroundColor: "{colors.cloud-forest-night}"
    textColor: "#FFFFFF"
    width: "228px"
---

# Design System: Dele Viaje

## Overview

**Creative North Star: "The Expedition Dossier"**

Dele Viaje is a case file for a mountain, not a dashboard. Every signed-in surface is a folder: a case label with a status stamp at the top, tabs cut into the folder's edge, and a manila-tinted face you read the contents on. The organizing metaphor underneath the palette is *altitude* — a Costa Rican cordillera stacks readable bands as you climb, and the system uses exactly three of them: sun-bleached lowland paper, the dark band of cloud forest, and the thin line of dawn that hits the ridge first.

The density is working-document density, not marketing density. Type is set tight and structural; the uppercase wide-tracked micro-label over a hairline is the repeating unit that makes an expenses panel, a waitlist roster and an admin queue read as the same product. The one drawing the product owns is the ridgeline, in three genuinely different profiles, appearing at the foot of the hero, along page headers, behind empty states, and signing off the rail.

The confirmed anti-reference is the generic trip-app grid: uniform rounded white boxes on cool gray, each with a soft drop shadow. This system rejects all three parts of that. The page is warm paper, never a cool white; the geometry is crisp field-guide geometry with panels at 6px; and depth comes from moving along the sand ramp rather than from casting a shadow.

**Key Characteristics:**
- Warm paper ground in both light and dark — dark mode is nightfall on the same mountain, not an inversion
- Crisp geometry: panels at 6px, radii top out at 14px, pill reserved for buttons, chips and avatars
- Depth by tint, not shadow; the two-entry shadow scale is for things that genuinely leave the page plane
- Exactly one dawn-colored element per surface
- The folder seam: an active tab that erases the face's top border and becomes one sheet with it
- Micro-label over a hairline as the universal panel heading
- 180ms opacity-only leafing when a tab changes; the face holds still

## Colors

Three families and nothing else: cloud forest, dawn, and the warm sand that replaces neutral entirely.

### Primary
- **Cloud Forest** (`{colors.cloud-forest}`): The brand green and the structural color. It is the rail's neighbor, the secondary button fill, the selected filter chip, the `go` status stamp, and the front range of every ridgeline on paper. Strong, repeatable, structural — it is allowed to appear many times on a surface.
- **Cloud Forest Live** (`{colors.cloud-forest-live}`): The interactive variant — hover on secondary buttons, the mid-range ridge, the input focus border.
- **Cloud Forest Night** (`{colors.cloud-forest-night}`): The rail and mobile bar ground. Near-black green; it reads as the dark band of forest the folders hang in.
- **Cloud Forest Lit** (`{colors.cloud-forest-lit}`): The dark-mode brand. Green has to lighten at night or it reads as black.

### Secondary
- **Dawn** (`{colors.dawn}`): The only warm accent and the scarcest token in the system. It marks the single most important action on a surface: the primary button, the create-trip control in the rail, the active-item edge in the rail, the focus ring, the sun in the ridgeline, and the peak mark. Nothing else.
- **Dawn Risen** (`{colors.dawn-risen}`) / **Dawn Deep** (`{colors.dawn-deep}`): Hover lift and the `hold` status stamp respectively.
- **Dawn Wash** (`{colors.dawn-wash}`): The only tinted-fill use of dawn — quiet classification badges, where it carries no action.

### Neutral
- **Lowland Page** (`{colors.lowland-page}`): The page ground in light mode. Sun-bleached paper.
- **Manila Face** (`{colors.manila-face}`): The folder face — every panel, card, dialog, popover and active tab. Manila-tinted rather than white, because a pure white panel on warm paper reads as a hole punched in the page rather than a sheet laid on it.
- **Pressed Well** (`{colors.pressed-well}`): A step *down* the ramp. Inputs, code, inactive tabs, skeleton ground. A field is pressed into the sheet, not floating on it.
- **Hairline** (`{colors.hairline}`) and **Hairline Strong** (`{colors.hairline-strong}`): Two different edges doing two different jobs. Hairline is the panel edge — folder faces, cards, `Leaf` and `PanelHeading` rules, card footers. Hairline Strong is the *control* edge — inputs, chips, segmented controls, outline buttons, the stamp on an inert record.
- **Ink** / **Ink Muted** / **Ink Faint** (`{colors.ink}`, `{colors.ink-muted}`, `{colors.ink-faint}`): The text ramp, all warm. Body copy on this paper reads like ink rather than like a system dialog. Ink Faint is the micro-label's color.
- **Night Page** / **Night Face** (`{colors.night-page}`, `{colors.night-face}`): The dark-mode pair. Both sit on the sand ramp's dark end, not on neutral gray.

### Exception
- **Alarm** (`{colors.alarm}`): Destructive buttons, field error text and the `void` status stamp use a stock red. This is the one hue in the shipped build from outside the three families; it is recorded as an inherited exception scoped strictly to destructive and error states, not as a fourth family to extend.

### Named Rules

**The Warm Paper Rule.** Sand is the only surface and text family. A cool white, a neutral gray, or a stock Tailwind `gray`/`slate`/`zinc` anywhere in the UI is a bug, not a variation. Audit test: sample any background or body-text color on any surface; it must carry a warm cast.

**The One Dawn Rule.** Dawn marks exactly one primary action per surface. Two dawn elements on a screen means one of them is wrong. Two corollaries the finish review enforced: a selected filter chip is not an action, so it goes cloud forest; and a headline emphasis in dawn is one word, never a whole clause, so the call to action stays the larger dawn mass on the page.

**The One-Ramp Categories Rule.** Category colors — all eight — are steps on the forest or dawn ramp, never new hues. A feed reads as varied because its tabs differ in depth and warmth, not because it has become a rainbow.

## Typography

**Display Font:** Schibsted Grotesk (with `ui-sans-serif`, `system-ui` fallback)
**Body Font:** Work Sans (with `ui-sans-serif`, `system-ui` fallback)

**Character:** Two faces split by job rather than by page. Schibsted Grotesk is the voice of the product — headings, buttons, nav, tabs, micro-labels, anything the eye lands on first. Work Sans is the voice of the content — body copy, descriptions, form values. The pairing is plain and sturdy rather than expressive; the field-guide personality comes from the tracking and the hairlines, not from the letterforms.

The display face is applied by tag, so a heading is correct by default; `font-display` is only needed on things that want the product voice without being a heading.

### Hierarchy
- **Display** (800, `2.75rem` → `3.75rem` → `5rem` at the `display-md`/`lg`/`xl` steps, line-height 1.04 → 0.96, tracking -0.03em → -0.04em): The home hero headline only. It climbs by breakpoint on one element.
- **Headline** (800, `2rem`, line-height 1.08, tracking -0.025em): The `display-sm` step. Every case label and every section title inside the product.
- **Title** (700, `1.0625rem`, line-height snug): Card titles, the rail wordmark. Set in the display face.
- **Body** (400, `1rem`, relaxed line-height): Descriptions and copy, capped at `64ch` on a case-header description and `65ch` generally.
- **Label** (600, `0.6875rem`, tracking 0.14em, uppercase): The micro-label. Panel headings, field labels, status stamps, card tabs, data-column heads.

### Named Rules

**The Micro-Label-Is-The-Heading Rule.** The uppercase wide-tracked label is never decoration sitting above something else — it *is* the heading, set over its own hairline (`Leaf`, `PanelHeading`). That is its only structural use.

**The No-Eyebrow Rule.** No kicker, eyebrow or tracked-caps label sits above a title anywhere. The `eyebrow` prop was removed from `CaseHeader` and `AuthPanel` so it cannot return. Two exemptions, both carrying data rather than restating the page: the trip card's cut category tab, and the micro-label heading above. Footer column labels are list-group labels and are also fine.

**The Tabular Digits Rule.** Anything where digits stack in a column — prices, counts, times — takes `.tnum`. Proportional digits make a column of numbers look ragged.

## Layout

A fixed 228px cloud-forest rail on the left at `lg` and up, with the content plane beside it; below `lg` the rail becomes a bottom bar with the same items, same active marking, thumb-reachable, padded by `env(safe-area-inset-bottom)`. This is the most load-bearing structural decision in the system: a persistent rail gives the product a fixed place to stand while the folder face changes, which is what lets a trip read as one object rather than a series of pages.

Every surface inside the shell uses one page gutter (`PageBody`): a `1240px` max-width column, `16px` horizontal padding and `32px` vertical on phone, `28px`/`40px` from `sm` up. Content columns line up page to page and the rail never accounts for per-page padding.

Folder faces pad at `20px`, `28px` from `sm`. The spacing rhythm is 4px-based and habitually lands on 10px (hairline underlines), 12px, 16px, 20px, 28px.

The case header reflows rather than compressing: below `sm` the case label takes the full width and the single primary action drops to its own full-width row. A primary button beside the label is right on desktop and wrong at 390px, where it squeezes the title into three lines.

Tab strips scroll horizontally and never wrap. A wrapped second row stops reading as a folder and starts reading as a broken toolbar. The strip's right edge fades into the page ground over 32px so a clipped tab reads as "there is more" rather than as broken layout.

## Elevation & Depth

This system is flat by construction. Surfaces separate by **moving along the sand ramp**: the page is lowland paper, a folder face is manila one step up, an input is a pressed well one step down. There is no resting shadow anywhere on a panel, card, button or chip.

The two-entry shadow scale exists only for elements that genuinely leave the page plane, and the shipped build uses it in exactly three places: the popover, the dialog, and the iOS install hint.

### Shadow Vocabulary
- **Pop** (`box-shadow: 0 1px 2px 0 rgb(26 22 17 / 0.06), 0 8px 24px -8px rgb(26 22 17 / 0.18)`): Transient overlays anchored to a trigger — popovers, the floating install hint.
- **Lift** (`box-shadow: 0 2px 4px 0 rgb(26 22 17 / 0.06), 0 16px 40px -12px rgb(26 22 17 / 0.24)`): Modal dialogs, the only thing that leaves the plane entirely.

Both shadows are tinted with the ink color, not black, so they stay in the warm world.

### Named Rules

**The Tint-Not-Shadow Rule.** If an element is still part of the page, it separates by tint. If it can be dismissed, it may cast. A shadowed pill on warm paper is the generic-SaaS tell this system exists to remove.

**The Focus Ring Rule.** One ring definition, dawn, 2px at 2px offset, so focus looks identical on every control. Inputs additionally shift their border to cloud forest and carry a 2px translucent forest ring.

**The Canvas Rule.** A surface painted to a canvas cannot read the CSS custom properties, so it gets its palette handed to it in JS and must theme itself explicitly. The maps are the only such surface: `lib/map-style.ts` carries a light and a dark token set — the dark one is the same mountain at night, keeping the ground on the warm end of the sand ramp and water/parks on forest rather than going neutral black — and the three map components read `useColorScheme()` and rebuild when the scheme flips. MapLibre's own controls are DOM rather than canvas and are overridden in `globals.css`; its control glyphs are black PNGs, so dark mode inverts them via `--map-icon-filter`. A light map left on a dark page reads as a hole cut in the sheet, which is the specific failure this rule exists to prevent.

## Shapes

Field-guide geometry: a field guide has square pages. Panels, faces, cards, dialogs, popovers and inputs all sit at the 6px panel radius. The scale runs 0 / 3px / 6px / 10px / 14px and stops — 14px is the ceiling, and it is rare.

The pill radius is reserved for three genuinely pill-shaped things — buttons, chips and avatars — which is what keeps roundness meaningful instead of ambient. Nothing else in the system is a pill.

Borders do the structural work radius would do in a softer system. Every face and card carries a 1px hairline; every control carries the stronger hairline. Status stamps are outlined, never filled, because a case file is stamped in outline and because an outline keeps the one filled dawn thing on the surface unambiguously the primary action.

Corners break the rule only to serve the seam: a face that sits under a tab strip squares its top-left corner (`rounded-b-md rounded-tr-md`) so the strip's first tab meets it flush. The trip card uses the same corner geometry at miniature scale.

The one recurring silhouette is the ridgeline, drawn in a 1200x220 box, closed along the bottom edge, in three profiles — `cordillera` (tall central peak, long tail), `valle` (low and wide, for shallow bands), `volcan` (a single dominant cone, for square-ish areas) — and three grounds (`forest` on paper, `deep` on a forest-600 band, `onDark` translucent white). It crops from the bottom (`xMidYMin slice`) so peaks and sun survive any aspect ratio. Every graphic in the build is inline SVG; no rasters ship.

## Components

### Buttons
- **Shape:** Full pill (`{rounded.pill}`), heights `32/36/40/44/48px` across the size scale, set in the display face at 600 weight.
- **Primary:** Dawn fill with near-black ink text. One per surface.
- **Secondary (the default variant):** Cloud forest fill, white text. Structural and repeatable — most buttons in the product are this.
- **Outline / Ghost:** Control-edge hairline on transparent, or bare ink with a sand hover wash. Everything else.
- **Hover / Focus:** Color transition only, never a lift or a shadow. Focus is the dawn ring at 2px offset against the page ground.
- **Loading:** A 16px current-color spinner ahead of the label; the button holds its width.

### Chips
- **Style:** Pill, control-edge hairline on the folder face, display face at 600.
- **State:** Selected default chips fill cloud forest with white text. The `accent` tone exists for exactly one chip in a row (the Verified credential filter), which fills dawn. One shared definition covers the category links, the Verified toggle and the Near-me button, so the row cannot drift apart again.

### Badges
- **Style:** Pill, `12px` text at 500. Classification only — category, type, role. A record's *state* is a `StatusStamp`, which is a different job.
- **Semantic variants** stay on the forest/dawn ramps' neighbors rather than reaching for stock greens and ambers; a `green-100` chip next to cloud forest reads as a second, unrelated green.

### Cards / Containers
- **Corner Style:** 6px, or the seam geometry when a tab sits on the top edge.
- **Background:** Manila face on the page ground.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** 1px hairline; hover darkens the border one step rather than lifting the card.
- **Internal Padding:** `16px` on a card, `20px`/`28px` on a folder face.

### Inputs / Fields
- **Style:** Pressed well (a step down the sand ramp from the face), 6px radius, control-edge hairline, `40px` high, `12px` horizontal padding.
- **Label:** The micro-label, so a form region and a data panel are labelled identically. A required marker is a dawn asterisk.
- **Focus:** Border shifts to cloud forest plus a translucent forest ring; no glow, no shadow.
- **Error:** Border and ring go alarm red with `12px` red helper text below; helper text is suppressed while an error shows.

### Navigation
- **Rail (lg+):** Cloud-forest-night ground, wordmark with the peak mark at top, the dawn create-trip pill beneath it, then items in the display face at 600. The active item is pulled forward with a lighter forest face and a 2px dawn left edge, and its Phosphor icon switches to `fill` weight. A `valle` ridgeline in translucent white signs the rail off above the bell and sign-out row.
- **Bottom bar (below lg):** Same items, same ground, same dawn marking rotated to a 2px top edge, `11px` display labels under 21px icons.

### The Folder (signature)
The composition every signed-in surface is built from, in one fixed order: `CaseHeader` (case label, status stamp, single action) → `FolderTabs` → `FolderFace`. The pieces are not independently useful.

**The Seam Rule.** The active tab shares the face's exact background, pulls itself down one pixel (`-mb-px`), and paints its bottom border in the face's own color so it lands on and erases the face's top border. The tab and the face become one continuous sheet. Inactive tabs keep their bottom border and sit a step darker on the sand ramp, reading as sheets behind the front one. `FolderTabs` without a `FolderFace` under it is a row of floating rectangles.

**The Leafing Rule.** Switching a folder tab is a 180ms opacity-only cross-fade (`animate-leaf`). The face, the case label and the status stamp hold still; the tab strip is the only thing that moves. Turning a page inside a folder must not look like a new page arriving, which is exactly what a rise reads as. Entrance animation elsewhere is `fade-rise` (350ms, 6px). Reduced motion is handled globally.

**The Case Label Rule.** `CaseHeader`'s `action` slot takes exactly one control. Where a surface genuinely has a second action, it belongs inside the face near what it acts on, not up beside the primary — the dawn accent only works while it is scarce.

### Trip Card
The dossier language at its smallest scale: a category-colored tab cut into the top edge carrying the category icon and name in micro-label caps, and the card body as the sheet below it, sharing the tab's corner geometry. The tab does real work — category is legible before a word of the title is read, across a whole page of cards. The footer rule is pushed to the card's foot so capacity and price line up across a row regardless of title length.

## Do's and Don'ts

### Do:
- **Do** put every surface and every piece of text on the sand family. Warm paper is the only ground.
- **Do** separate surfaces by moving along the sand ramp: page → manila face up, input well down.
- **Do** give each surface exactly one dawn element, and let it be the action the user came to perform.
- **Do** use the micro-label over a hairline as the heading for every panel, form region and data group.
- **Do** keep panels at 6px and reserve the pill for buttons, chips and avatars.
- **Do** pair every `FolderTabs` with a `FolderFace` so the seam exists.
- **Do** draw new decorative geometry as a `Ridgeline` profile rather than inventing a second motif, and ship graphics as inline SVG.
- **Do** set stacked digits with `.tnum`.
- **Do** keep category colors on the forest and dawn ramps.

### Don't:
- **Don't** introduce a cool white, a neutral gray, or a stock `gray`/`slate`/`zinc` utility anywhere.
- **Don't** put a resting shadow on a panel, card, button or chip. `pop` and `lift` are for overlays only.
- **Don't** place a kicker or eyebrow above a title. The prop was removed so it cannot return.
- **Don't** put two dawn elements on one surface; a selected filter chip is forest, and a headline emphasis is one word, not a clause.
- **Don't** use the control edge (hairline-strong) on a panel, or the panel hairline on a control. They are two intentional, different things.
- **Don't** let a tab strip wrap to a second row; it scrolls.
- **Don't** animate a leaf with translation, or move the face, case label or stamp when a tab changes.
- **Don't** extend the alarm red beyond destructive and error states into a fourth color family.
- **Don't** reach for a radius above 14px; the earlier 18-24px soft-card system was deliberately replaced.

## Coverage

This system was recorded from the shipped artifact after a three-round finish review that ended in **ship**. That disposition covers the fixes scored across those rounds — dawn hierarchy on home, feed and trip detail; the on-world map style; the removal of the eyebrow class; the how-it-works rebuild; leafing; the mobile case header; the tab-strip edge — and is **not** a whole-surface clearance.

Stated gaps, recorded as gaps rather than as finished work:

- **The live private-plan workspace was never captured.** No signed-in session with a private plan exists in this environment. The tab mechanism was measured at 375px with 8 synthetic tabs (one row, no wrap, the strip scrolls internally at scrollWidth 791 against clientWidth 343, and the page itself does not scroll sideways), but the live surface was not seen.
- **The agency panel, admin folders, chat and every other signed-in state were never captured** and were never in the review matrix. The rules above hold for them by construction, not by observation.
- **Environment trap.** In this environment the in-app browser blocks the Turbopack HMR websocket, which stalls client hydration in `next dev` only. Symptoms are a map that never mounts and entrance animations that never run. The same pages hydrate correctly under `next build && next start`. Verify interactivity against the production build; `scripts/capture-review.mjs` runs against `next start` for this reason.
- **No comp and no quality-bar board exist.** This was a code-led round with no image generation available. Evidence lives in `.impeccable/review/`.
