/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        background:       'hsl(var(--background) / <alpha-value>)',
        foreground:       'hsl(var(--foreground) / <alpha-value>)',
        surface:          'hsl(var(--surface) / <alpha-value>)',
        'surface-raised': 'hsl(var(--surface-raised) / <alpha-value>)',
        'surface-lighter':'hsl(var(--surface-lighter) / <alpha-value>)',
        muted:            'hsl(var(--muted) / <alpha-value>)',
        border:           'hsl(var(--border) / <alpha-value>)',
        'border-strong':  'hsl(var(--border-strong) / <alpha-value>)',
        primary: {
          DEFAULT:        'hsl(var(--primary) / <alpha-value>)',
          hover:          'hsl(var(--primary-hover) / <alpha-value>)',
          foreground:     'hsl(var(--primary-fg) / <alpha-value>)',
        },
        secondary:        'hsl(var(--secondary) / <alpha-value>)',
        success:          'hsl(var(--success) / <alpha-value>)',
        warning:          'hsl(var(--warning) / <alpha-value>)',
        danger:           'hsl(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
