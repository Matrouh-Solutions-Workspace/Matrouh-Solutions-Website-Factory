# ADR 0007: Template trust model

- Status: Accepted
- Date: 2026-08-06

## Decision

The first release executes first-party, allowlisted template artifacts only. Installation records
artifact and manifest hashes, build provenance, dependency policy results, compatibility report,
and lifecycle state. A changed artifact under an existing version is quarantined.

Untrusted marketplace execution, arbitrary post-install hooks, and undeclared network/filesystem
capabilities are prohibited.

## Consequences

Doctor and Clinic run in-process. Third-party marketplace support requires a new ADR covering
signature authorities and process/container isolation.
