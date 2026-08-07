import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client/client";

export { PrismaPublicationCommandRepository } from "./publication-command-repository";

export interface DatabaseOptions {
  connectionString: string;
}
export function databaseUrlFromEnv(environment: Record<string, string | undefined>): string {
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");
  return connectionString;
}
export function createDatabaseClient(options: DatabaseOptions): PrismaClient {
  return new PrismaClient({
    // Dashboard rendering and server actions run concurrently; keep a real pool so one
    // request never attempts to issue another query over an in-flight connection.
    adapter: new PrismaPg({
      connectionString: directPostgresUrl(options.connectionString),
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
    }),
  });
}

export function directPostgresUrl(connectionString: string): string {
  if (!connectionString.startsWith("prisma+postgres://")) return connectionString;
  try {
    const apiKey = new URL(connectionString).searchParams.get("api_key");
    if (!apiKey) throw new Error("MISSING_API_KEY");
    const payload = JSON.parse(Buffer.from(apiKey, "base64url").toString("utf8")) as {
      databaseUrl?: unknown;
    };
    if (
      typeof payload.databaseUrl !== "string" ||
      !/^postgres(?:ql)?:\/\//.test(payload.databaseUrl)
    ) {
      throw new Error("MISSING_DIRECT_URL");
    }
    return payload.databaseUrl;
  } catch (error) {
    throw new Error("PRISMA_PG_REQUIRES_DIRECT_DATABASE_URL", { cause: error });
  }
}
export type DatabaseClient = PrismaClient;
export type DatabaseTransaction = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function enforceRateLimit(
  client: PrismaClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const digest = createHash("sha256").update(key).digest("hex");
  const rows = await client.$queryRaw<{ allowed: boolean; retryAfterSeconds: number }[]>`
    SELECT allowed, retry_after_seconds AS "retryAfterSeconds"
    FROM consume_rate_limit(${digest}, ${limit}, ${windowSeconds})
  `;
  if (!rows[0]?.allowed)
    throw new RateLimitExceededError(rows[0]?.retryAfterSeconds ?? windowSeconds);
}

export class RateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitExceededError";
  }
}

export async function withTenantTransaction<T>(
  client: PrismaClient,
  context: { organizationId: string; actorId: string; correlationId: string },
  work: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await client.$transaction(
        async (transaction) => {
          await transaction.$executeRaw`SELECT set_config('app.organization_id', ${context.organizationId}, true), set_config('app.actor_id', ${context.actorId}, true), set_config('app.correlation_id', ${context.correlationId}, true)`;
          return work(transaction);
        },
        { maxWait: 15_000, timeout: 30_000 },
      );
    } catch (error) {
      if (attempt === 0 && isRecoverableTransactionError(error)) continue;
      throw error;
    }
  }
  throw new Error("TENANT_TRANSACTION_RETRY_EXHAUSTED");
}

function isRecoverableTransactionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("bind message supplies") ||
    message.includes("prepared statement") ||
    message.includes("Transaction not found") ||
    message.includes("expired transaction") ||
    message.includes("Transaction API error") ||
    message.includes("Connection terminated unexpectedly") ||
    message.includes("Server has closed the connection")
  );
}
