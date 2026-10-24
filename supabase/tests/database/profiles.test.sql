-- public.profiles
begin;
select plan(14);

select has_table('public', 'profiles', 'profiles exists');
select columns_are('public', 'profiles', array[
  'id', 'full_name', 'phone', 'email', 'timezone', 'language', 'plan', 'plan_expires_at',
  'created_at', 'updated_at'
], 'profiles has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'row level security is on');

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;

insert into public.profiles (id, full_name, phone)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031234567');

select results_eq(
  $$ select timezone, language, plan from public.profiles where full_name = 'Ada Obi' $$,
  $$ values ('Africa/Lagos', 'en', 'free') $$,
  'new profiles default to Lagos time, English and the free plan'
);

-- Each rejected insert below breaks exactly one rule
select throws_ok(
  $$ insert into public.profiles (id, full_name, phone)
     values ('22222222-2222-2222-2222-222222222222', 'Bola', '08031234567') $$,
  '23514', null, 'phone numbers must be in +234... form'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name, phone)
     values ('22222222-2222-2222-2222-222222222222', 'Bola', '+2348031234567') $$,
  '23505', null, 'a phone number belongs to one account'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name)
     values ('22222222-2222-2222-2222-222222222222', 'Bola') $$,
  '23514', null, 'an account needs a phone number or an email'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name, email)
     values ('22222222-2222-2222-2222-222222222222', 'Bola', 'Bola@Example.com') $$,
  '23514', null, 'emails are stored lowercase'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name, email, timezone)
     values ('22222222-2222-2222-2222-222222222222', 'Bola', 'bola@example.com', 'Africa/Lagoss') $$,
  '23514', null, 'the time zone must be a real one'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name, email, language)
     values ('22222222-2222-2222-2222-222222222222', 'Bola', 'bola@example.com', 'fr') $$,
  '23514', null, 'only the supported languages'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name, email, plan_expires_at)
     values ('22222222-2222-2222-2222-222222222222', 'Bola', 'bola@example.com', now()) $$,
  '23514', null, 'the free plan has no end date'
);
select throws_ok(
  $$ insert into public.profiles (id, full_name, email)
     values ('33333333-3333-3333-3333-333333333333', 'Nobody', 'nobody@example.com') $$,
  '23503', null, 'a profile needs an Auth user'
);

update public.profiles set plan = 'premium', plan_expires_at = now() + interval '30 days'
  where full_name = 'Ada Obi';
select is((select plan from public.profiles where full_name = 'Ada Obi'), 'premium',
  'a paid plan can have an end date');

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$ select 1 from public.profiles where full_name = 'Ada Obi' $$,
  'deleting the Auth user deletes the profile');

select * from finish();
rollback;
