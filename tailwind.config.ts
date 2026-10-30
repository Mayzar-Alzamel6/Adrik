import type { Config } from "tailwindcss";

/** Semantic token backed by a CSS variable of space-separated RGB channels (see globals.css). */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Replaces Tailwind's palette: only semantic tokens exist, so off-brand defaults (blue-500, red-600…) can't creep in.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      white: "#ffffff",
      black: "#000000",

      bg: token("bg"),
      surface: {
        DEFAULT: token("surface"),
        2: token("surface-2"),
      },
      ink: {
        DEFAULT: token("ink"),
        2: token("ink-2"),
        3: token("ink-3"),
      },
      line: {
        DEFAULT: token("line"),
        strong: token("line-strong"),
      },
      brand: {
        DEFAULT: token("brand"),
        soft: token("brand-soft"),
        ink: token("brand-ink"),
      },
      accent: {
        DEFAULT: token("accent"),
        strong: token("accent-strong"),
        soft: token("accent-soft"),
        ink: token("accent-ink"),
      },
      chart: token("chart-1"),
      danger: {
        DEFAULT: token("danger"),
        soft: token("danger-soft"),
        ink: token("danger-ink"),
      },

      // Carries its own alpha per theme, so no /opacity modifier
      scrim: "rgb(var(--scrim))",
    },
    extend: {
      // Preflight defaults used to read gray-200 / blue-500 from the removed palettes.
      borderColor: { DEFAULT: token("line") },
      ringColor: { DEFAULT: "rgb(var(--brand) / 0.5)" },
      fontFamily: {
        arabic: ["var(--font-body)", "'IBM Plex Sans Arabic'", "sans-serif"],
        sans: ["var(--font-body)", "'IBM Plex Sans Arabic'", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
      },
      // Type scale (size only; line-height stays with the element). Names mirror the design system.
      fontSize: {
        micro: "11px",
        caption: "12px",
        small: "13px",
        ui: "14px",
        body: "15px",
        lead: "16px",
        subtitle: "17px",
        "title-sm": "18px",
        title: "20px",
        "title-lg": "22px",
        heading: "24px",
        "heading-lg": "26px",
        "display-sm": "28px",
        display: "30px",
        "display-md": "34px",
        "display-lg": "36px",
        "hero-sm": "42px",
        hero: "52px",
        timer: "56px",
      },
      borderRadius: {
        xl2: "16px",
        "4xl": "28px",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        ring: "0 0 0 4px rgb(var(--brand) / 0.12)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(0.85)", opacity: "0.6" },
          "50%": { transform: "scale(1.2)", opacity: "1" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        riseIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        sheetIn: {
          from: { opacity: "0", transform: "translateY(16px) scale(0.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        "pulse-slow": "pulseSlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 200ms ease-out both",
        "rise-in": "riseIn 360ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "sheet-in": "sheetIn 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
