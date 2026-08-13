import type { RouteDefinition } from "@factory/template-sdk";
import { foodMenuHomePageId, foodMenuRouteId } from "../ids";

export const foodMenuRoutes: readonly RouteDefinition[] = [
  {
    id: foodMenuRouteId,
    pattern: "/:slug?",
    priority: 10,
    pageTypes: [foodMenuHomePageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
