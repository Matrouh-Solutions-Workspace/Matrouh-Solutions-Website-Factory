import { dashboardConfig } from "./config";

export class OidcAdminError extends Error {
  constructor(readonly code: "configuration" | "conflict" | "provider") {
    super(code);
  }
}

interface OidcPasswordUser {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}

interface OidcUserLookup {
  readonly id: string;
  readonly email?: string;
  readonly username?: string;
}

interface OidcAdminConfiguration {
  readonly issuer: string;
  readonly adminUsersUrl: URL;
  readonly clientId: string;
  readonly clientSecret: string;
}

/**
 * Creates and maintains password-based accounts in the same OIDC provider used
 * by the dashboard. The dashboard never stores the provider's admin token.
 */
export async function createOidcPasswordUser(input: OidcPasswordUser): Promise<string> {
  const configuration = oidcAdminConfiguration();
  const accessToken = await adminAccessToken(configuration);
  const response = await fetch(configuration.adminUsersUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      username: input.email,
      email: input.email,
      emailVerified: true,
      enabled: true,
      firstName: input.displayName,
      credentials: [{ type: "password", value: input.password, temporary: false }],
    }),
    cache: "no-store",
  });
  if (response.status === 409) throw new OidcAdminError("conflict");
  if (!response.ok) throw new OidcAdminError("provider");
  const location = response.headers.get("location");
  const subject = location?.split("/").filter(Boolean).at(-1);
  if (!subject) throw new OidcAdminError("provider");
  return subject;
}

export async function deleteOidcUser(subject: string): Promise<void> {
  const configuration = oidcAdminConfiguration();
  const accessToken = await adminAccessToken(configuration);
  const response = await fetch(
    new URL(encodeURIComponent(subject), `${configuration.adminUsersUrl}/`),
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok && response.status !== 404) throw new OidcAdminError("provider");
}

export async function updateOidcPassword(subject: string, password: string): Promise<void> {
  const configuration = oidcAdminConfiguration();
  const accessToken = await adminAccessToken(configuration);
  const response = await fetch(
    new URL(`${encodeURIComponent(subject)}/reset-password`, `${configuration.adminUsersUrl}/`),
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "password", value: password, temporary: false }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new OidcAdminError("provider");
}

/** Resolves an existing provider user by their verified email address. */
export async function findOidcUserByEmail(email: string): Promise<string | null> {
  const configuration = oidcAdminConfiguration();
  const accessToken = await adminAccessToken(configuration);
  const normalizedEmail = email.trim().toLowerCase();
  const byEmail = await findOidcUsers(configuration, accessToken, "email", normalizedEmail);
  const users = byEmail.length
    ? byEmail
    : await findOidcUsers(configuration, accessToken, "username", normalizedEmail);
  const user = users.find(
    (candidate) =>
      candidate.email?.trim().toLowerCase() === normalizedEmail ||
      candidate.username?.trim().toLowerCase() === normalizedEmail,
  );
  return typeof user?.id === "string" && user.id.length > 0 ? user.id : null;
}

async function findOidcUsers(
  configuration: OidcAdminConfiguration,
  accessToken: string,
  field: "email" | "username",
  value: string,
): Promise<OidcUserLookup[]> {
  const url = new URL(configuration.adminUsersUrl);
  url.searchParams.set(field, value);
  url.searchParams.set("exact", "true");
  url.searchParams.set("briefRepresentation", "true");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new OidcAdminError("provider");
  return (await response.json()) as OidcUserLookup[];
}

function oidcAdminConfiguration(): OidcAdminConfiguration {
  const {
    FACTORY_AUTH_MODE: authMode,
    FACTORY_OIDC_ISSUER: issuer,
    FACTORY_OIDC_ADMIN_CLIENT_ID: clientId,
    FACTORY_OIDC_ADMIN_CLIENT_SECRET: clientSecret,
  } = dashboardConfig;
  if (authMode !== "oidc" || !issuer || !clientId || !clientSecret) {
    throw new OidcAdminError("configuration");
  }
  const issuerUrl = new URL(issuer);
  const match = /^\/realms\/([^/]+)\/?$/.exec(issuerUrl.pathname);
  if (!match?.[1]) throw new OidcAdminError("configuration");
  const adminUsersUrl = new URL(
    `/admin/realms/${encodeURIComponent(match[1])}/users`,
    issuerUrl.origin,
  );
  return { issuer, adminUsersUrl, clientId, clientSecret };
}

async function adminAccessToken(configuration: OidcAdminConfiguration): Promise<string> {
  const response = await fetch(
    new URL("protocol/openid-connect/token", `${configuration.issuer}/`),
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new OidcAdminError("provider");
  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string" || body.access_token.length < 20) {
    throw new OidcAdminError("provider");
  }
  return body.access_token;
}
