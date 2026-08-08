-- Tenant roles remain subject to row-level security. The migration role owns
-- these tables, however, and the carefully scoped SECURITY DEFINER functions
-- used by authentication and the worker must be able to resolve a tenant
-- before a tenant context exists. FORCE ROW LEVEL SECURITY prevents that even
-- for the function owner, causing those functions to return no rows.
DO $$
DECLARE
  tenant_table record;
BEGIN
  FOR tenant_table IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relforcerowsecurity
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I NO FORCE ROW LEVEL SECURITY',
      tenant_table.schema_name,
      tenant_table.table_name
    );
  END LOOP;
END $$;
