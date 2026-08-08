-- The worker shares DATABASE_URL with application processes. In production the
-- login role therefore inherits the narrowly scoped worker role, whose function
-- and table grants are defined by the earlier worker migrations.
GRANT factory_worker TO factory_app;
