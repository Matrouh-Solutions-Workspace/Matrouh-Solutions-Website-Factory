import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f7f7f5",
    surface: "#ffffff",
    surfaceVariant: "#eeeeeb",
    primary: "#ffcc00",
    primaryForeground: "#1e1e1e",
    secondary: "#1e1e1e",
    accent: "#d9d9d9",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#d9d9d9",
    muted: "#686868",
    text: "#333333",
    heading: "#1e1e1e",
  },
  layout: {
    radii: { card: "0.75rem" },
    shadows: { card: "0 10px 30px rgba(30,30,30,.12)" },
    spacing: { section: "4.5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: { body: "Arial, sans-serif", heading: "Arial, sans-serif" },
    fontSizes: { body: "1rem", hero: "4.5rem" },
    fontWeights: { normal: 400, bold: 750 },
    lineHeights: { body: 1.6, heading: 1.08 },
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
