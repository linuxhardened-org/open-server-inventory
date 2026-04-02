/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        /* Semantic aliases (shadcn-style names) — map to CSS tokens in :root / .dark */
        foreground: 'hsl(var(--fg) / <alpha-value>)',
        secondary: 'hsl(var(--fg-2) / <alpha-value>)',
        'surface-lighter': 'hsl(var(--surface-2) / <alpha-value>)',
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        'surface-2': 'hsl(var(--surface-2) / <alpha-value>)',
        'surface-3': 'hsl(var(--surface-3) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        'border-2': 'hsl(var(--border-2) / <alpha-value>)',
        fg: 'hsl(var(--fg) / <alpha-value>)',
        'fg-2': 'hsl(var(--fg-2) / <alpha-value>)',
        'fg-3': 'hsl(var(--fg-3) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          dark: 'hsl(var(--primary-dark) / <alpha-value>)',
        },
        danger: 'hsl(var(--danger) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        display: ['"JetBrains Mono"', '"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -4px hsl(var(--primary) / 0.35)',
        'glow-sm': '0 0 16px -6px hsl(var(--primary) / 0.25)',
      },
    },
  },
  plugins: [],
};
