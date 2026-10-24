-- Who can see and change public.medications
begin;
select plan(13);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com');
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');
insert into public.medications (id, user_id, name, schedule, start_date) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Amlodipine', '{"type": "daily"}', '2026-10-01'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Metformin', '{"type": "daily"}', '2026-10-01');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq($$ select name from public.medications $$, $$ values ('Amlodipine') $$,
  'Ada sees only her own medicines');
select lives_ok(
  $$ insert into public.medications (user_id, name, strength, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Lisinopril', '10 mg', '{"type": "daily"}', '2026-10-24') $$,
  'Ada can add a medicine'
);
select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('22222222-2222-2222-2222-222222222222', 'Planted', '{"type": "daily"}', '2026-10-24') $$,
  '42501', null, 'Ada cannot add a medicine to Bola''s list'
);
select throws_ok(
  $$ insert into public.medications (id, user_id, name, schedule, start_date)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'X', '{"type": "daily"}', '2026-10-24') $$,
  '42501', null, 'IDs are chosen by the database, not the app'
);
select lives_ok($$ update public.medications set notes = 'after food', archived_at = now() where name = 'Amlodipine' $$,
  'Ada can edit and archive her own medicine');
update public.medications set name = 'Hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
select throws_ok($$ update public.medications set user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'Ada cannot hand her medicines to someone else');
select throws_ok($$ update public.medications set photo_path = 'pills/x.jpg' $$, '42501', null,
  'photos are added by the server, which checks the plan');
select throws_ok($$ update public.medications set paused_at = null $$, '42501', null,
  'Ada cannot unpause a medicine her plan paused');
select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date, photo_path)
     values ('11111111-1111-1111-1111-111111111111', 'X', '{"type": "daily"}', '2026-10-24', 'pills/x.jpg') $$,
  '42501', null, 'nor attach a photo when adding one'
);
select throws_ok($$ delete from public.medications $$, '42501', null,
  'medicines are archived, not deleted');

reset role;
set local role anon;
select throws_ok($$ select * from public.medications $$, '42501', null,
  'someone who is not signed in cannot read medicines');

reset role;
select is((select name from public.medications where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'Metformin',
  'Ada''s update of Bola''s medicine changed nothing');
select is((select count(*)::int from public.medications where user_id = '11111111-1111-1111-1111-111111111111'), 2,
  'Ada''s new medicine was saved');

select * from finish();
rollback;
