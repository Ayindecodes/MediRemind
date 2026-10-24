-- Who can see and change public.dose_logs
begin;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com');
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');
insert into public.medications (id, user_id, name, schedule, start_date) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Amlodipine', '{"type": "daily"}', '2026-10-01'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Metformin', '{"type": "daily"}', '2026-10-01');
insert into public.dose_logs (user_id, medication_id, scheduled_for, status, taken_at) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-23 08:00+01', 'taken', '2026-10-23 08:05+01'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-10-23 08:00+01', 'taken', '2026-10-23 08:10+01');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq($$ select medication_id from public.dose_logs $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$, 'Ada sees only her own doses');
select lives_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status, taken_at)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-24 08:00+01', 'taken', now()) $$,
  'Ada can record a dose she took'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status)
     values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-10-24 08:00+01', 'skipped') $$,
  '23503', null, 'Ada cannot record a dose of Bola''s medicine'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status)
     values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-10-24 08:00+01', 'skipped') $$,
  '42501', null, 'nor record one in Bola''s name'
);
select throws_ok(
  $$ insert into public.dose_logs (user_id, medication_id, scheduled_for, status, taken_at, source)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-10-25 08:00+01', 'taken', now(), 'whatsapp') $$,
  '42501', null, 'WhatsApp replies are recorded by the server, not claimed by the app'
);
select lives_ok(
  $$ update public.dose_logs set status = 'skipped', taken_at = null, skip_reason = 'felt unwell'
     where scheduled_for = '2026-10-24 08:00+01' $$,
  'Ada can change a dose she recorded'
);
select throws_ok($$ update public.dose_logs set source = 'caregiver' $$, '42501', null,
  'Ada cannot pretend a caregiver confirmed her dose');
select lives_ok($$ delete from public.dose_logs where scheduled_for = '2026-10-24 08:00+01' $$,
  'Ada can undo a dose record');
update public.dose_logs set status = 'missed', taken_at = null where user_id = '22222222-2222-2222-2222-222222222222';
delete from public.dose_logs where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
set local role anon;
select throws_ok($$ select * from public.dose_logs $$, '42501', null,
  'someone who is not signed in cannot read doses');

reset role;
select results_eq(
  $$ select status from public.dose_logs where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('taken') $$, 'Ada''s update and delete of Bola''s dose changed nothing');
select is((select count(*)::int from public.dose_logs where user_id = '11111111-1111-1111-1111-111111111111'), 1,
  'Ada''s undo removed her new record and kept the older one');

select * from finish();
rollback;
