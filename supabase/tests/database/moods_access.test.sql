-- Who can see and change public.moods
begin;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');
insert into public.moods (user_id, logged_on, mood, note) values
  ('11111111-1111-1111-1111-111111111111', '2026-10-23', 'neutral', null),
  ('22222222-2222-2222-2222-222222222222', '2026-10-23', 'sad', 'private note');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq($$ select mood from public.moods $$, $$ values ('neutral') $$,
  'Ada sees only her own moods, never Bola''s notes');
select lives_ok(
  $$ insert into public.moods (user_id, logged_on, mood)
     values ('11111111-1111-1111-1111-111111111111', '2026-10-24', 'happy')
     on conflict (user_id, logged_on) do update set mood = excluded.mood $$,
  'Ada can log today''s mood the way the app does (insert or update)'
);
select throws_ok(
  $$ insert into public.moods (user_id, logged_on, mood)
     values ('22222222-2222-2222-2222-222222222222', '2026-10-24', 'happy') $$,
  '42501', null, 'Ada cannot log a mood for Bola'
);
select lives_ok($$ update public.moods set mood = 'sad', note = 'long day' where logged_on = '2026-10-24' $$,
  'Ada can change her mood');
select throws_ok($$ update public.moods set logged_on = '2026-10-01' $$, '42501', null,
  'a check-in''s day cannot be moved');
select lives_ok($$ delete from public.moods where logged_on = '2026-10-23' $$, 'Ada can delete a check-in');
update public.moods set note = 'read by Ada' where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
set local role anon;
select throws_ok($$ select * from public.moods $$, '42501', null,
  'someone who is not signed in cannot read moods');

reset role;
select results_eq(
  $$ select mood, note from public.moods where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('sad', 'private note') $$, 'Ada''s update of Bola''s mood changed nothing');
select results_eq(
  $$ select logged_on::text, mood from public.moods where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('2026-10-24', 'sad') $$, 'Ada''s own changes were saved');

select * from finish();
rollback;
