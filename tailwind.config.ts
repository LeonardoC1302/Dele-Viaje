import type { Config } from 'tailwindcss';

/**
 * Cordillera — the design system for Dele Viaje.
 *
 * The organizing idea is *altitude*. A Costa Rican cordillera stacks
 * readable bands as you climb: sun-bleached lowland paper, the dark
 * band of cloud forest, and the thin line of dawn that hits the ridge
 * first. Every token below belongs to one of those three families, and
 * nothing in the UI introduces a hue from outside them.
 *
 * Three decisions distinguish this system from a generic product UI,
 * and they are load-bearing — changing one of them changes the whole
 * character of the app:
 *
 * 1. The page is *warm paper*, never cool gray-white. `sand` is the
 *    surface family. A neutral gray anywhere reads as a bug.
 * 2. Geometry is *crisp*. Radii top out at 14px and panels sit at 6px,
 *    because a field guide has square pages. The pill radius is
 *    reserved for genuinely pill-shaped things (buttons, chips,
 *    avatars) so roundness stays meaningful instead of ambient.
 * 3. Depth comes from *tint*, not shadow. Surfaces separate by moving
 *    along the sand ramp. The shadow scale exists for things that
 *    genuinely float above the page (popovers, dialogs, sticky bars)
 *    and nothing else.
 */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Cloud forest — the primary. Dark, saturated, slightly blue-
         * shifted green. Carried over unchanged from the locked brand
         * scale: 600 is the brand green, 500 the interactive variant.
         */
        forest: {
          50: '#f0f7f4',
          100: '#d9ede8',
          200: '#b3dcd1',
          300: '#81c9b3',
          400: '#4fb096',
          500: '#2D6A4F',
          600: '#1B4332',
          700: '#081C15',
          800: '#040f0a',
          900: '#020705',
          950: '#010402',
        },

        /**
         * Dawn — the light that hits the ridge first. The only warm
         * accent, and deliberately scarce: it marks the single most
         * important action on a surface and nothing else. If two things
         * on a screen are dawn, one of them is wrong.
         */
        dawn: {
          50: '#fdf3ea',
          100: '#fbe4cd',
          200: '#f6c99a',
          300: '#f2a35e',
          400: '#ed8f47',
          500: '#e8823c',
          600: '#cf6a28',
          700: '#a8531f',
          800: '#7d3e18',
          900: '#532910',
          950: '#2f1709',
        },

        /**
         * Sand — the lowland. This replaces `neutral` entirely as the
         * surface and text family. Every step carries a warm cast, so
         * body copy on paper reads like ink rather than like a system
         * dialog. 50 is the light page, 900 the dark page; 200 is the
         * hairline that does most of the structural work in this system.
         */
        sand: {
          50: '#fbf8f2',
          100: '#f5f0e6',
          200: '#eae2d3',
          300: '#d9cdb8',
          400: '#b9a88c',
          500: '#8e7e64',
          600: '#6b5d47',
          700: '#4c4132',
          800: '#2e2720',
          900: '#1a1611',
          950: '#100d0a',
        },
      },

      fontFamily: {
        /**
         * Two faces, split by job rather than by page. Schibsted
         * Grotesk is the voice of the product — headings, buttons, nav,
         * anything the eye lands on first. Work Sans is the voice of
         * the content — body copy, descriptions, form values.
         */
        sans: ['var(--font-work-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-schibsted)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        /**
         * `micro` is the system's signature text style: the uppercase,
         * wide-tracked label that sits above section titles and inside
         * data rows. It appears on essentially every surface, which is
         * what makes unrelated pages read as one product.
         */
        micro: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.14em' }],
        'display-sm': ['2rem', { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-md': ['2.75rem', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        'display-lg': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
        'display-xl': ['5rem', { lineHeight: '0.96', letterSpacing: '-0.04em' }],
      },

      borderRadius: {
        none: '0px',
        sm: '3px',
        DEFAULT: '6px',
        md: '6px',
        lg: '10px',
        xl: '14px',
        full: '9999px',
      },

      boxShadow: {
        /**
         * Reserved for elements that genuinely leave the page plane.
         * Flat surfaces must separate by tint instead — see the file
         * header.
         */
        pop: '0 1px 2px 0 rgb(26 22 17 / 0.06), 0 8px 24px -8px rgb(26 22 17 / 0.18)',
        lift: '0 2px 4px 0 rgb(26 22 17 / 0.06), 0 16px 40px -12px rgb(26 22 17 / 0.24)',
      },

      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        /** Leafing: opacity only. The folder face does not move. */
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },

      animation: {
        'fade-rise': 'fade-rise 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        /**
         * The signature interaction. 180ms, cross-fade, no translation —
         * turning a page inside a folder must not look like a new page
         * arriving, which is exactly what a rise reads as.
         */
        leaf: 'fade-in 180ms ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
