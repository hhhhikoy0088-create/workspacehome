import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      },
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          muted: 'var(--accent-muted)'
        },
        zinc: {
          50: 'rgb(var(--text-primary) / <alpha-value>)',
          100: 'rgb(var(--text-primary) / <alpha-value>)',
          200: 'rgb(var(--text-secondary) / <alpha-value>)',
          300: 'rgb(var(--text-secondary) / <alpha-value>)',
          400: 'rgb(var(--text-secondary) / <alpha-value>)',
          500: 'rgb(var(--text-muted) / <alpha-value>)',
          600: 'rgb(var(--border) / <alpha-value>)',
          700: 'rgb(var(--border) / <alpha-value>)',
          800: 'rgb(var(--border-subtle) / <alpha-value>)',
          900: 'rgb(var(--surface-elevated) / <alpha-value>)',
          950: 'rgb(var(--surface) / <alpha-value>)'
        },
        blue: {
          300: 'rgb(var(--accent-light) / <alpha-value>)',
          400: 'rgb(var(--accent) / <alpha-value>)',
          500: 'rgb(var(--accent-hover) / <alpha-value>)',
          600: 'rgb(var(--accent-hover) / <alpha-value>)'
        }
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        glow: '0 0 48px rgba(34, 211, 238, 0.18)'
      },
      backgroundImage: {
        'radial-grid':
          'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.12) 1px, transparent 0)'
      }
    }
  },
  plugins: []
};

export default config;
