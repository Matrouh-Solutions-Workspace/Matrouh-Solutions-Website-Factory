import type { PageDefinition } from "@factory/template-sdk";
import { clinicHeroId, clinicHomePageId, clinicLocationsId, clinicLocationsPageId } from "../ids";

export const clinicPages: readonly PageDefinition[] = [
  {
    id: clinicHomePageId,
    title: "Home",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [clinicHeroId, clinicLocationsId],
    requiredSections: [
      { sectionTypeId: clinicHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: clinicLocationsId, minimum: 0, maximum: 1 },
    ],
    defaultSections: [{ sectionTypeId: clinicHeroId }, { sectionTypeId: clinicLocationsId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Primary clinic landing page", icon: "home" },
  },
  {
    id: clinicLocationsPageId,
    title: "Locations",
    slug: { kind: "fixed", defaultValue: "locations", maximumLength: 80 },
    allowedSections: [clinicLocationsId],
    requiredSections: [{ sectionTypeId: clinicLocationsId, minimum: 1, maximum: 1 }],
    defaultSections: [{ sectionTypeId: clinicLocationsId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Location directory", icon: "map-pin" },
  },
];
