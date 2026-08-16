import type { PageDefinition } from "@factory/template-sdk";
import { cafeMenuCatalogId, cafeMenuHeroId, cafeMenuHomePageId, cafeMenuVisitId } from "../ids";

export const cafeMenuPages: readonly PageDefinition[] = [
  {
    id: cafeMenuHomePageId,
    title: "Menu",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [cafeMenuHeroId, cafeMenuCatalogId, cafeMenuVisitId],
    requiredSections: [
      { sectionTypeId: cafeMenuHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: cafeMenuCatalogId, minimum: 1, maximum: 1 },
      { sectionTypeId: cafeMenuVisitId, minimum: 1, maximum: 1 },
    ],
    defaultSections: [
      { sectionTypeId: cafeMenuHeroId },
      { sectionTypeId: cafeMenuCatalogId },
      { sectionTypeId: cafeMenuVisitId },
    ],
    supportsSEO: true,
    supportsNavigation: false,
    supportsIndexing: true,
    editor: {
      description: "Mobile-first restaurant menu with categories, dishes, and size pricing",
      icon: "menu",
    },
  },
];
