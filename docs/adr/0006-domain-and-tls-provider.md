# ADR 0006: Domain and TLS provider boundary

- Status: Accepted
- Date: 2026-08-06

## Decision

Custom domains use DNS TXT ownership challenges and a capability-based DNS/TLS adapter. Cloudflare
is the initial supported provider, but provider identifiers remain outside core domain entities.
Local `.localhost` names bypass external verification only in development.

## Consequences

A custom domain cannot become active until ownership, routing, certificate issuance, and final TLS
checks succeed. Challenges are random, expire, rotate on reassignment, and reveal no tenant data.
