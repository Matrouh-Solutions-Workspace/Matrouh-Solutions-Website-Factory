# ADR 0005: Artifact and media storage

- Status: Accepted
- Date: 2026-08-06

## Decision

Use an S3-compatible object-store adapter for production publication artifacts and media. Objects
use immutable content-addressed keys, server-side encryption, versioning, private access, and
signed upload/read operations. Public media is delivered through a CDN URL adapter.

The filesystem adapter is restricted to local development. Database records retain storage URI,
content hash, byte size, lifecycle, and reference state.

## Consequences

Production services share no writable disk. Retention and garbage collection operate through the
owned storage port and never delete referenced publication assets.
