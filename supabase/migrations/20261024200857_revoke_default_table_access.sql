-- Start the access rules from nothing.
--
-- Supabase grants every privilege on new public tables to `anon` (anyone with the public key) and
-- `authenticated` (anyone signed in). Row level security limits which rows they reach, but not which
-- columns they can change: with the default grants, "people may update their own profile" would let
-- them update their own plan. So all of it is taken away here, and the migrations that follow grant
-- back only what each table needs, column by column.
--
-- The service role (server code only) keeps full access and bypasses row level security.

revoke all on all tables in schema public from anon, authenticated;

-- Tables created by later migrations start with no access either
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
