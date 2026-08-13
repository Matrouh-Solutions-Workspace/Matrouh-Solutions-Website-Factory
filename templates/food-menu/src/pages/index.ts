import type { PageDefinition } from "@factory/template-sdk";
import {
  foodMenuCatalogId,
  foodMenuHeroId,
  foodMenuHomePageId,
  foodMenuImportId,
  foodMenuVisitId,
} from "../ids";

export const foodMenuPages: readonly PageDefinition[] = [
  {
    id: foodMenuHomePageId,
    title: "Menu",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [foodMenuHeroId, foodMenuCatalogId, foodMenuVisitId, foodMenuImportId],
    requiredSections: [
      { sectionTypeId: foodMenuHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: foodMenuCatalogId, minimum: 1, maximum: 1 },
      { sectionTypeId: foodMenuVisitId, minimum: 1, maximum: 1 },
      { sectionTypeId: foodMenuImportId, minimum: 1, maximum: 2 },
    ],
    defaultSections: [
      { sectionTypeId: foodMenuHeroId },
      { sectionTypeId: foodMenuCatalogId },
      { sectionTypeId: foodMenuVisitId },
      { sectionTypeId: foodMenuImportId },
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
