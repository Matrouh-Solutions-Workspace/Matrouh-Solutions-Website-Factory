import { createDatabaseClient, type DatabaseClient } from "@factory/database";
import { dashboardConfig } from "./config";
const shared = globalThis as unknown as { factoryDashboardDatabaseV2?: DatabaseClient };

export function dashboardDatabase(): DatabaseClient {
  shared.factoryDashboardDatabaseV2 ??= createDatabaseClient({
    connectionString: dashboardConfig.DATABASE_URL,
  });
  return shared.factoryDashboardDatabaseV2;
}

export async function resetDashboardDatabase(): Promise<DatabaseClient> {
  const previous = shared.factoryDashboardDatabaseV2;
  delete shared.factoryDashboardDatabaseV2;
  await previous?.$disconnect().catch(() => undefined);
  return dashboardDatabase();
}

export function isRecoverableDatabaseConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated unexpectedly") ||
    message.includes("bind message supplies") ||
    message.includes("prepared statement") ||
    message.includes("Transaction not found") ||
    message.includes("getaddrinfo ENOENT") ||
    message.includes("getaddrinfo EAI_AGAIN")
  );
}
