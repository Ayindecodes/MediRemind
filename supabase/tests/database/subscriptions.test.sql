-- public.subscriptions
begin;
select plan(11);

select has_table('public', 'subscriptions', 'subscriptions exists');
select columns_are('public', 'subscriptions', array[
  'id', 'user_id', 'plan', 'billing', 'status', 'current_period_start', 'current_period_end',
  'amount_kobo', 'paystack_customer_code', 'paystack_subscription_code', 'paystack_email_token',
  'created_at', 'updated_at'
], 'subscriptions has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.subscriptions'::regclass),
  'row level security is on');

insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, email)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com');
insert into public.subscriptions
  (user_id, plan, billing, current_period_start, current_period_end, amount_kobo, paystack_subscription_code)
  values ('11111111-1111-1111-1111-111111111111', 'premium', 'monthly',
          '2026-10-01', '2026-11-01', 150000, 'SUB_abc123');

select is((select status from public.subscriptions), 'active', 'a new subscription is active');
select throws_ok(
  $$ insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo)
     values ('11111111-1111-1111-1111-111111111111', 'family', 'pass', '2026-10-01', '2027-01-01', 900000) $$,
  '23505', null, 'only one running subscription per person'
);

update public.subscriptions set status = 'expired';
select lives_ok(
  $$ insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo)
     values ('11111111-1111-1111-1111-111111111111', 'family', 'pass', '2026-11-01', '2027-02-01', 900000) $$,
  'a new one can start once the old one has ended'
);
update public.subscriptions set status = 'expired';

select throws_ok(
  $$ insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo)
     values ('11111111-1111-1111-1111-111111111111', 'free', 'monthly', '2026-10-01', '2026-11-01', 100) $$,
  '23514', null, 'the free plan is not a subscription'
);
select throws_ok(
  $$ insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo)
     values ('11111111-1111-1111-1111-111111111111', 'premium', 'monthly', '2026-11-01', '2026-10-01', 150000) $$,
  '23514', null, 'a period ends after it starts'
);
select throws_ok(
  $$ insert into public.subscriptions (user_id, plan, billing, current_period_start, current_period_end, amount_kobo)
     values ('11111111-1111-1111-1111-111111111111', 'premium', 'monthly', '2026-10-01', '2026-11-01', 0) $$,
  '23514', null, 'a paid plan costs something'
);
select throws_ok(
  $$ insert into public.subscriptions
       (user_id, plan, billing, current_period_start, current_period_end, amount_kobo, paystack_subscription_code)
     values ('11111111-1111-1111-1111-111111111111', 'premium', 'pass', '2026-10-01', '2026-11-01', 150000, 'SUB_x') $$,
  '23514', null, 'a pass never renews, so it has no Paystack subscription'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$ select 1 from public.subscriptions $$,
  'deleting the account deletes its subscriptions (payments are kept in payment_events)');

select * from finish();
rollback;
