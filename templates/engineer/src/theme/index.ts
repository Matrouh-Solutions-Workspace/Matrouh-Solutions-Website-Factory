import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f3f5f7",
    surface: "#ffffff",
    surfaceVariant: "#e4e9ee",
    primary: "#155e75",
    primaryForeground: "#ffffff",
    secondary: "#102a43",
    accent: "#f59e0b",
    success: "#15803d",
    warning: "#b45309",
    danger: "#b91c1c",
    info: "#0369a1",
    border: "#cbd5e1",
    muted: "#64748b",
    text: "#334155",
    heading: "#0f172a",
  },
  layout: {
    radii: { card: "0.35rem" },
    shadows: { card: "0 18px 50px rgba(15,23,42,.10)" },
    spacing: { section: "5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: { body: "Inter, Arial, sans-serif", heading: "Inter, Arial, sans-serif" },
    fontSizes: { body: "1rem", hero: "4.75rem" },
    fontWeights: { normal: 400, bold: 750 },
    lineHeights: { body: 1.65, heading: 1.02 },
  },
  motion: {
    durations: { fast: "140ms", normal: "240ms" },
    curves: { standard: "cubic-bezier(.2,.8,.2,1)" },
  },
};

export const engineerTheme: ThemeDefinition = {
  id: ids.theme("com.matrouh.engineer/theme/default"),
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Engineer portfolio semantic design tokens.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography", "motion"] },
};
