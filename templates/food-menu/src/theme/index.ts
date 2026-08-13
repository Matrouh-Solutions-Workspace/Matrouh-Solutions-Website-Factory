import { contentSchema, type ThemeDefinition, type ThemeTokens } from "@factory/template-sdk";
import { themeTokensZodSchema } from "@templates/shared";
import { foodMenuThemeId } from "../ids";

const defaults: ThemeTokens = {
  colors: {
    background: "#f6f0e5",
    surface: "#fffdf8",
    surfaceVariant: "#eadfce",
    primary: "#bd3c22",
    primaryForeground: "#fffaf1",
    secondary: "#1d3528",
    accent: "#e8a52b",
    success: "#26734d",
    warning: "#9a6500",
    danger: "#b42318",
    info: "#315e72",
    border: "#d8c8b3",
    muted: "#756b60",
    text: "#352d27",
    heading: "#211b17",
  },
  layout: {
    radii: { card: "1.4rem", button: "999px" },
    shadows: { card: "0 18px 54px rgba(69,45,28,.10)" },
    spacing: { section: "5rem" },
    containerWidths: { page: "76rem" },
    breakpoints: { md: "48rem", lg: "68rem" },
  },
  typography: {
    fontFamilies: {
      body: "Inter, Tajawal, ui-sans-serif, system-ui, Arial, sans-serif",
      heading: "Georgia, 'Noto Naskh Arabic', serif",
    },
    fontSizes: { body: "1rem", hero: "7.2rem" },
    fontWeights: { normal: 430, bold: 760 },
    lineHeights: { body: 1.6, heading: 0.96 },
  },
  motion: {
    durations: { fast: "180ms", normal: "520ms" },
    curves: { standard: "cubic-bezier(.16,1,.3,1)" },
  },
};

export const foodMenuTheme: ThemeDefinition = {
  id: foodMenuThemeId,
  schemaVersion: 1,
  schema: contentSchema<ThemeTokens>({
    version: 1,
    schema: themeTokensZodSchema,
    description: "Warm, accessible restaurant menu theme tokens.",
  }),
  defaults,
  editor: { groups: ["colors", "layout", "typography"] },
};
