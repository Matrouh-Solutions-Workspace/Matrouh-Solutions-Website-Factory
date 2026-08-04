import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client/client";

export interface DatabaseOptions {
  connectionString: string;
}
export function createDatabaseClient(options: DatabaseOptions): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: options.connectionString }),
  });
}
export type DatabaseClient = PrismaClient;

export async function withTenantTransaction<T>(
  client: PrismaClient,
  context: { organizationId: string; actorId: string; correlationId: string },
  work: (transaction: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.organization_id', ${context.organizationId}, true), set_config('app.actor_id', ${context.actorId}, true), set_config('app.correlation_id', ${context.correlationId}, true)`;
    return work(transaction);
  });
}
