import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f2f8f9",
    surface: "#ffffff",
    surfaceVariant: "#e1f1f2",
    primary: "#007a78",
    primaryForeground: "#ffffff",
    secondary: "#102f47",
    accent: "#e9b949",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#c9dfe3",
    muted: "#55717a",
    text: "#284751",
    heading: "#102f47",
  },
  layout: {
    radii: { card: "1.1rem" },
    shadows: { card: "0 28px 75px rgba(16,47,71,.15)" },
    spacing: { section: "6rem" },
    containerWidths: { page: "80rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: {
      body: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
    },
    fontSizes: { body: "1rem", hero: "6.4rem" },
    fontWeights: { normal: 400, bold: 780 },
    lineHeights: { body: 1.68, heading: 0.98 },
  },
  motion: {
    durations: { fast: "140ms", normal: "220ms" },
    curves: { standard: "cubic-bezier(.2,.8,.2,1)" },
  },
};

export const clinicTheme: ThemeDefinition = {
  id: ids.theme("com.matrouh.clinic/theme/default"),
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Clinic template semantic design tokens.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography", "motion"] },
};
