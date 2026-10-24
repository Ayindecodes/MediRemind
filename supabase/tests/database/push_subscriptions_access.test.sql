-- Who can see and change public.push_subscriptions
begin;
select plan(8);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com');
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('22222222-2222-2222-2222-222222222222', 'https://push.example/bola', 'bola-key', 'bola-secret');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select is_empty($$ select 1 from public.push_subscriptions $$,
  'Ada cannot see Bola''s devices or their keys');
select lives_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     values ('11111111-1111-1111-1111-111111111111', 'https://push.example/ada', 'ada-key', 'ada-secret', 'Chrome on Android') $$,
  'Ada can register her phone'
);
select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('22222222-2222-2222-2222-222222222222', 'https://push.example/evil', 'k', 's') $$,
  '42501', null, 'Ada cannot register a device to receive Bola''s reminders'
);
select throws_ok($$ update public.push_subscriptions set endpoint = 'https://push.example/other' $$, '42501', null,
  'a registered device cannot be redirected');
delete from public.push_subscriptions where user_id = '22222222-2222-2222-2222-222222222222';
select lives_ok($$ delete from public.push_subscriptions $$, 'Ada can remove her own device');

reset role;
set local role anon;
select throws_ok($$ select * from public.push_subscriptions $$, '42501', null,
  'someone who is not signed in cannot read devices');

reset role;
select isnt_empty($$ select 1 from public.push_subscriptions where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'Ada''s delete did not remove Bola''s device');
select is_empty($$ select 1 from public.push_subscriptions where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'Ada''s own device was removed');

select * from finish();
rollback;
