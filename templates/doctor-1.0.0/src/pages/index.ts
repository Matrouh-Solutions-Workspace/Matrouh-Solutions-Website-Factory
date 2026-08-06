import type { PageDefinition } from "@factory/template-sdk";
import { doctorHeroId, doctorHomePageId, doctorServicesId } from "../ids";

export const doctorPages: readonly PageDefinition[] = [
  {
    id: doctorHomePageId,
    title: "Home",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [doctorHeroId, doctorServicesId],
    requiredSections: [
      { sectionTypeId: doctorHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: doctorServicesId, minimum: 0, maximum: 1 },
    ],
    defaultSections: [{ sectionTypeId: doctorHeroId }, { sectionTypeId: doctorServicesId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Primary practice landing page", icon: "home" },
  },
];
