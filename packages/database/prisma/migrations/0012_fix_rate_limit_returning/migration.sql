CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key varchar(64),
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  current_count integer;
  current_expiry timestamptz;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid rate limit';
  END IF;

  INSERT INTO rate_limit_buckets AS bucket (
    key, count, window_started_at, expires_at, updated_at
  ) VALUES (
    p_key, 1, CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + make_interval(secs => p_window_seconds), CURRENT_TIMESTAMP
  )
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN bucket.expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE bucket.count + 1 END,
    window_started_at = CASE
      WHEN bucket.expires_at <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
      ELSE bucket.window_started_at
    END,
    expires_at = CASE
      WHEN bucket.expires_at <= CURRENT_TIMESTAMP
      THEN CURRENT_TIMESTAMP + make_interval(secs => p_window_seconds)
      ELSE bucket.expires_at
    END,
    updated_at = CURRENT_TIMESTAMP
  RETURNING bucket.count, bucket.expires_at
    INTO current_count, current_expiry;

  RETURN QUERY SELECT
    current_count <= p_limit,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (current_expiry - CURRENT_TIMESTAMP)))::integer);
END;
$$;
