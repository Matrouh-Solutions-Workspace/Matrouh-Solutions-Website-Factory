# Backup and restore runbook

## Targets

- RPO: 15 minutes or less.
- RTO: four hours or less.
- Drill frequency: quarterly and before destructive schema contracts.

## Backup requirements

Enable PostgreSQL continuous backup/PITR and daily snapshots. Enable object versioning and lifecycle
protection for publication artifacts and referenced media. Store provider configuration and restore
credentials in the secret manager, separate from application credentials.

## Isolated restore drill

1. Create a new isolated database and artifact bucket with no production routing.
2. Restore both systems to the same recorded recovery point.
3. Apply only migrations already deployed at that recovery point.
4. Run database readiness and tenant-policy verification with a non-owner role.
5. Compare every retained `publication_artifacts.content_hash` with the restored object bytes.
6. Start a renderer against the isolated read-only role and render the canary publications.
7. Record achieved RPO/RTO, missing objects, hash failures, and follow-up owners.
8. Destroy isolated resources after evidence is retained.

## Incident restore

Freeze writes, preserve logs and the current recovery point, select a recovery timestamp before the
incident, restore to new resources, run the isolated verification steps, then switch routing. Do not
overwrite the damaged primary. Website activation remains the authoritative pointer after restore.
