# ADR 0002: Package manager and runtime

- Status: Accepted
- Date: 2026-08-06

## Decision

Use pnpm 10.33.2, Corepack, Node.js 22 LTS or later compatible 22.x release, Turborepo, strict
TypeScript, and committed frozen lockfiles. CI and production builds use `pnpm install
--frozen-lockfile` and `pnpm build`.

## Consequences

Alternative package managers are unsupported. Build and migration commands are non-interactive.
