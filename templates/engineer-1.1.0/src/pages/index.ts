import type { PageDefinition } from "@factory/template-sdk";
import {
  engineerContactId,
  engineerContactPageId,
  engineerExpertiseId,
  engineerHeroId,
  engineerHomePageId,
  engineerProjectsId,
  engineerProjectsPageId,
} from "../ids";

export const engineerPages: readonly PageDefinition[] = [
  {
    id: engineerHomePageId,
    title: "Home",
    slug: { kind: "fixed", defaultValue: "/", maximumLength: 1 },
    allowedSections: [engineerHeroId, engineerExpertiseId],
    requiredSections: [
      { sectionTypeId: engineerHeroId, minimum: 1, maximum: 1 },
      { sectionTypeId: engineerExpertiseId, minimum: 1, maximum: 1 },
    ],
    defaultSections: [{ sectionTypeId: engineerHeroId }, { sectionTypeId: engineerExpertiseId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Professional landing page", icon: "home" },
  },
  {
    id: engineerProjectsPageId,
    title: "Projects",
    slug: { kind: "fixed", defaultValue: "projects", maximumLength: 80 },
    allowedSections: [engineerProjectsId],
    requiredSections: [{ sectionTypeId: engineerProjectsId, minimum: 1, maximum: 1 }],
    defaultSections: [{ sectionTypeId: engineerProjectsId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Selected project case studies", icon: "grid" },
  },
  {
    id: engineerContactPageId,
    title: "Contact",
    slug: { kind: "fixed", defaultValue: "contact", maximumLength: 80 },
    allowedSections: [engineerContactId],
    requiredSections: [{ sectionTypeId: engineerContactId, minimum: 1, maximum: 1 }],
    defaultSections: [{ sectionTypeId: engineerContactId }],
    supportsSEO: true,
    supportsNavigation: true,
    supportsIndexing: true,
    editor: { description: "Project enquiry details", icon: "mail" },
  },
];
