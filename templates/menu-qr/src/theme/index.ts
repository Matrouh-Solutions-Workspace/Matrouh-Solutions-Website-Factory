import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";
const defaults: ThemeTokens = {
  colors: {
    background: "#f7f4ee",
    surface: "#ffffff",
    surfaceVariant: "#eee9df",
    primary: "#183b35",
    primaryForeground: "#ffffff",
    secondary: "#2b2b2b",
    accent: "#d87945",
    success: "#177245",
    warning: "#a75d00",
    danger: "#b42318",
    info: "#183b35",
    border: "#ded8cc",
    muted: "#6c6a64",
    text: "#252522",
    heading: "#183b35",
  },
  layout: {
    radii: { card: "1.25rem" },
    shadows: { card: "0 18px 55px rgba(24,59,53,.12)" },
    spacing: { section: "4rem" },
    containerWidths: { page: "60rem" },
    breakpoints: { md: "48rem", lg: "68rem" },
  },
  typography: {
    fontFamilies: {
      body: "Tajawal, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Cairo, Tajawal, ui-sans-serif, system-ui, Arial, sans-serif",
    },
    fontSizes: { body: "1rem", hero: "3rem" },
    fontWeights: { normal: 430, bold: 760 },
    lineHeights: { body: 1.65, heading: 1.1 },
  },
  motion: {
    durations: { fast: "180ms", normal: "360ms" },
    curves: { standard: "cubic-bezier(.16,1,.3,1)" },
  },
};
export const menuQrTheme: ThemeDefinition = {
  id: ids.theme("com.matrouh.menu-qr/theme/default"),
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Clean menu design tokens.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography", "motion"] },
};
