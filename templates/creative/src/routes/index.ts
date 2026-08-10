import { ids, type RouteDefinition } from "@factory/template-sdk";
import { creativeContactPageId, creativeHomePageId, creativeWorkPageId } from "../ids";

export const creativeRoutes: readonly RouteDefinition[] = [
  {
    id: ids.route("com.matrouh.creative/route/page"),
    pattern: "/:slug?",
    priority: 0,
    pageTypes: [creativeHomePageId, creativeWorkPageId, creativeContactPageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
