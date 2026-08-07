CREATE OR REPLACE FUNCTION find_active_membership_for_user(p_user_id uuid)
RETURNS TABLE (membership_id uuid, organization_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT membership.id, membership.organization_id
  FROM memberships membership
  JOIN organizations organization ON organization.id = membership.organization_id
  WHERE membership.user_id = p_user_id AND membership.status = 'active' AND organization.status = 'active'
  ORDER BY membership.created_at, membership.id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION find_active_membership_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_active_membership_for_user(uuid) TO factory_app;
