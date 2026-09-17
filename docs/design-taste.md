# Dele Viaje — Design & UI System (Taste)

**This is a MANDATORY process rule:** the installed skill **`design-taste-frontend`** ("Taste", from `Leonxlnx/taste-skill`) is loaded **before creating or changing any UI** — every screen, component, route, or visual change. It defines *how good looks* here.

This file records the project's locked design decisions so they stay consistent outside a single agent run.

---

## 1. Process (run for every UI task)

1. Load the skill (`.agents/skills/design-taste-frontend/SKILL.md`).
2. State the one-line **Design Read** before coding:
   > *"Reading this as: consumer marketplace for Costa Rican explorers (hikers + tourists) + craft out-of-doors brand, premium-but-friendly outdoor language, leaning toward [system/aesthetic]."*
3. Set the **3 dials** for the surface and log them (below).
4. Code following the skill's rules + ship ready for its pre-flight checks.

## 2. Locked Dials (per surface)

| Surface | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| Landing / marketing | 7 | 7 | 3 |
| Feed / discovery | 6 | 4 | 5 |
| Trip detail | 6 | 4 | 4 |
| Private plan workspace | 5 | 3 | 5 |
| Agency panel | 4 | 2 | 7 |
| Super-admin | 3 | 2 | 8 |
| Chat | 4 | 3 | 6 |
| Onboarding | 5 | 4 | 3 |

Rule: when in doubt default to `8 / 6 / 4` for consumer, drop density up for panels/tables.

## 3. Brand Direction (draft — refine in Phase 0 with Taste)

- **Vibe:** outdoors, adventurous, human, genuinely Costa Rican — not resort-luxury, not stocky "mountain bro".
- **Language tokens to avoid:** beige/cream + brass "premium consumer" palette (banned family), AI-purple gradients, glassmorphism everywhere, Inter-by-default, Fraunces/Instrument_Serif, emojis as design.
- **Palette (seed, not final):** one saturated outdoor accent (e.g. deep forest green or electric trail orange) + neutral zinc/stone + off-white/off-black. **One accent, one palette, locked per project** (skill §4.2 / §8).
- **Typography:** brand-appropriate sans display (e.g. `Outfit` / `Geist` / `Satoshi` — decide in Phase 0) via `next/font`; mono only for data/numeric density in panels. No serif as default.
- **Icons:** single family `@phosphor-icons/react`; **no lucide, no hand-rolled SVG glyphs**; global `strokeWidth` (1.5).
- **Shape:** one corner-radius scale locked project-wide (SHAPE CONSISTENCY LOCK) — proposal: cards 16px, buttons pill, inputs 8px — final in Phase 0.
- **Theme:** light + dark from day 1, respect `prefers-color-scheme`, hierarchy parity, WCAG AA (AAA for hero).

## 4. Hard Rules That Always Apply (minimum set)

- **Contrast & a11y:** every CTA/input/form passes WCAG AA; button text readable; no white-on-white.
- **CTA discipline:** ≤3-word primary label, one line, no duplicate CTA intents per page.
- **Hero discipline:** fits the viewport, `min-h-[100dvh]`, headline ≤ 2 lines, subtext ≤ 20 words, max 4 text elements.
- **Eyebrows:** ≤ 1 per 3 sections (mechanical pre-flight count).
- **Empty/loading/error states:** every list/form implements all three; skeletons matching layout, no generic spinners.
- **Motion:** motivated only; `prefers-reduced-motion` respected; animate transform/opacity only; no `window scroll` listeners.
- **Homepage nature parallax (GSAP ScrollTrigger, decorative-only):** hero foliage/leaf layers move at distinct scroll speeds — `aria-hidden`, behind content, pointer-events-none; **never on text/CTAs**; client island only (`useGSAP`, no `window` at module scope); `prefers-reduced-motion` → all layers static. Parallax is decoration, not interaction — no scroll-jacking.
- **Grid not flex-math**; `max-w-[1400px] mx-auto` page shell; explicit `< 768px` collapse per section.
- **Copy self-audit** before shipping any string (skill §4.9): no AI-cute copy, no fake-precise numbers unlabeled as mock.
- **No emojis** unless a playful/social surface explicitly gets sign-off; icon glyphs instead.

## 5. Component Notes (Phase 0 to codify)

- `components/ui`: the Taste-styled base set (button, input, card, sheet, skeleton, toast, tabs, avatar, badge, modal, checkbox, data-table for panels).
- Panels/tables: pilot the skill's data-density guidance — no endless `border-b` rows; group metrics, cards-per-spec, mono numerals.
- Existing `app/globals.css` re-authored under the phase-0 token system (Tailwind v4 theme vars).

## 6. Definition of "Needs Design Sign-off"

Bigger UX moments (feed layout, trip card, workspace navigation, onboarding story, agency panel IA) get a short Taste design read written down (2–4 lines) before implementation and a pre-flight checklist pass after — tracked in the PR description.