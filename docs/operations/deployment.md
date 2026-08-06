# Production deployment

This runbook implements the decisions under `docs/adr`. Local adapters are intentionally rejected
when `FACTORY_DEPLOYMENT_MODE=production`. `NODE_ENV=production` alone denotes an optimized build
and does not require runtime secrets during compilation.

## Required services

- managed PostgreSQL with PITR and separate migrator, dashboard/worker, and read-only renderer roles;
- three independently deployed Node.js 22 workloads: dashboard, renderer, and worker;
- S3-compatible private object storage with versioning and a public media CDN;
- DNS/TLS provider credentials scoped to the managed zone;
- signed media provider for object writes, scanning, variants, deletion, and its public CDN;
- OIDC provider credentials and an application secret manager.

A Redis-compatible shared cache is optional for measured scale needs. PostgreSQL is authoritative
for queueing and atomic rate limits; renderer HTML does not depend on a shared cache for correctness.

## Release sequence

1. Build one immutable revision with `pnpm install --frozen-lockfile` and `pnpm build`.
2. Back up the database and record the recovery point.
3. Run `pnpm db:deploy` once with the migrator role.
4. Run `pnpm db:verify` and retain its output with the deployment record.
5. Run `pnpm templates:sync`; any immutable-hash conflict or quarantined artifact stops deployment.
6. Deploy worker, renderer, then dashboard using the same revision.
7. Check `/api/ready` on dashboard and renderer, scrape authenticated `/api/metrics`, and confirm a
   fresh worker heartbeat.
8. Publish a synthetic canary site and verify hostname resolution, cache invalidation, and rollback.
9. Retain the previous application revision until the canary and error budget remain healthy.

Never run `prisma db push` in production. Never mount `.env.local` into an image; inject secrets at
runtime. A failed migration or canary stops the rollout and follows the migration roll-forward plan.
