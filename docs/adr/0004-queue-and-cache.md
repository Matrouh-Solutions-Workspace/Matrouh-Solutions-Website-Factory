# ADR 0004: Queue and cache

- Status: Accepted
- Date: 2026-08-06

## Decision

Use PostgreSQL job/outbox tables and `SKIP LOCKED` claims as the first-release durable queue.
PostgreSQL also provides the first-release atomic rate-limit buckets so limits remain correct across
dashboard replicas. Renderer hostname/artifact data uses a short bounded in-process cache; public
HTML revalidates at the origin, and outbox consumers send signed invalidation commands. A shared
Redis-compatible cache is an optional measured optimization, not a correctness dependency.

## Consequences

Jobs are idempotent, lease-bound, retryable, and dead-lettered. Cache failure may reduce
performance but cannot change publication correctness. External queue/cache adapters may later
replace these implementations without changing command or rate-limit semantics.
