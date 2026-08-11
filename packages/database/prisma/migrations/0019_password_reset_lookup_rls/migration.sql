-- Password-reset links are resolved before a tenant context exists. The
-- SECURITY DEFINER function from 0018 performs that narrow lookup, so its
-- migration-role owner must be able to bypass the tenant policy just as the
-- other authentication lookup functions do (see 0017).
ALTER TABLE "password_resets" NO FORCE ROW LEVEL SECURITY;
