import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f5f7ff",
    surface: "#ffffff",
    surfaceVariant: "#e8ecff",
    primary: "#3448c5",
    primaryForeground: "#ffffff",
    secondary: "#172044",
    accent: "#14a3a3",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#d4d9f5",
    muted: "#667085",
    text: "#20243a",
    heading: "#12172e",
  },
  layout: {
    radii: { card: "0.75rem" },
    shadows: { card: "0 10px 30px rgba(18,23,46,.12)" },
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
