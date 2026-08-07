import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f7f3eb",
    surface: "#ffffff",
    surfaceVariant: "#e8efe9",
    primary: "#185f4d",
    primaryForeground: "#ffffff",
    secondary: "#143c33",
    accent: "#c98a5a",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#d8d4ca",
    muted: "#61716a",
    text: "#32443e",
    heading: "#143c33",
  },
  layout: {
    radii: { card: "1.25rem" },
    shadows: { card: "0 28px 80px rgba(20,60,51,.14)" },
    spacing: { section: "6.5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: {
      body: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Iowan Old Style, Baskerville, Georgia, serif",
    },
    fontSizes: { body: "1rem", hero: "6.8rem" },
    fontWeights: { normal: 400, bold: 700 },
    lineHeights: { body: 1.7, heading: 0.96 },
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
