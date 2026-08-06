import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.url().optional());
const optionalText = (minimum: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().min(minimum).optional());

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    FACTORY_DEPLOYMENT_MODE: z.enum(["local", "production"]).default("local"),
    DATABASE_URL: z.url(),
    DATABASE_RENDERER_URL: optionalUrl,
    FACTORY_BASE_DOMAIN: z.string().trim().min(1).default("localhost"),
    FACTORY_RENDERER_PUBLIC_URL: z.url().default("http://localhost:3001"),
    FACTORY_ARTIFACT_DRIVER: z.enum(["local", "s3"]).default("local"),
    FACTORY_ARTIFACT_DIRECTORY: z.string().trim().min(1).default("artifacts"),
    FACTORY_S3_BUCKET: optionalText(3),
    FACTORY_S3_REGION: z.string().trim().min(1).default("us-east-1"),
    FACTORY_S3_ENDPOINT: optionalUrl,
    FACTORY_S3_PREFIX: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9/_-]*$/)
      .default("factory"),
    FACTORY_S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
    FACTORY_TEMPLATE_DIRECTORY: z.string().trim().min(1).default("templates"),
    PREVIEW_SIGNING_SECRET: z.string().min(32),
    FACTORY_AUTH_MODE: z.enum(["demo", "oidc"]).default("demo"),
    FACTORY_OIDC_ISSUER: optionalUrl,
    FACTORY_OIDC_CLIENT_ID: optionalText(3),
    FACTORY_OIDC_CLIENT_SECRET: optionalText(8),
    FACTORY_OIDC_REDIRECT_URI: optionalUrl,
    FACTORY_DEMO_SESSION_TOKEN: optionalText(32),
    FACTORY_CACHE_INVALIDATION_URL: optionalUrl,
    FACTORY_CACHE_INVALIDATION_SECRET: optionalText(32),
    FACTORY_DOMAIN_CHALLENGE_SECRET: optionalText(32),
    FACTORY_DOMAIN_PROVIDER_URL: optionalUrl,
    FACTORY_DOMAIN_PROVIDER_SECRET: optionalText(32),
    FACTORY_MEDIA_PROVIDER_URL: optionalUrl,
    FACTORY_MEDIA_PROVIDER_SECRET: optionalText(32),
    FACTORY_MEDIA_PUBLIC_BASE_URL: optionalUrl,
    FACTORY_MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .max(100_000_000)
      .default(5_000_000),
    FACTORY_MAX_ORGANIZATION_MEDIA_BYTES: z.coerce.number().int().positive().default(1_000_000_000),
    FACTORY_STANDARD_AUDIT_RETENTION_DAYS: z.coerce.number().int().min(30).default(365),
    FACTORY_SECURITY_AUDIT_RETENTION_DAYS: z.coerce.number().int().min(90).default(730),
    FACTORY_METRICS_SECRET: optionalText(32),
  })
  .superRefine((value, context) => {
    if (value.FACTORY_DEPLOYMENT_MODE !== "production") return;
    if (
      value.FACTORY_AUTH_MODE !== "oidc" ||
      !value.FACTORY_OIDC_ISSUER ||
      !value.FACTORY_OIDC_CLIENT_ID ||
      !value.FACTORY_OIDC_CLIENT_SECRET ||
      !value.FACTORY_OIDC_REDIRECT_URI
    ) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_AUTH_MODE"],
        message: "Production requires a complete OIDC configuration",
      });
    }
    if (value.FACTORY_DEMO_SESSION_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_DEMO_SESSION_TOKEN"],
        message: "Demo session credentials are forbidden in production",
      });
    }
    if (!value.FACTORY_METRICS_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_METRICS_SECRET"],
        message: "Production requires an authentication secret for operational metrics",
      });
    }
    if (!value.DATABASE_RENDERER_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_RENDERER_URL"],
        message: "Production renderer requires a dedicated read-only database URL",
      });
    }
    if (!value.FACTORY_RENDERER_PUBLIC_URL.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_RENDERER_PUBLIC_URL"],
        message: "Production renderer public URL must use HTTPS",
      });
    }
    if (value.FACTORY_ARTIFACT_DRIVER === "local") {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_ARTIFACT_DRIVER"],
        message: "Production requires a shared artifact driver",
      });
    }
    if (value.FACTORY_ARTIFACT_DRIVER === "s3" && !value.FACTORY_S3_BUCKET) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_S3_BUCKET"],
        message: "S3 artifact storage requires a bucket",
      });
    }
    const invalidation = [
      value.FACTORY_CACHE_INVALIDATION_URL,
      value.FACTORY_CACHE_INVALIDATION_SECRET,
    ];
    if (!invalidation.every(Boolean)) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_CACHE_INVALIDATION_URL"],
        message: "Production requires a signed cache invalidation endpoint",
      });
    }
    if (!value.FACTORY_DOMAIN_CHALLENGE_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_DOMAIN_CHALLENGE_SECRET"],
        message: "Production requires an independent domain challenge secret",
      });
    }
    if (!value.FACTORY_DOMAIN_PROVIDER_URL || !value.FACTORY_DOMAIN_PROVIDER_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_DOMAIN_PROVIDER_URL"],
        message: "Production requires a signed DNS/TLS provider adapter",
      });
    }
    if (
      !value.FACTORY_MEDIA_PROVIDER_URL ||
      !value.FACTORY_MEDIA_PROVIDER_SECRET ||
      !value.FACTORY_MEDIA_PUBLIC_BASE_URL
    ) {
      context.addIssue({
        code: "custom",
        path: ["FACTORY_MEDIA_PROVIDER_URL"],
        message: "Production requires media storage, scanning, variants, and a public CDN adapter",
      });
    }
  });

export type FactoryConfig = Readonly<z.infer<typeof environmentSchema>>;

export function loadConfig(environment: Record<string, string | undefined>): FactoryConfig {
  return Object.freeze(environmentSchema.parse(environment));
}

export function loadWorkspaceEnvironment(
  workspaceRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const path = resolve(workspaceRoot, ".env.local");
  if (!existsSync(path)) return environment;
  for (const sourceLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!key || rawValue === undefined || environment[key] !== undefined) continue;
    environment[key] = unquote(rawValue.trim());
  }
  return environment;
}

function unquote(value: string): string {
  if (value.length >= 2 && value[0] === value.at(-1) && (value[0] === '"' || value[0] === "'")) {
    return value.slice(1, -1);
  }
  return value;
}
