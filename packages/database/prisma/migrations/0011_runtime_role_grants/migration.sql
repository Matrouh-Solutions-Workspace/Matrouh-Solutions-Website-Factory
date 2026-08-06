REVOKE ALL ON rate_limit_buckets, service_heartbeats FROM PUBLIC;
REVOKE ALL ON FUNCTION consume_rate_limit(varchar, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION consume_rate_limit(varchar, integer, integer) TO factory_app;
GRANT SELECT ON service_heartbeats TO factory_app;

GRANT DELETE ON clients, websites, website_locales, website_settings_drafts,
  page_drafts, section_drafts, navigation_drafts, navigation_node_drafts,
  theme_drafts, seo_drafts, publications, publication_artifacts,
  publication_activations, preview_snapshots, plugin_installations, domains,
  domain_verification_attempts, certificate_bindings, media_folders,
  media_assets, media_variants, media_references, jobs, job_attempts,
  outbox_events, idempotency_records TO factory_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON service_heartbeats TO factory_worker;
GRANT DELETE ON rate_limit_buckets, sessions, idempotency_records, audit_events,
  media_assets, media_variants TO factory_worker;

GRANT SELECT ON template_versions TO factory_renderer;
