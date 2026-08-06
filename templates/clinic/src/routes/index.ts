import { ids, type RouteDefinition } from "@factory/template-sdk";
import { clinicHomePageId, clinicLocationsPageId } from "../ids";

export const clinicRoutes: readonly RouteDefinition[] = [
  {
    id: ids.route("com.matrouh.clinic/route/page"),
    pattern: "/:slug?",
    priority: 0,
    pageTypes: [clinicHomePageId, clinicLocationsPageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
