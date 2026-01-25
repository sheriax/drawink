import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Drawink brand colors (from SCSS variables)
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-darker)',
          light: 'var(--color-primary-light)',
        },
        surface: {
          lowest: 'var(--color-surface-lowest)',
          low: 'var(--color-surface-low)',
          DEFAULT: 'var(--color-surface)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          dark: 'var(--color-danger-dark)',
          text: 'var(--color-danger-text)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          text: 'var(--color-text-warning)',
        },
        promo: 'var(--color-promo)',
        brand: {
          active: 'var(--color-brand-active)',
        },
      },
      spacing: {
        'space-factor': 'var(--space-factor)',
      },
      borderRadius: {
        'md': 'var(--border-radius-md)',
        'lg': 'var(--border-radius-lg)',
      },
      fontFamily: {
        ui: 'var(--ui-font)',
      },
      zIndex: {
        'layer-ui': 'var(--zIndex-layerUI)',
      },
    },
  },
  plugins: [],
};

export default config;
