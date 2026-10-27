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
      // Flat, near-square boxes throughout; rounded-full stays for pills, dots and rings.
      borderRadius: { card: '2px', lg: '2px', xl: '3px', '2xl': '4px' },
      boxShadow: {
        soft: '0 1px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};
