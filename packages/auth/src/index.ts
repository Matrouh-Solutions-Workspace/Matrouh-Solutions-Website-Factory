import type { Actor } from "@factory/application";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
export interface SessionIdentity {
  userId: string;
  expiresAt: string;
}
export interface SessionProvider {
  resolve(token: string): Promise<SessionIdentity | null>;
  revoke(token: string): Promise<void>;
}
export function authorize(actor: Actor, permission: string): void {
  if (!actor.permissions.includes(permission)) throw new Error("AUTHORIZATION_DENIED");
}

const PASSWORD_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  if (password.length < 10 || password.length > 256) throw new Error("PASSWORD_LENGTH_INVALID");
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || password.length > 256) return false;
  const [scheme, encodedSalt, encodedDigest] = storedHash.split("$");
  if (scheme !== "scrypt" || !encodedSalt || !encodedDigest) return false;
  try {
    const expected = Buffer.from(encodedDigest, "base64url");
    const actual = scryptSync(password, Buffer.from(encodedSalt, "base64url"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export interface OidcClientOptions {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

interface OidcDiscovery {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly jwks_uri: string;
}

export interface OidcIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly name?: string;
}

export class OidcClient {
  private discoveryPromise?: Promise<OidcDiscovery>;

  constructor(private readonly options: OidcClientOptions) {
    if (!options.issuer || !options.clientId || !options.clientSecret || !options.redirectUri) {
      throw new Error("OIDC_CONFIG_INVALID");
    }
  }

  async authorizationUrl(input: {
    state: string;
    nonce: string;
    codeChallenge: string;
  }): Promise<URL> {
    const discovery = await this.discovery();
    const url = new URL(discovery.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: input.state,
      nonce: input.nonce,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
    }).toString();
    return url;
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<OidcIdentity> {
    const discovery = await this.discovery();
    const response = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: this.options.redirectUri,
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`OIDC_TOKEN_EXCHANGE_FAILED_${response.status}`);
    const token = (await response.json()) as { id_token?: unknown };
    if (typeof token.id_token !== "string") throw new Error("OIDC_ID_TOKEN_MISSING");
    const verified = await jwtVerify(
      token.id_token,
      createRemoteJWKSet(new URL(discovery.jwks_uri)),
      {
        issuer: discovery.issuer,
        audience: this.options.clientId,
      },
    );
    if (verified.payload.nonce !== input.nonce || typeof verified.payload.sub !== "string") {
      throw new Error("OIDC_ID_TOKEN_INVALID");
    }
    return {
      issuer: discovery.issuer,
      subject: verified.payload.sub,
      ...(typeof verified.payload.email === "string" ? { email: verified.payload.email } : {}),
      ...(typeof verified.payload.email_verified === "boolean"
        ? { emailVerified: verified.payload.email_verified }
        : {}),
      ...(typeof verified.payload.name === "string" ? { name: verified.payload.name } : {}),
    };
  }

  private discovery(): Promise<OidcDiscovery> {
    this.discoveryPromise ??= loadDiscovery(this.options.issuer);
    return this.discoveryPromise;
  }
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

async function loadDiscovery(issuer: string): Promise<OidcDiscovery> {
  const normalizedIssuer = issuer.replace(/\/$/, "");
  const response = await fetch(`${normalizedIssuer}/.well-known/openid-configuration`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`OIDC_DISCOVERY_FAILED_${response.status}`);
  const value = (await response.json()) as Partial<OidcDiscovery>;
  if (
    value.issuer !== normalizedIssuer ||
    typeof value.authorization_endpoint !== "string" ||
    typeof value.token_endpoint !== "string" ||
    typeof value.jwks_uri !== "string"
  ) {
    throw new Error("OIDC_DISCOVERY_INVALID");
  }
  return value as OidcDiscovery;
}
