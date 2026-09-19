import type { PageDefinition } from "@factory/template-sdk";
import { menuQrHomePageId, menuQrSectionId } from "../ids";
export const menuQrPages: readonly PageDefinition[] = [
  {
    id: menuQrHomePageId,
    title: "Menu",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [menuQrSectionId],
    requiredSections: [{ sectionTypeId: menuQrSectionId, minimum: 1, maximum: 1 }],
    defaultSections: [{ sectionTypeId: menuQrSectionId }],
    supportsSEO: true,
    supportsNavigation: false,
    supportsIndexing: true,
    editor: { description: "A simple uploaded menu", icon: "file" },
  },
];
