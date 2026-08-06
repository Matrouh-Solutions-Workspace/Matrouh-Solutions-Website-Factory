import { createDatabaseClient, type DatabaseClient } from "@factory/database";
import { dashboardConfig } from "./config";
const shared = globalThis as unknown as { factoryDashboardDatabase?: DatabaseClient };

export function dashboardDatabase(): DatabaseClient {
  shared.factoryDashboardDatabase ??= createDatabaseClient({
    connectionString: dashboardConfig.DATABASE_URL,
  });
  return shared.factoryDashboardDatabase;
}
