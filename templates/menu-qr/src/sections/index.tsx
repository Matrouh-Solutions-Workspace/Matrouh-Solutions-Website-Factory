import { contentSchema, z, type JsonValue, type SectionDefinition } from "@factory/template-sdk";
import { menuQrSectionId } from "../ids";
const menuSchema = contentSchema<JsonValue>({
  version: 1,
  description: "Upload a single menu PDF or image for customers to view.",
  schema: z.strictObject({
    menu: z
      .strictObject({
        mediaId: z.string().uuid().nullable().default(null),
        mediaKind: z.enum(["image", "document"]).nullable().default(null),
        filename: z.string().max(255).default(""),
      })
      .default({ mediaId: null, mediaKind: null, filename: "" }),
  }),
  fields: {
    "/menu": { label: "Menu PDF or photo", control: "menu-upload", order: 1 },
  },
});
export const menuQrSections: readonly SectionDefinition[] = [
  {
    id: menuQrSectionId,
    title: "Uploaded menu",
    description: "One clean page for a PDF or photo menu.",
    category: "content",
    schema: menuSchema,
    defaults: {
      menu: { mediaId: null, mediaKind: null, filename: "" },
    },
    render: ({ value, context }) => {
      const menu =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, JsonValue>).menu
          : null;
      const mediaId =
        menu && typeof menu === "object" && !Array.isArray(menu) && typeof menu.mediaId === "string"
          ? menu.mediaId
          : "";
      const isDocument =
        menu && typeof menu === "object" && !Array.isArray(menu) && menu.mediaKind === "document";
      const source = mediaId ? context.media.url(mediaId) : "";
      return (
        <main
          style={{
            background: isDocument ? "#525659" : "#f7f4ee",
            minHeight: "100vh",
            width: "100%",
          }}
        >
          {source ? (
            isDocument ? (
              <iframe
                title="Uploaded menu"
                src={source}
                style={{ border: 0, display: "block", height: "100vh", width: "100%" }}
              />
            ) : (
              <img
                alt="Uploaded menu"
                src={source}
                style={{ display: "block", height: "auto", margin: "0 auto", maxWidth: "100%" }}
              />
            )
          ) : (
            <div
              style={{
                alignItems: "center",
                color: "#6c6a64",
                display: "flex",
                justifyContent: "center",
                minHeight: "100vh",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              Upload a PDF or photo to publish this menu.
            </div>
          )}
        </main>
      );
    },
  },
];
