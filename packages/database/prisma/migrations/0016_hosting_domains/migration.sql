CREATE TABLE hosting_domains (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hostname_normalized varchar(253) NOT NULL,
  hostname_display varchar(253) NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, hostname_normalized)
);
CREATE INDEX hosting_domains_organization_default_idx ON hosting_domains(organization_id, is_default);
