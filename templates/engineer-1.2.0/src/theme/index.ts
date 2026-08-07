import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f4f7f9",
    surface: "#ffffff",
    surfaceVariant: "#e7edf1",
    primary: "#0b63ce",
    primaryForeground: "#ffffff",
    secondary: "#0b1f33",
    accent: "#f4b223",
    success: "#15803d",
    warning: "#b45309",
    danger: "#b91c1c",
    info: "#0369a1",
    border: "#cbd6de",
    muted: "#5e7181",
    text: "#304657",
    heading: "#0b1f33",
  },
  layout: {
    radii: { card: "0.4rem" },
    shadows: { card: "0 24px 70px rgba(11,31,51,.14)" },
    spacing: { section: "6.5rem" },
    containerWidths: { page: "80rem" },
    breakpoints: { md: "48rem", lg: "64rem" },
  },
  typography: {
    fontFamilies: {
      body: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Inter, ui-sans-serif, system-ui, Arial, sans-serif",
    },
    fontSizes: { body: "1rem", hero: "6.5rem" },
    fontWeights: { normal: 400, bold: 780 },
    lineHeights: { body: 1.7, heading: 0.96 },
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
