# ADR 0001: Deployment topology

- Status: Accepted
- Date: 2026-08-06

## Decision

Deploy dashboard, renderer, and worker as three independently scalable Node.js 22 workloads. Use a
managed PostgreSQL primary, a read-only renderer role, shared object storage, and a CDN/reverse
proxy. Renderer instances remain stateless. Worker and dashboard cannot rely on a shared local
filesystem in production.

Local development may run all workloads through `pnpm dev` with filesystem adapters.

## Consequences

Production startup fails when a local-only artifact driver or shared database writer credential is
configured for the renderer. Provider-specific deployment manifests remain adapters outside core.
