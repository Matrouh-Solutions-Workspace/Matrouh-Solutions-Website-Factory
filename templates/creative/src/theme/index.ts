import { contentSchema, ids, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";

const defaults: ThemeTokens = {
  colors: {
    background: "#f2f0ea",
    surface: "#fbfaf6",
    surfaceVariant: "#e7e3da",
    primary: "#2548e7",
    primaryForeground: "#ffffff",
    secondary: "#151515",
    accent: "#ff5c35",
    success: "#177245",
    warning: "#a75d00",
    danger: "#b42318",
    info: "#2548e7",
    border: "#cbc6bb",
    muted: "#67645f",
    text: "#2c2b29",
    heading: "#111111",
  },
  layout: {
    radii: { card: "1.5rem" },
    shadows: { card: "0 32px 90px rgba(17,17,17,.12)" },
    spacing: { section: "8rem" },
    containerWidths: { page: "86rem" },
    breakpoints: { md: "48rem", lg: "68rem" },
  },
  typography: {
    fontFamilies: {
      body: "Tajawal, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Cairo, Tajawal, ui-sans-serif, system-ui, Arial, sans-serif",
    },
    fontSizes: { body: "1rem", hero: "7.5rem" },
    fontWeights: { normal: 430, bold: 760 },
    lineHeights: { body: 1.65, heading: 0.92 },
  },
  motion: {
    durations: { fast: "180ms", normal: "560ms" },
    curves: { standard: "cubic-bezier(.16,1,.3,1)" },
  },
};

export const creativeTheme: ThemeDefinition = {
  id: ids.theme("com.matrouh.creative/theme/default"),
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Editorial portfolio design tokens.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography", "motion"] },
};
