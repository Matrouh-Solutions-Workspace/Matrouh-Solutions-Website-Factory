CREATE OR REPLACE FUNCTION claim_outbox_event(p_lease_seconds integer DEFAULT 300)
RETURNS TABLE (
  id uuid, organization_id uuid, event_type varchar, event_version integer,
  aggregate_type varchar, aggregate_id varchar, aggregate_revision bigint,
  payload_json jsonb, occurred_at timestamptz, correlation_id varchar,
  causation_id varchar, attempt_count integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH candidate AS (
    SELECT outbox_events.id
    FROM outbox_events
    WHERE organization_id IS NOT NULL
      AND attempt_count < 8
      AND (
        (status IN ('pending', 'failed') AND available_at <= CURRENT_TIMESTAMP)
        OR (status = 'delivering' AND available_at <= CURRENT_TIMESTAMP)
      )
    ORDER BY available_at ASC, occurred_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE outbox_events AS event
  SET status = 'delivering',
      attempt_count = event.attempt_count + 1,
      available_at = CURRENT_TIMESTAMP + make_interval(secs => GREATEST(30, LEAST(p_lease_seconds, 900)))
  FROM candidate
  WHERE event.id = candidate.id
  RETURNING event.id, event.organization_id, event.event_type, event.event_version,
    event.aggregate_type, event.aggregate_id, event.aggregate_revision,
    event.payload_json, event.occurred_at, event.correlation_id,
    event.causation_id, event.attempt_count;
$$;

CREATE OR REPLACE FUNCTION list_expired_preview_artifacts(p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, organization_id uuid, storage_uri text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT preview_snapshots.id, preview_snapshots.organization_id, preview_snapshots.storage_uri
  FROM preview_snapshots
  WHERE expires_at <= CURRENT_TIMESTAMP
  ORDER BY expires_at ASC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

REVOKE ALL ON FUNCTION claim_outbox_event(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION list_expired_preview_artifacts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_outbox_event(integer) TO factory_worker;
GRANT EXECUTE ON FUNCTION list_expired_preview_artifacts(integer) TO factory_worker;
GRANT SELECT, DELETE ON preview_snapshots TO factory_worker;
