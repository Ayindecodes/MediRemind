-- Nobody can read anyone else's data. This finds every table a signed-in person can read and checks
-- that, signed in as Ada, none of its rows belong to someone else. A table added later is checked
-- automatically, and the test fails until the fixture below gives it some of Bola's data.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');

-- One row of each kind for both people
insert into public.medications (id, user_id, name, schedule, start_date) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Amlodipine', '{"type": "daily"}', '2026-10-01'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Metformin', '{"type": "daily"}', '2026-10-01');
insert into public.dose_logs (user_id, medication_id, scheduled_for, status) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-23 08:00+01', 'missed'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-10-23 08:00+01', 'missed');
insert into public.moods (user_id, logged_on, mood) values
  ('11111111-1111-1111-1111-111111111111', '2026-10-23', 'happy'),
  ('22222222-2222-2222-2222-222222222222', '2026-10-23', 'sad');
insert into public.notifications (user_id, type, message) values
  ('11111111-1111-1111-1111-111111111111', 'system', 'Welcome'),
  ('22222222-2222-2222-2222-222222222222', 'system', 'Welcome');
insert into public.notification_prefs (user_id) values
  ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('11111111-1111-1111-1111-111111111111', 'https://push.example/ada', 'k', 's'),
  ('22222222-2222-2222-2222-222222222222', 'https://push.example/bola', 'k', 's');
insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo) values
  ('11111111-1111-1111-1111-111111111111', 'premium', 'monthly', '2026-10-01', '2026-11-01', 150000),
  ('22222222-2222-2222-2222-222222222222', 'premium', 'monthly', '2026-10-01', '2026-11-01', 150000);

-- Every table a signed-in person can read anything from, and the column that says whose a row is
create temporary table readable as
  select c.relname::text as table_name,
         case when exists (
           select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'user_id' and not a.attisdropped
         ) then 'user_id' else 'id' end as owner_column
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and has_any_column_privilege('authenticated', c.oid, 'SELECT');
grant select on readable to authenticated;

-- How many rows of a table, visible to whoever runs it, belong to someone other than Ada
create function pg_temp.rows_not_owned_by_ada(table_name text, owner_column text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from public.%I where %I <> %L', table_name, owner_column,
                 '11111111-1111-1111-1111-111111111111') into n;
  return n;
end $$;

select plan((select count(*)::int * 2 + 1 from readable));

select ok((select count(*) from readable) >= 8, 'the tables people use are readable when signed in');

-- As the server: the fixture really does hold someone else's data in every readable table
select ok(pg_temp.rows_not_owned_by_ada(table_name, owner_column) > 0,
          table_name || ': the test data includes someone else''s rows')
from readable order by table_name;

-- As Ada: none of it is visible
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select is(pg_temp.rows_not_owned_by_ada(table_name, owner_column), 0::bigint,
          table_name || ': Ada sees none of Bola''s rows')
from readable order by table_name;

select * from finish();
rollback;
