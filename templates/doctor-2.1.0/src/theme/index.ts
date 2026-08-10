import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f4efe7",
    surface: "#ffffff",
    surfaceVariant: "#e4d9ca",
    primary: "#443126",
    primaryForeground: "#ffffff",
    secondary: "#221914",
    accent: "#ae762d",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#dfd4c5",
    muted: "#71675e",
    text: "#332a24",
    heading: "#221914",
  },
  layout: {
    radii: { card: "1.75rem" },
    shadows: { card: "0 20px 60px rgba(65,48,37,.12)" },
    spacing: { section: "5.5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: {
      body: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
    },
    fontSizes: { body: "1rem", hero: "5.2rem" },
    fontWeights: { normal: 400, bold: 700 },
    lineHeights: { body: 1.7, heading: 1.02 },
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
