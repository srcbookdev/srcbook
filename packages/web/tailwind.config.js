/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{css,ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        mono: [
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          hover: 'hsl(var(--secondary-hover))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        tertiary: {
          DEFAULT: 'hsl(var(--tertiary))',
          foreground: 'hsl(var(--tertiary-foreground))',
        },
        run: {
          DEFAULT: 'hsl(var(--run))',
          foreground: 'hsl(var(--run-foreground))',
          ring: 'hsl(var(--run-ring))',
        },
        'inline-code': {
          DEFAULT: 'hsl(var(--inline-code))',
          foreground: 'hsl(var(--inline-code-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        ai: {
          DEFAULT: 'hsl(var(--ai))',
          foreground: 'hsl(var(--ai-foreground))',
          border: 'hsl(var(--ai-border))',
          btn: 'hsl(var(--ai-btn))',
          ring: 'hsl(var(--ai-ring))',
        },
        sb: {
          'core-0': 'hsl(var(--sb-core-0))',
          'core-10': 'hsl(var(--sb-core-10))',
          'core-20': 'hsl(var(--sb-core-20))',
          'core-30': 'hsl(var(--sb-core-30))',
          'core-40': 'hsl(var(--sb-core-40))',
          'core-50': 'hsl(var(--sb-core-50))',
          'core-60': 'hsl(var(--sb-core-60))',
          'core-70': 'hsl(var(--sb-core-70))',
          'core-80': 'hsl(var(--sb-core-80))',
          'core-90': 'hsl(var(--sb-core-90))',
          'core-100': 'hsl(var(--sb-core-100))',
          'core-110': 'hsl(var(--sb-core-110))',
          'core-120': 'hsl(var(--sb-core-120))',
          'core-130': 'hsl(var(--sb-core-130))',
          'core-140': 'hsl(var(--sb-core-140))',
          'core-150': 'hsl(var(--sb-core-150))',
          'core-160': 'hsl(var(--sb-core-160))',

          'yellow-10': 'hsl(var(--sb-yellow-10))',
          'yellow-20': 'hsl(var(--sb-yellow-20))',
          'yellow-30': 'hsl(var(--sb-yellow-30))',
          'yellow-40': 'hsl(var(--sb-yellow-40))',
          'yellow-50': 'hsl(var(--sb-yellow-50))',
          'yellow-60': 'hsl(var(--sb-yellow-60))',
          'yellow-70': 'hsl(var(--sb-yellow-70))',
          'yellow-80': 'hsl(var(--sb-yellow-80))',

          'red-10': 'hsl(var(--sb-red-10))',
          'red-20': 'hsl(var(--sb-red-20))',
          'red-30': 'hsl(var(--sb-red-30))',
          'red-40': 'hsl(var(--sb-red-40))',
          'red-50': 'hsl(var(--sb-red-50))',
          'red-60': 'hsl(var(--sb-red-60))',
          'red-70': 'hsl(var(--sb-red-70))',
          'red-80': 'hsl(var(--sb-red-80))',

          'blue-10': 'hsl(var(--sb-blue-10))',
          'blue-20': 'hsl(var(--sb-blue-20))',
          'blue-30': 'hsl(var(--sb-blue-30))',
          'blue-40': 'hsl(var(--sb-blue-40))',
          'blue-50': 'hsl(var(--sb-blue-50))',
          'blue-60': 'hsl(var(--sb-blue-60))',
          'blue-70': 'hsl(var(--sb-blue-70))',
          'blue-80': 'hsl(var(--sb-blue-80))',

          'purple-10': 'hsl(var(--sb-purple-10))',
          'purple-20': 'hsl(var(--sb-purple-20))',
          'purple-60': 'hsl(var(--sb-purple-60))',
          'purple-80': 'hsl(var(--sb-purple-80))',

          'green-20': 'hsl(var(--sb-green-20))',
          'green-80': 'hsl(var(--sb-green-80))',
        },
      },
      dropShadow: {
        key: '0 1px 0 hsl(var(--border))', // for keyboard shortcuts. border-border 1px straight down
      },
      borderRadius: {
        sm: '0.1875rem', // 3px
        mid: '0.375rem', // 6px
        md: '0.4375rem', // 7px
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'collapsible-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        'collapsible-up': {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 1s ease-out',
        'collapsible-up': 'collapsible-up 1s ease-out',
      },
      typography: {
        DEFAULT: {
          css: {
            // Remove visible backticks by overriding code::before and code::after
            // https://github.com/tailwindlabs/tailwindcss-typography/issues/18
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
