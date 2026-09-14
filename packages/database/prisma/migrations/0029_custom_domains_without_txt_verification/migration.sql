-- Website-scoped custom domains are configured explicitly by a platform administrator.
-- DNS ownership TXT challenges are no longer part of this workflow. Activate any routes
-- left waiting by the former verifier and close only their obsolete verification jobs.
UPDATE domains
SET status = 'active', revision = revision + 1, updated_at = CURRENT_TIMESTAMP
WHERE kind = 'custom' AND released_at IS NULL AND status IN ('pending', 'verifying', 'verified', 'connecting');

UPDATE jobs AS job
SET status = 'succeeded',
    completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
    locked_at = NULL,
    lock_owner = NULL,
    lock_expires_at = NULL
WHERE job.job_type = 'domain.verify'
  AND job.status IN ('queued', 'running', 'retryable')
  AND EXISTS (
    SELECT 1
    FROM domains AS domain_row
    WHERE domain_row.id::text = job.payload_json ->> 'domainId'
      AND domain_row.kind = 'custom'
      AND domain_row.released_at IS NULL
  );
