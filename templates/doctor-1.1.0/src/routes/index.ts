import type { RouteDefinition } from "@factory/template-sdk";
import { ids } from "@factory/template-sdk";
import { doctorContactPageId, doctorHomePageId } from "../ids";

export const doctorRoutes: readonly RouteDefinition[] = [
  {
    id: ids.route("com.matrouh.doctor/route/page"),
    pattern: "/:slug?",
    priority: 0,
    pageTypes: [doctorHomePageId, doctorContactPageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
