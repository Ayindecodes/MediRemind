-- public.dose_logs
begin;
select plan(14);

select has_table('public', 'dose_logs', 'dose_logs exists');
select columns_are('public', 'dose_logs', array[
  'id', 'user_id', 'medication_id', 'scheduled_for', 'status', 'taken_at', 'skip_reason', 'source',
  'created_at', 'updated_at'
], 'dose_logs has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.dose_logs'::regclass),
  'row level security is on');
select has_index('public', 'dose_logs', 'dose_logs_user_id_scheduled_for_idx',
  'dose logs are indexed by owner and time');

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, email) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', 'bola@example.com');
insert into public.medications (id, user_id, name, schedule, start_date) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Amlodipine',
   '{"type": "daily", "times": ["08:00"]}', '2026-10-01');

insert into public.dose_logs (user_id, medication_id, scheduled_for, status, taken_at) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '2026-10-24 08:00+01', 'taken', '2026-10-24 08:05+01');
select is((select source from public.dose_logs), 'app', 'doses are recorded from the app by default');

select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status, taken_at) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-24 07:00+00', 'taken', now()) $$,
  '23505', null, 'the same dose cannot be recorded twice (07:00 UTC is 08:00 in Lagos)'
);
select lives_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-23 08:00+01', 'missed') $$,
  'another dose of the same medicine can be recorded'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-22 08:00+01', 'taken') $$,
  '23514', null, 'a taken dose needs the time it was taken'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status, taken_at) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-22 08:00+01', 'skipped', now()) $$,
  '23514', null, 'a skipped dose has no taken time'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status, skip_reason) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-22 08:00+01', 'missed', 'forgot') $$,
  '23514', null, 'only skipped doses have a reason'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-22 08:00+01', 'upcoming') $$,
  '23514', null, 'upcoming and due are worked out, not stored'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status, source) values
     ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-22 08:00+01', 'missed', 'telegram') $$,
  '23514', null, 'only the known sources'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status) values
     ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '2026-10-22 08:00+01', 'missed') $$,
  '23503', null, 'a dose cannot be logged against someone else''s medicine'
);

delete from public.medications where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is_empty($$ select 1 from public.dose_logs $$,
  'deleting a medicine for good deletes its dose logs');

select * from finish();
rollback;
