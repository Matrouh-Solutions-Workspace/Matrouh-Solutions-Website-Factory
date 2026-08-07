import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f3f8fa",
    surface: "#ffffff",
    surfaceVariant: "#e4f1f3",
    primary: "#0b7a75",
    primaryForeground: "#ffffff",
    secondary: "#102a43",
    accent: "#f0b429",
    success: "#218739",
    warning: "#b76e00",
    danger: "#b42318",
    info: "#1769aa",
    border: "#cfe0e4",
    muted: "#58717a",
    text: "#29434a",
    heading: "#102a43",
  },
  layout: {
    radii: { card: "1.1rem" },
    shadows: { card: "0 22px 60px rgba(16,42,67,.13)" },
    spacing: { section: "4.5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: { body: "Inter, Arial, sans-serif", heading: "Arial, sans-serif" },
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
