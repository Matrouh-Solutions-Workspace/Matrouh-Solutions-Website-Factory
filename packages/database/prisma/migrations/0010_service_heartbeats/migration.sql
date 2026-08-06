CREATE TABLE service_heartbeats (
  instance_id varchar(200) PRIMARY KEY,
  service varchar(80) NOT NULL,
  status varchar(24) NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL
);

CREATE INDEX service_heartbeats_service_heartbeat_at_idx
  ON service_heartbeats (service, heartbeat_at);
