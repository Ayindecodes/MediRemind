-- The free plan's limit of 3 active medicines
begin;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com');
insert into public.profiles (id, full_name, phone, plan, plan_expires_at) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111', 'free', null),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222', 'premium', now() + interval '30 days');

-- Ada, on the free plan, has 3 active medicines and one finished course
insert into public.medications (id, user_id, name, schedule, start_date, end_date) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Amlodipine', '{"type": "daily"}', '2026-01-01', null),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Metformin', '{"type": "daily"}', '2026-01-01', null),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Atorvastatin', '{"type": "daily"}', '2026-01-01', null),
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Coartem', '{"type": "course"}', '2026-01-01', '2026-01-03');

-- What an exception's hint says (the API error code the app maps it to)
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics hint = pg_exception_hint;
  return hint;
end $$;

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Lisinopril', '{"type": "daily"}', '2026-10-24') $$,
  'P0001', 'The free plan allows 3 active medicines. Archive one or upgrade to add more.',
  'a 4th active medicine is refused on the free plan (the finished course doesn''t count)'
);
select is(
  pg_temp.hint_of($$ insert into public.medications (user_id, name, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Lisinopril', '{"type": "daily"}', '2026-10-24') $$),
  'upgrade_required', 'the refusal carries the API error code upgrade_required'
);
select lives_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date, end_date)
     values ('11111111-1111-1111-1111-111111111111', 'Old course', '{"type": "course"}', '2025-01-01', '2025-01-05') $$,
  'a course that has already finished can still be recorded'
);
select lives_ok($$ update public.medications set notes = 'with water' where name = 'Amlodipine' $$,
  'editing a medicine at the limit is fine');
select throws_ok($$ update public.medications set end_date = null where name = 'Coartem' $$, 'P0001', null,
  'reopening a finished course would go over the limit');

select lives_ok($$ update public.medications set archived_at = now() where name = 'Atorvastatin' $$,
  'archiving one frees a place');
select lives_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Lisinopril', '{"type": "daily"}', '2026-10-24') $$,
  'so a new one fits'
);
select throws_ok($$ update public.medications set archived_at = null where name = 'Atorvastatin' $$, 'P0001', null,
  'but unarchiving the old one would go over the limit again');

-- The limit holds for server code too, not just signed-in requests
reset role;
select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Server-added', '{"type": "daily"}', '2026-10-24') $$,
  'P0001', null, 'the server cannot go over the free limit either'
);

-- Bola pays, so she has no limit until her plan ends
insert into public.medications (user_id, name, schedule, start_date)
  select '22222222-2222-2222-2222-222222222222', 'Medicine ' || n, '{"type": "daily"}', '2026-10-24'
  from generate_series(1, 5) n;
select is((select count(*)::int from public.medications where user_id = '22222222-2222-2222-2222-222222222222'), 5,
  'a paid plan has no limit');

update public.profiles set plan_expires_at = now() - interval '1 day' where id = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('22222222-2222-2222-2222-222222222222', 'Medicine 6', '{"type": "daily"}', '2026-10-24') $$,
  'P0001', null, 'once a paid plan has ended, the free limit applies'
);

select * from finish();
rollback;
