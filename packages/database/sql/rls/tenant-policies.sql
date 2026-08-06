-- Applied after the generated baseline migration. Every new tenant table must be added here and to RLS tests.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'memberships','roles','role_permissions','membership_roles','clients','websites','website_locales',
    'website_settings_drafts','page_drafts','section_drafts','navigation_drafts','navigation_node_drafts','theme_drafts','seo_drafts',
    'publications','publication_artifacts','publication_activations','preview_snapshots',
    'plugin_installations',
    'domains','domain_verification_attempts','certificate_bindings',
    'media_folders','media_assets','media_variants','media_references',
    'jobs','job_attempts','outbox_events','audit_events','idempotency_records'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
