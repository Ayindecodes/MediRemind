-- Profiles created by the database when someone signs up through Supabase Auth
begin;
select plan(11);

select is(public.e164_phone('2348031234567'), '+2348031234567', 'Auth''s phone format gains a +');
select is(public.e164_phone('+2348031234567'), '+2348031234567', 'a number with a + keeps one +');
select is(public.e164_phone(''), null, 'no number stays no number');

-- Signing up by phone, the way the app does it (the name travels in the user metadata)
insert into auth.users (id, phone, raw_user_meta_data)
  values ('11111111-1111-1111-1111-111111111111', '2348031234567', '{"full_name": "  Ada Obi  "}');
select results_eq(
  $$ select full_name, phone, email, timezone, plan from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Ada Obi', '+2348031234567', null::text, 'Africa/Lagos', 'free') $$,
  'signing up by phone creates a profile with the name and the number in E.164'
);

insert into auth.users (id, email, raw_user_meta_data)
  values ('22222222-2222-2222-2222-222222222222', 'Bola@Example.com', jsonb_build_object('full_name', repeat('b', 150)));
select results_eq(
  $$ select char_length(full_name), email from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (100, 'bola@example.com') $$,
  'an email sign-up works too; the email is lowercased and a very long name shortened to 100'
);

select throws_ok(
  $$ insert into auth.users (id, phone, raw_user_meta_data) values ('33333333-3333-3333-3333-333333333333', '2348033333333', '{}') $$,
  'P0001', 'Enter your name to sign up.', 'a sign-up without a name is refused'
);
select is_empty($$ select 1 from auth.users where id = '33333333-3333-3333-3333-333333333333' $$,
  'and leaves no account behind');

update auth.users set phone = '2348039999999' where id = '11111111-1111-1111-1111-111111111111';
select is((select phone from public.profiles where id = '11111111-1111-1111-1111-111111111111'), '+2348039999999',
  'a number changed through Auth reaches the profile');
update auth.users set email = 'Ada@Example.com' where id = '11111111-1111-1111-1111-111111111111';
select is((select email from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'ada@example.com',
  'so does an email');

select ok(not has_function_privilege('authenticated', 'public.create_profile_for_new_user()', 'execute'),
  'signed-in people cannot run the profile-creating function themselves');
select ok(not has_function_privilege('anon', 'public.sync_profile_contact()', 'execute'),
  'nor can anyone else run the syncing one');

select * from finish();
rollback;
