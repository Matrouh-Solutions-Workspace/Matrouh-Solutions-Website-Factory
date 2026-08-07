import type { PageDefinition } from "@factory/template-sdk";
import {
  doctorContactId,
  doctorContactPageId,
  doctorHeroId,
  doctorHomePageId,
  doctorJourneyId,
  doctorProfileId,
  doctorServicesId,
} from "../ids";

export const doctorPages: readonly PageDefinition[] = [
  {
    id: doctorHomePageId,
    title: "Home",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [doctorHeroId, doctorProfileId, doctorServicesId, doctorJourneyId],
    requiredSections: [
      { sectionTypeId: doctorHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: doctorServicesId, minimum: 0, maximum: 1 },
    ],
    defaultSections: [
      { sectionTypeId: doctorHeroId },
      { sectionTypeId: doctorProfileId },
      { sectionTypeId: doctorServicesId },
      { sectionTypeId: doctorJourneyId },
    ],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Primary practice landing page", icon: "home" },
  },
  {
    id: doctorContactPageId,
    title: "Contact",
    slug: { kind: "fixed", defaultValue: "contact", maximumLength: 80 },
    allowedSections: [doctorContactId],
    requiredSections: [{ sectionTypeId: doctorContactId, minimum: 1, maximum: 1 }],
    defaultSections: [{ sectionTypeId: doctorContactId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Contact and appointment information", icon: "phone" },
  },
];
