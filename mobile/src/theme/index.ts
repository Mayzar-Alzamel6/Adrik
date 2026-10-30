import { I18nManager } from "react-native";
import { useAppStore } from "@/stores/useAppStore";

/** Same semantic tokens as the web app's globals.css, as hex values. */
export const palette = {
  light: {
    bg: "#FAF8F4",
    surface: "#FFFFFF",
    surface2: "#F3EFE7",
    ink: "#1C1B19",
    ink2: "#5B574F",
    ink3: "#6B665C",
    line: "#E7E1D6",
    lineStrong: "#8C867A",
    brand: "#2F5D50",
    brandSoft: "#E6EEEA",
    brandInk: "#FFFFFF",
    accent: "#B8925A",
    accentStrong: "#7A5C37",
    accentSoft: "#F6EFE3",
    accentInk: "#1C1B19",
    danger: "#9A4533",
    dangerSoft: "#F8EAE5",
    dangerInk: "#FFFFFF",
    scrim: "rgba(28,27,25,0.32)",
  },
  dark: {
    bg: "#121311",
    surface: "#1A1B19",
    surface2: "#222421",
    ink: "#EDEAE3",
    ink2: "#B0ABA1",
    ink3: "#918C83",
    line: "#2E302C",
    lineStrong: "#6B665C",
    brand: "#7AB09B",
    brandSoft: "#21302B",
    brandInk: "#0E1613",
    accent: "#D4AF75",
    accentStrong: "#D4AF75",
    accentSoft: "#2D281F",
    accentInk: "#1C1B19",
    danger: "#DE806A",
    dangerSoft: "#34211D",
    dangerInk: "#1C1B19",
    scrim: "rgba(0,0,0,0.6)",
  },
};

export type Palette = typeof palette.light;
export type ColorName = keyof Palette;

export function useColors(): Palette {
  const mode = useAppStore((s) => s.themeMode);
  return palette[mode];
}

// Two weights ship with the app; medium and bold map to the nearer emphasis weight.
export const fonts = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_600SemiBold",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_600SemiBold",
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;

/**
 * The app is Arabic-only. Native RTL is switched off (app.json, supportsRTL: false) because Expo Go
 * ignores it, so the layout is mirrored by hand and looks the same in Expo Go, on the web and in builds.
 * If native RTL is ever on, `row` already flows right-to-left and the manual mirror flips back.
 */
export const ROW = I18nManager.isRTL ? "row" : "row-reverse";
export const TEXT_START = I18nManager.isRTL ? "left" : "right";
