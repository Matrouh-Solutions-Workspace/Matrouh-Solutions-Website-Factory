import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createDatabaseClient, databaseUrlFromEnv } from "./index";

const workspaceRoot = resolve(process.cwd(), "../..");
for (const path of [resolve(workspaceRoot, ".env.local"), resolve(workspaceRoot, ".env")]) {
  if (existsSync(path)) config({ path });
}
const database = createDatabaseClient({ connectionString: databaseUrlFromEnv(process.env) });

try {
  const [rlsFailures, rendererPrivileges, requiredObjects, migrations] = await Promise.all([
    database.$queryRaw<{ tableName: string }[]>`
      SELECT DISTINCT columns.table_name AS "tableName"
      FROM information_schema.columns AS columns
      JOIN pg_class AS relation ON relation.relname = columns.table_name
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE columns.table_schema = 'public'
        AND columns.column_name = 'organization_id'
        AND namespace.nspname = 'public'
        AND relation.relkind = 'r'
        AND (NOT relation.relrowsecurity OR NOT relation.relforcerowsecurity)
      ORDER BY columns.table_name
    `,
    database.$queryRaw<
      {
        activeSites: boolean;
        previews: boolean;
        templateVersions: boolean;
        drafts: boolean;
      }[]
    >`
      SELECT
        has_table_privilege('factory_renderer', 'renderer_active_sites', 'SELECT') AS "activeSites",
        has_table_privilege('factory_renderer', 'renderer_preview_snapshots', 'SELECT') AS previews,
        has_table_privilege('factory_renderer', 'template_versions', 'SELECT') AS "templateVersions",
        has_table_privilege('factory_renderer', 'section_drafts', 'SELECT') AS drafts
    `,
    database.$queryRaw<
      { activeView: string | null; previewView: string | null; claimJob: string | null }[]
    >`
      SELECT
        to_regclass('public.renderer_active_sites')::text AS "activeView",
        to_regclass('public.renderer_preview_snapshots')::text AS "previewView",
        to_regprocedure('public.claim_factory_job(text)')::text AS "claimJob"
    `,
    database.$queryRaw<{ migrationName: string; finishedAt: Date | null }[]>`
      SELECT migration_name AS "migrationName", finished_at AS "finishedAt"
      FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      ORDER BY started_at
    `,
  ]);
  const privileges = rendererPrivileges[0];
  const objects = requiredObjects[0];
  const unfinished = migrations.filter((migration) => !migration.finishedAt);
  const failures = [
    ...(rlsFailures.length ? [`RLS:${rlsFailures.map((item) => item.tableName).join(",")}`] : []),
    ...(!privileges?.activeSites || !privileges.previews || !privileges.templateVersions
      ? ["RENDERER_REQUIRED_READS"]
      : []),
    ...(privileges?.drafts ? ["RENDERER_DRAFT_ACCESS"] : []),
    ...(!objects?.activeView || !objects.previewView || !objects.claimJob
      ? ["REQUIRED_DATABASE_OBJECTS"]
      : []),
    ...(unfinished.length ? [`UNFINISHED_MIGRATIONS:${unfinished.length}`] : []),
  ];
  if (failures.length)
    throw new Error(`DATABASE_PRODUCTION_VERIFICATION_FAILED:${failures.join(";")}`);
  console.log(
    JSON.stringify({
      service: "database-verifier",
      status: "ready",
      migrations: migrations.length,
      tenantTablesWithForcedRls: "all",
      rendererDraftAccess: false,
    }),
  );
} finally {
  await database.$disconnect();
}
