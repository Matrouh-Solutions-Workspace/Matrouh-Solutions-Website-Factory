import { ids, type RouteDefinition } from "@factory/template-sdk";
import { menuQrHomePageId } from "../ids";
export const menuQrRoutes: readonly RouteDefinition[] = [
  {
    id: ids.route("com.matrouh.menu-qr/route/page"),
    pattern: "/:slug?",
    priority: 0,
    pageTypes: [menuQrHomePageId],
    localePolicy: "prefix-except-default",
    indexingPolicy: "inherit-page",
  },
];
