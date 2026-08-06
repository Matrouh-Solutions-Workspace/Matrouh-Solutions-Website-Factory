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
    adapter: new PrismaPg({ connectionString: options.connectionString }),
  });
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
  return client.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.organization_id', ${context.organizationId}, true), set_config('app.actor_id', ${context.actorId}, true), set_config('app.correlation_id', ${context.correlationId}, true)`;
    return work(transaction);
  });
}
