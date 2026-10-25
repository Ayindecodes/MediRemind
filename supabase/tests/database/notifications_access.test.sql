-- Who can see and change public.notifications
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
insert into public.notifications (user_id, type, message) values
  ('11111111-1111-1111-1111-111111111111', 'refill', 'About 3 days of Amlodipine left'),
  ('22222222-2222-2222-2222-222222222222', 'missed', 'Your 8:00 pm dose isn''t marked yet');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq($$ select type from public.notifications $$, $$ values ('refill') $$,
  'Ada sees only her own notifications');
select lives_ok($$ update public.notifications set read_at = now() $$, 'Ada can mark hers read');
select throws_ok($$ update public.notifications set message = 'Changed' $$, '42501', null,
  'but not rewrite them');
select throws_ok(
  $$ insert into public.notifications (user_id, type, message, action_url)
     values ('22222222-2222-2222-2222-222222222222', 'system', 'Log in again', '/login') $$,
  '42501', null, 'nobody can plant a notification in someone''s list'
);
select throws_ok(
  $$ insert into public.notifications (user_id, type, message)
     values ('11111111-1111-1111-1111-111111111111', 'system', 'Note to self') $$,
  '42501', null, 'not even in their own: only the server creates them'
);
delete from public.notifications where user_id = '22222222-2222-2222-2222-222222222222';
select lives_ok($$ delete from public.notifications $$, 'Ada can clear her list');

reset role;
set local role anon;
select throws_ok($$ select * from public.notifications $$, '42501', null,
  'someone who is not signed in cannot read notifications');

reset role;
select isnt_empty($$ select 1 from public.notifications where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'Ada''s delete did not touch Bola''s notifications');
select is_empty($$ select 1 from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'Ada''s own were cleared');

select * from finish();
rollback;
