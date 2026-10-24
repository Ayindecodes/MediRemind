-- Rules every migration must keep, checked across the whole public schema
begin;
select plan(5);

select tables_are('public', array[
  'profiles', 'medications', 'dose_logs', 'moods', 'notifications', 'notification_prefs',
  'push_subscriptions', 'reminder_deliveries', 'subscriptions', 'payment_events'
], 'the public schema has exactly the planned tables (add new ones here deliberately)');

-- Supabase serves the public schema over its API, so a table without RLS is open to anyone
select is_empty(
  $$ select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity $$,
  'every table has row level security on'
);

select is_empty(
  $$ select c.table_name from information_schema.columns c
     where c.table_schema = 'public' and c.column_name = 'updated_at'
       and not exists (
         select 1 from pg_trigger t
         where t.tgrelid = format('public.%I', c.table_name)::regclass and t.tgname = 'set_updated_at'
       ) $$,
  'every table with updated_at keeps it current'
);

-- Anyone with the public key is `anon`; nothing in the schema is for them
select is_empty(
  $$ select table_name || ': ' || privilege_type from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' $$,
  'anon (the public key, not signed in) has no access to any table'
);

-- A function without a fixed search_path can be tricked into using someone else's objects
select is_empty(
  $$ select p.proname from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and not exists (select 1 from unnest(p.proconfig) setting where setting like 'search_path=%') $$,
  'every function pins its search_path'
);

select * from finish();
rollback;
