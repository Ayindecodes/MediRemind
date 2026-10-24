-- Who can see and change public.subscriptions
begin;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');
insert into public.subscriptions
  (user_id, plan, billing, status, current_period_start, current_period_end, amount_kobo, paystack_email_token) values
  ('11111111-1111-1111-1111-111111111111', 'premium', 'monthly', 'active', '2026-10-01', '2026-11-01', 150000, 'ada-token'),
  ('22222222-2222-2222-2222-222222222222', 'family', 'yearly', 'active', '2026-01-01', '2027-01-01', 3500000, 'bola-token');

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select plan, billing, status, amount_kobo from public.subscriptions $$,
  $$ values ('premium', 'monthly', 'active', 150000) $$,
  'Ada sees her own plan, and not Bola''s'
);
select throws_ok($$ select paystack_email_token from public.subscriptions $$, '42501', null,
  'Paystack''s token for managing the subscription stays on the server');
select throws_ok(
  $$ insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo)
     values ('11111111-1111-1111-1111-111111111111', 'family', 'yearly', now(), now() + interval '1 year', 1) $$,
  '42501', null, 'nobody can give themselves a subscription without paying'
);
select throws_ok($$ update public.subscriptions set current_period_end = '2099-01-01' $$, '42501', null,
  'nor extend one');
select throws_ok($$ delete from public.subscriptions $$, '42501', null,
  'nor delete one (cancelling goes through Paystack)');

reset role;
set local role anon;
select throws_ok($$ select plan from public.subscriptions $$, '42501', null,
  'someone who is not signed in cannot read subscriptions');

reset role;
select is((select count(*)::int from public.subscriptions), 2, 'nothing was added or removed');
select is((select current_period_end from public.subscriptions where user_id = '11111111-1111-1111-1111-111111111111'),
  '2026-11-01'::timestamptz, 'Ada''s period is unchanged');

select * from finish();
rollback;
