import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Forest Green — primary accent (locked)
        forest: {
          50: '#f0f7f4',
          100: '#d9ede8',
          200: '#b3dcd1',
          300: '#81c9b3',
          400: '#4fb096',
          500: '#2D6A4F', // Light variant — interactive states
          600: '#1B4332', // Primary — buttons, accents
          700: '#081C15', // Dark variant — strong contrast
          800: '#040f0a',
          900: '#020705',
          950: '#010402',
        },
        // Neutrals — off-white / off-black (no pure #fff or #000)
        neutral: {
          50: '#fafaf8',  // Off-white light mode bg
          100: '#f5f5f3',
          200: '#e7e7e3',
          300: '#d4d4cc',
          400: '#a8a8a0',
          500: '#6d6d65',
          600: '#4d4d45',
          700: '#3a3a32',
          800: '#252520',
          900: '#0f0f0e',  // Off-black dark mode bg
          950: '#0a0a08',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        base: '8px',      // Inputs / subtle
        lg: '12px',
        xl: '16px',       // Cards / containers
        full: '9999px',   // Buttons / pill
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.06), 0 1px 3px 0 rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
