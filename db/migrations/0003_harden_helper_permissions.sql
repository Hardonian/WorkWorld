-- Restrict the SECURITY DEFINER helper to the roles that participate in the
-- WorkWorld access model. The function lives outside the default exposed
-- `public` schema and returns only a boolean membership check.

REVOKE ALL ON FUNCTION workworld.has_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION workworld.has_role(uuid, text) TO authenticated, service_role;
