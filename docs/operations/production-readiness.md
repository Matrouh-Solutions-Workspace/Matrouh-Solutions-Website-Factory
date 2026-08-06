# Production readiness gate

Release approval requires recorded evidence for every item below.

- [ ] Accepted ADRs still match deployed providers and topology.
- [ ] Production configuration validation passes with no local-only adapters.
- [ ] Database migrations and read-only post-migration verification pass.
- [ ] Renderer uses a read-only database role and cannot read draft tables.
- [ ] Object-store versioning, encryption, retention, and CDN policies are enabled.
- [ ] OIDC login, session rotation/revocation, RBAC, and privileged audit events work.
- [ ] DNS ownership, TLS issuance/renewal, reassignment, and takeover defenses work.
- [ ] Upload quarantine, byte validation, scanning, variants, quotas, and GC work.
- [ ] Publish retry/idempotency, cache invalidation, failed publish, and rollback work.
- [ ] Rate limits cover authentication, uploads, preview creation, and public dynamic endpoints.
- [ ] Dashboards and alerts cover errors, latency, queue depth, dead letters, pool saturation, and RLS denials.
- [ ] Backup/PITR and isolated object-consistent restore drill meet RPO/RTO.
- [ ] Security threat-model findings are closed or explicitly accepted.
- [ ] Accessibility and performance budgets are approved.
- [ ] A Doctor and Clinic canary succeeds through create, edit, preview, publish, and rollback.

Deferred marketplace, active-active multi-region writes, real-time collaboration, and AI generation
are not launch requirements.
