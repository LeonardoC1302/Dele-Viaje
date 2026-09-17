# Dele Viaje — Design & UI System (Taste)

**This is a MANDATORY process rule:** the installed skill **`design-taste-frontend`** ("Taste", from `.agents/skills/design-taste-frontend/SKILL.md`) is loaded **before creating or changing any UI** — every screen, component, route, or visual change. It defines *how good looks* here.

This file records the project's locked design decisions so they stay consistent outside a single agent run.

---

## ✅ 1. LOCKED DESIGN READ (Phase 0 — Finalized)

> *"Reading this as: consumer marketplace for Costa Rican explorers (hikers + tourists + agencies), with an adventure/outdoor brand personality, leaning toward warm-accessible outdoor language, system-forward + motion-moderate."*

**Rationale:** Dele Viaje serves dual audiences (social explorers + tourists) + agencies. Vibe is outdoor, human, adventurous — NOT resort-luxury. Forest green + Geist embodies this: lush (Costa Rican), confident (explorer-facing), modern (platform).

---

## ✅ 2. LOCKED DIALS (per surface) — Phase 0 Finalized

| Surface | VARIANCE | MOTION | DENSITY | Notes |
|---|---|---|---|---|
| Landing / marketing | 7 | 5 | 3 | Parallax hero, spacious, brand moment |
| Feed / discovery | 6 | 4 | 5 | Cards breathe, subtle transitions, readable |
| Trip detail | 6 | 4 | 4 | Photos + text, balanced, engaging |
| Private plan workspace | 5 | 3 | 5 | Collaborative, focused, minimal motion |
| Agency panel | 4 | 2 | 7 | Data-forward, professional, restrained |
| Super-admin | 3 | 2 | 8 | Tables, metrics, minimal decoration |
| Chat | 4 | 3 | 6 | Conversational, live updates, readable |
| Onboarding | 5 | 4 | 3 | Welcoming, guided, spacious |

**Dial Strategy:** High variance on marketing (landing attracts), medium on discovery/core features, low on admin/panel (information hierarchy). Motion on hero + discovery (engagement), restrained on work surfaces (focus). Density inverse to motion.

---

## ✅ 3. LOCKED DESIGN TOKENS — Phase 0 Finalized

### **A. Accent Color: Forest Green**
- **Primary:** `#1B4332` (deep forest, lush, trustworthy)
- **Light variant:** `#2D6A4F` (interactive states, hover)
- **Dark variant:** `#081C15` (minimal use, strong contrast)
- **Rationale:** Costa Rica = lush forests. Green signals adventure + trust. Avoids AI-purple default.

### **B. Display Typography: Geist**
- **Font family:** Geist (via `next/font/geist`)
- **Used for:** Headlines, CTAs, brand moments
- **Fallback:** system sans
- **Rationale:** Modern, confident, perfect for explorer + agency messaging. Pairs well with body copy.

### **C. Corner Radius (SHAPE CONSISTENCY LOCK)**
- **Cards / containers:** `16px` (soft, friendly, outdoor)
- **Buttons / CTAs:** `100%` (pill, modern, playful)
- **Inputs / form elements:** `8px` (subtle, restrained, usable)
- **Rationale:** One scale across entire project. No mixing.

### **D. Icon System**
- **Library:** `@phosphor-icons/react` (already installed)
- **Global:** `strokeWidth={1.5}` for all icons
- **No lucide, no hand-rolled SVGs**
- **Rationale:** Consistent, professional, outdoor-friendly glyph set.

### **E. Theme (Light + Dark)**
- **Light mode:** Off-white (`#FAFAF8`) background, Forest Green accents, charcoal text
- **Dark mode:** Off-black (`#0F0F0E`) background, Forest Green accents (lighter variant), off-white text
- **Respect:** `prefers-color-scheme` by default; manual toggle optional
- **Contrast:** WCAG AA minimum (AAA for hero)
- **Rationale:** Both modes required; no light-only or dark-only shipping.

---

## 4. Process (run for every UI task)

1. Load the skill (`.agents/skills/design-taste-frontend/SKILL.md`).
2. Confirm **Design Read** before coding (see §1 — already locked).
3. Verify **dials** for the surface (see §2 — refer to table above).
4. Use **locked tokens** (§3) in all components — no overrides.
5. Code following the skill's rules + ship ready for its pre-flight checks.

## 5. Architecture & Conventions (Taste §3 — Locked for Dele Viaje)

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind v4
- **State:** Zustand or React Context for deep prop drilling; `useState` for local UI
- **Animation:** Motion (`motion/react`) for UI, GSAP + ScrollTrigger for scroll-driven (landing hero)
- **Fonts:** `next/font` only; never external `<link>`
- **Icons:** Phosphor React, `strokeWidth: 1.5` globally
- **Emoji policy:** Discouraged; use icon glyphs instead
- **Responsiveness:** `max-w-[1400px] mx-auto`, `min-h-[100dvh]` (not `h-screen`), CSS Grid over flex-math

## 6. Hard Rules That Always Apply (Non-Negotiable)

- ✅ **No em-dashes** (`—`) anywhere — zero, ever (Taste §9.G, most-violated Tell)
- ✅ **One accent color locked** — Forest Green used identically on all sections
- ✅ **No AI tells:** no Inter-by-default, no AI-purple, no three-equal-cards, no "Jane Doe", no "Quietly trusted by"
- ✅ **Button contrast check:** WCAG AA (4.5:1 text-to-bg ratio) every CTA
- ✅ **CTA button wrap ban:** text fits ONE line at desktop, ≤ 3 words
- ✅ **Hero discipline:** min-h-[100dvh], headline ≤ 2 lines, subtext ≤ 20 words, ≤ 4 text elements, `pt-max-24`
- ✅ **Eyebrow restraint:** max 1 per 3 sections (mechanical pre-flight check)
- ✅ **Empty/loading/error states:** every list/form implements all three; skeletons match layout
- ✅ **Motion motivated:** every animation justified in one sentence (hierarchy/storytelling/feedback/state change)
- ✅ **Prefers-reduced-motion:** all motion `INTENSITY > 3` respects this; parallax → static
- ✅ **Dark mode parity:** page tested in both light + dark before ship
- ✅ **Real images only:** no div-based fake screenshots, no hand-rolled decorative SVGs, no pure-text minimalism

---

## 7. Component System (components/ui/)

Base component set built with Tailwind v4 + locked tokens. All components:
- Use Forest Green for interactive states
- Respect `prefers-color-scheme` and `prefers-reduced-motion`
- Built with Radix UI primitives where sensible (a11y, keyboard nav)
- Consistent corner-radius scale
- WCAG AA contrast minimum

**Components (Phase 0):**
- Button (primary, secondary, ghost, loading states)
- Input (text, email, password, with label + helper text)
- Card (with variants: minimal, elevated, interactive)
- Avatar (with fallback initials)
- Badge (status, category)
- Skeleton (shimmer, matching layout)
- Toast (success, error, info, warning)
- Tabs (underline, pill variants)
- Modal / Dialog (with backdrop blur)
- Checkbox / Radio
- Data Table (for panels)

---

## 8. Brand Direction (Finalized)

- **Vibe:** outdoors, adventurous, human, genuinely Costa Rican.
- **Palette:** Forest Green (`#1B4332`) + neutral zinc/stone + off-white/off-black. One accent, locked.
- **Typography:** Geist display + system sans body; mono only for data.
- **Icons:** Phosphor React, `strokeWidth: 1.5`.
- **Shape:** Cards 16px, buttons pill, inputs 8px.
- **Theme:** Light + dark, respect `prefers-color-scheme`, WCAG AA+.
- **Banned tokens:** beige/cream + brass (premium-consumer AI default), AI-purple gradients, glassmorphism everywhere, Inter-by-default, Fraunces/Instrument_Serif, em-dashes, emojis as design.

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