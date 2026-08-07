import { ids, type RouteDefinition } from "@factory/template-sdk";
import { engineerContactPageId, engineerHomePageId, engineerProjectsPageId } from "../ids";

export const engineerRoutes: readonly RouteDefinition[] = [
  {
    id: ids.route("com.matrouh.engineer/route/page"),
    pattern: "/:slug?",
    priority: 0,
    pageTypes: [engineerHomePageId, engineerProjectsPageId, engineerContactPageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
