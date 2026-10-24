-- Who can see and change public.notification_prefs
begin;
select plan(9);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com');
insert into public.profiles (id, full_name, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031111111'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', '+2348032222222');
insert into public.notification_prefs (user_id, discreet) values ('22222222-2222-2222-2222-222222222222', true);

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select is_empty($$ select 1 from public.notification_prefs $$, 'Ada cannot see Bola''s preferences');
select lives_ok(
  $$ insert into public.notification_prefs (user_id, channels, quiet_hours_start, quiet_hours_end)
     values ('11111111-1111-1111-1111-111111111111', '{push,sms}', '22:00', '06:00') $$,
  'Ada can set up her reminders'
);
select throws_ok(
  $$ insert into public.notification_prefs (user_id) values ('22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'Ada cannot set up Bola''s reminders'
);
select throws_ok($$ update public.notification_prefs set whatsapp_opted_in_at = now() $$, '42501', null,
  'the WhatsApp opt-in is recorded by the server, not set by the app');
select throws_ok($$ update public.notification_prefs set channels = '{whatsapp}' $$, '23514', null,
  'so WhatsApp stays off until she has opted in');

-- The server records her opt-in (Task 60)
reset role;
update public.notification_prefs set whatsapp_opted_in_at = now() where user_id = '11111111-1111-1111-1111-111111111111';
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$ update public.notification_prefs set channels = '{whatsapp,push}', discreet = true $$,
  'after opting in she can choose WhatsApp');
update public.notification_prefs set discreet = false where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
set local role anon;
select throws_ok($$ select * from public.notification_prefs $$, '42501', null,
  'someone who is not signed in cannot read preferences');

reset role;
select is((select discreet from public.notification_prefs where user_id = '22222222-2222-2222-2222-222222222222'), true,
  'Ada''s update could not turn off Bola''s discreet mode');
select is((select channels from public.notification_prefs where user_id = '11111111-1111-1111-1111-111111111111'),
  array['whatsapp', 'push'], 'Ada''s choices were saved');

select * from finish();
rollback;
