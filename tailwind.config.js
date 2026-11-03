/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  // Hover styles only apply on devices with a real pointer, so taps on phones and iPads don't stick.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        ink: token('ink'),
        muted: token('muted'),
        accent: token('accent'),
        pop: token('pop'),
        tint: token('tint'),
        line: token('line'),
        card: token('card'),
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        script: ['Yellowtail', 'cursive'],
      },
      // Soft, rounded shapes throughout; rounded-full for buttons, pills, dots and rings.
      borderRadius: { card: '1.5rem' },
      boxShadow: {
        // Tinted with the violet ink so shadows feel warm rather than grey
        soft: '0 1px 2px rgb(34 29 58 / 0.04), 0 8px 24px -14px rgb(34 29 58 / 0.14)',
        lift: '0 10px 24px -12px rgb(91 76 219 / 0.55)',
      },
    },
  },
  plugins: [],
};
