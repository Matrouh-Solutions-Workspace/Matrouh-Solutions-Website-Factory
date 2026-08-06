# ADR 0008: Availability, retention, and recovery baseline

- Status: Accepted
- Date: 2026-08-06

## Decision

Initial targets are 99.9% monthly public-render availability, RPO at most 15 minutes, and RTO at
most four hours. Production PostgreSQL uses continuous backup/PITR; object storage uses versioning.
Restore drills run quarterly into an isolated environment and verify database/artifact hashes.

Preview artifacts expire after one hour at most. Audit records are retained for one year by
default. Publication retention keeps the active version and at least five rollback-ready versions
for 90 days, subject to longer legal policy. Organization erasure is an audited stateful workflow.

## Consequences

Launch requires provider backup configuration, alerting, a completed restore drill, and recorded
evidence. Retention values may be increased by plan/compliance policy but not silently shortened.
