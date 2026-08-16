import type { RouteDefinition } from "@factory/template-sdk";
import { cafeMenuHomePageId, cafeMenuRouteId } from "../ids";

export const cafeMenuRoutes: readonly RouteDefinition[] = [
  {
    id: cafeMenuRouteId,
    pattern: "/:slug?",
    priority: 10,
    pageTypes: [cafeMenuHomePageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
