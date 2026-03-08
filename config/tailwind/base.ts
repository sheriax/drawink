/**
 * Shared Tailwind CSS configuration
 */

import type { Config } from "tailwindcss";

export const baseConfig: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-darker)",
          light: "var(--color-primary-light)",
        },
        brand: {
          DEFAULT: "var(--color-brand)",
          dark: "var(--color-brand-darker)",
          light: "var(--color-brand-light)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default baseConfig;
