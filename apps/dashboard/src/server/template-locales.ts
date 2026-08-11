import type { TemplateDefinition } from "@factory/template-sdk";

export const DEFAULT_TEMPLATE_LOCALES = ["ar", "en"] as const;

/**
 * Templates published before locale metadata was introduced are still bilingual
 * when they declare localizable content or localized routes. Keep that behavior
 * explicit here so the editor and mutation layer always agree.
 */
export function supportedTemplateLocales(template: TemplateDefinition): readonly string[] {
  const supportsLocalizedContent =
    template.manifest.features?.includes("localized-content") ||
    template.routes.some((route) => route.localePolicy !== "default");
  return supportsLocalizedContent ? DEFAULT_TEMPLATE_LOCALES : ["en"];
}
