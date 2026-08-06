# ADR 0003: Authentication and authorization

- Status: Accepted
- Date: 2026-08-06

## Decision

Production authentication uses an OpenID Connect provider behind an owned session adapter. The
Factory stores only hashed opaque session credentials and resolves organization membership and
roles on every control-plane request. Authorization is deny-by-default and action/resource scoped.

The seeded credential flow is development-only and must be disabled in production. Enterprise SSO
is delivered through the same OIDC boundary rather than template or dashboard branches.

## Consequences

Provider selection is deployment configuration. Session rotation, revocation, expiry, secure
cookies, CSRF-safe mutations, and audit events are mandatory.
