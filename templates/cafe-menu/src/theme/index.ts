import { contentSchema, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";
import { cafeMenuThemeId } from "../ids";

const defaults: ThemeTokens = {
  colors: {
    background: "#f4eee4",
    surface: "#fcf8f1",
    surfaceVariant: "#e9dfd0",
    primary: "#a14f32",
    primaryForeground: "#fff8ef",
    secondary: "#1d2922",
    accent: "#d7a96b",
    success: "#447354",
    warning: "#95651f",
    danger: "#b42318",
    info: "#315e72",
    border: "#cfc0b0",
    muted: "#746a61",
    text: "#332b25",
    heading: "#201a16",
  },
  layout: {
    radii: { card: "0.4rem", button: "0.25rem" },
    shadows: { card: "0 24px 70px rgba(45,30,20,.14)" },
    spacing: { section: "7rem" },
    containerWidths: { page: "90rem" },
    breakpoints: { md: "48rem", lg: "68rem" },
  },
  typography: {
    fontFamilies: {
      body: "Inter, Tajawal, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Georgia, 'Noto Naskh Arabic', serif",
    },
    fontSizes: { body: "0.95rem", hero: "8.4rem" },
    fontWeights: { normal: 430, bold: 720 },
    lineHeights: { body: 1.65, heading: 0.9 },
  },
  motion: {
    durations: { fast: "180ms", normal: "520ms" },
    curves: { standard: "cubic-bezier(.16,1,.3,1)" },
  },
};

export const cafeMenuTheme: ThemeDefinition = {
  id: cafeMenuThemeId,
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Editorial café menu tokens with cream paper, forest green, and terracotta accents.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography"] },
};
