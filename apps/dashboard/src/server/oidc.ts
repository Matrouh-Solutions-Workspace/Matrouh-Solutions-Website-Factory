import { OidcClient } from "@factory/auth";
import { dashboardConfig } from "./config";

export function dashboardOidcClient(): OidcClient {
  const issuer = dashboardConfig.FACTORY_OIDC_ISSUER;
  const clientId = dashboardConfig.FACTORY_OIDC_CLIENT_ID;
  const clientSecret = dashboardConfig.FACTORY_OIDC_CLIENT_SECRET;
  const redirectUri = dashboardConfig.FACTORY_OIDC_REDIRECT_URI;
  if (
    dashboardConfig.FACTORY_AUTH_MODE !== "oidc" ||
    !issuer ||
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    throw new Error("OIDC_NOT_CONFIGURED");
  }
  return new OidcClient({ issuer, clientId, clientSecret, redirectUri });
}
