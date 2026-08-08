import type { PageDefinition } from "@factory/template-sdk";
import {
  doctorContactId,
  doctorContactPageId,
  doctorHeroId,
  doctorHomePageId,
  doctorServicesId,
  doctorTeamId,
  doctorTestimonialsId,
} from "../ids";

export const doctorPages: readonly PageDefinition[] = [
  {
    id: doctorHomePageId,
    title: "Home",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [doctorHeroId, doctorServicesId, doctorTeamId, doctorTestimonialsId],
    requiredSections: [
      { sectionTypeId: doctorHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: doctorServicesId, minimum: 0, maximum: 1 },
      { sectionTypeId: doctorTeamId, minimum: 0, maximum: 1 },
      { sectionTypeId: doctorTestimonialsId, minimum: 0, maximum: 1 },
    ],
    defaultSections: [
      { sectionTypeId: doctorHeroId },
      { sectionTypeId: doctorServicesId },
      { sectionTypeId: doctorTeamId },
      { sectionTypeId: doctorTestimonialsId },
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
