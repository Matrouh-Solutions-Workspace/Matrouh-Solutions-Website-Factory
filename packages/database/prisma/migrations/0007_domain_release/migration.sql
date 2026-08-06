DROP INDEX IF EXISTS "domains_hostname_normalized_key";

CREATE UNIQUE INDEX "domains_hostname_active_key"
  ON "domains" ("hostname_normalized")
  WHERE "released_at" IS NULL;

CREATE OR REPLACE FUNCTION claim_factory_job(p_worker_id text)
RETURNS TABLE (
  id uuid, organization_id uuid, job_type varchar, job_version integer, payload_json jsonb,
  attempt_count integer, max_attempts integer, available_at timestamptz, correlation_id varchar
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH candidate AS (
    SELECT jobs.id FROM jobs
    WHERE type IN ('publication.requested', 'domain.verify', 'domain.disconnect')
      AND version = 1 AND organization_id IS NOT NULL
      AND ((status IN ('queued', 'retryable') AND available_at <= CURRENT_TIMESTAMP)
        OR (status = 'running' AND lock_expires_at < CURRENT_TIMESTAMP))
    ORDER BY priority DESC, available_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED LIMIT 1
  )
  UPDATE jobs AS job SET status = 'running', attempt_count = job.attempt_count + 1,
    locked_at = CURRENT_TIMESTAMP, lock_owner = p_worker_id,
    lock_expires_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
  FROM candidate WHERE job.id = candidate.id
  RETURNING job.id, job.organization_id, job.type, job.version, job.payload_json,
    job.attempt_count, job.max_attempts, job.available_at, job.correlation_id;
$$;

REVOKE ALL ON FUNCTION claim_factory_job(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_factory_job(text) TO factory_worker;
