import {
  contentSchema,
  ids,
  z,
  type BlockDefinition,
  type JsonValue,
  type ThemeTokens,
  type WidgetDefinition,
} from "@factory/template-sdk";

const safeLength = z
  .string()
  .min(1)
  .max(80)
  .regex(/^-?(?:\d+(?:\.\d+)?)(?:px|rem|em|%|vw|vh)$/);
const safeDuration = z.string().regex(/^\d+(?:\.\d+)?(?:ms|s)$/);
const safeColor = z
  .string()
  .min(1)
  .max(64)
  .regex(/^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s/-]+\)|[a-z]+)$/i);
const safeShadow = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[^;{}]+$/);
const safeFont = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[^;{}]+$/);
const tokenRecord = <T extends z.ZodType>(value: T) =>
  z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), value);

export const themeTokensZodSchema: z.ZodType<ThemeTokens> = z.strictObject({
  colors: z.strictObject({
    background: safeColor,
    surface: safeColor,
    surfaceVariant: safeColor,
    primary: safeColor,
    primaryForeground: safeColor,
    secondary: safeColor,
    accent: safeColor,
    success: safeColor,
    warning: safeColor,
    danger: safeColor,
    info: safeColor,
    border: safeColor,
    muted: safeColor,
    text: safeColor,
    heading: safeColor,
  }),
  layout: z.strictObject({
    radii: tokenRecord(safeLength),
    shadows: tokenRecord(safeShadow),
    spacing: tokenRecord(safeLength),
    containerWidths: tokenRecord(safeLength),
    breakpoints: tokenRecord(safeLength),
  }),
  typography: z.strictObject({
    fontFamilies: tokenRecord(safeFont),
    fontSizes: tokenRecord(safeLength),
    fontWeights: tokenRecord(z.number().int().min(100).max(1000)),
    lineHeights: tokenRecord(z.number().min(0.8).max(3)),
  }),
  motion: z.strictObject({
    durations: tokenRecord(safeDuration),
    curves: tokenRecord(
      z
        .string()
        .min(1)
        .max(100)
        .regex(/^[^;{}]+$/),
    ),
  }),
});

export const sharedButtonId = ids.widget("com.matrouh.shared/widget/action-button");
export const sharedInfoCardId = ids.block("com.matrouh.shared/block/info-card");

const buttonSchema = contentSchema<JsonValue>({
  version: 1,
  description: "A safe internal or HTTPS action link.",
  schema: z.strictObject({
    label: z.string().min(1).max(60),
    href: z
      .string()
      .min(1)
      .max(500)
      .refine((value) => value.startsWith("/") || value.startsWith("https://")),
    style: z.enum(["primary", "secondary", "text"]),
  }),
  fields: {
    "/label": { label: "Label", control: "text", order: 1, aiHint: "Use a short action phrase" },
    "/href": { label: "Destination", control: "url", order: 2 },
    "/style": {
      label: "Style",
      control: "select",
      order: 3,
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Text", value: "text" },
      ],
    },
  },
});

export const sharedButton: WidgetDefinition = {
  id: sharedButtonId,
  title: "Action button",
  description: "Reusable accessible call-to-action link.",
  category: "actions",
  schema: buttonSchema,
  defaults: { label: "Learn more", href: "/", style: "primary" },
  render: ({ value, context }) => {
    const record = value as Readonly<Record<string, JsonValue>>;
    const label = typeof record.label === "string" ? record.label : "Learn more";
    const href = typeof record.href === "string" ? context.links.url(record.href) : "/";
    const style = typeof record.style === "string" ? record.style : "primary";
    return (
      <a className={`action action--${style}`} href={href}>
        {label}
      </a>
    );
  },
};

const infoCardSchema = contentSchema<JsonValue>({
  version: 1,
  description: "A reusable title and body card.",
  schema: z.strictObject({
    id: z.string().uuid(),
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
  }),
  fields: {
    "/title": { label: "Title", control: "text", order: 1, localization: "value" },
    "/body": { label: "Body", control: "textarea", order: 2, localization: "value" },
  },
});

export const sharedInfoCard: BlockDefinition = {
  id: sharedInfoCardId,
  title: "Information card",
  description: "Reusable information card shared by first-party templates.",
  category: "content",
  schema: infoCardSchema,
  defaults: {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Information",
    body: "Helpful details for visitors.",
  },
  composedOf: [sharedButtonId],
  render: ({ value }) => {
    const record = value as Readonly<Record<string, JsonValue>>;
    return (
      <article className="infoCard">
        <h3>{typeof record.title === "string" ? record.title : ""}</h3>
        <p>{typeof record.body === "string" ? record.body : ""}</p>
      </article>
    );
  },
};
