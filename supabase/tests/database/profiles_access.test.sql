-- Who can see and change public.profiles
begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');

-- Sign in as Ada: what the app's requests run as, carrying her login token's claims
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq($$ select full_name from public.profiles $$, $$ values ('Ada Obi') $$,
  'Ada sees only her own profile');
select lives_ok($$ update public.profiles set full_name = 'Ada Obi-Eze', timezone = 'Europe/London', language = 'yo' $$,
  'Ada can change her name, time zone and language');
update public.profiles set full_name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
select throws_ok($$ update public.profiles set plan = 'premium' $$, '42501', null,
  'Ada cannot give herself a paid plan');
select throws_ok($$ update public.profiles set plan_expires_at = now() + interval '1 year' $$, '42501', null,
  'Ada cannot extend her plan');
select throws_ok($$ update public.profiles set phone = '+2348039999999' $$, '42501', null,
  'Ada cannot change her phone number without verifying it');
select throws_ok($$ insert into public.profiles (id, full_name, phone) values ('33333333-3333-3333-3333-333333333333', 'X', '+2348033333333') $$,
  '42501', null, 'profiles are only created by the server');
select throws_ok($$ delete from public.profiles $$, '42501', null,
  'profiles are only deleted by the server');

-- Not signed in: the public key alone
reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null,
  'someone who is not signed in cannot read profiles');

reset role;
select is((select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'Bola Ade',
  'Ada''s update of Bola''s profile changed nothing');
select results_eq(
  $$ select full_name, timezone, language, plan from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Ada Obi-Eze', 'Europe/London', 'yo', 'free') $$,
  'Ada''s allowed changes were saved, and she is still on the free plan'
);

select * from finish();
rollback;
