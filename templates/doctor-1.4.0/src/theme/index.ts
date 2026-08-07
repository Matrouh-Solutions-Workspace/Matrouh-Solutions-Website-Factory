import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f4f1e9",
    surface: "#ffffff",
    surfaceVariant: "#e7eee9",
    primary: "#2f6f62",
    primaryForeground: "#ffffff",
    secondary: "#173c36",
    accent: "#d8a25e",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#d6d3c9",
    muted: "#66736e",
    text: "#33413c",
    heading: "#173c36",
  },
  layout: {
    radii: { card: "1.25rem" },
    shadows: { card: "0 24px 70px rgba(23,60,54,.13)" },
    spacing: { section: "5rem" },
    containerWidths: { page: "72rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: { body: "Inter, Arial, sans-serif", heading: "Georgia, serif" },
    fontSizes: { body: "1rem", hero: "5rem" },
    fontWeights: { normal: 400, bold: 700 },
    lineHeights: { body: 1.6, heading: 1.05 },
  },
  motion: {
    durations: { fast: "150ms", normal: "250ms" },
    curves: { standard: "cubic-bezier(.2,.8,.2,1)" },
  },
};

export const doctorTheme: ThemeDefinition = {
  id: ids.theme("com.matrouh.doctor/theme/default"),
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Doctor template semantic design tokens.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography", "motion"] },
};
