-- public.notification_prefs
begin;
select plan(14);

select has_table('public', 'notification_prefs', 'notification_prefs exists');
select columns_are('public', 'notification_prefs', array[
  'user_id', 'channels', 'whatsapp_opted_in_at', 'quiet_hours_start', 'quiet_hours_end',
  'lead_minutes', 'grace_minutes', 'follow_up_minutes', 'follow_up_channel', 'discreet', 'updated_at'
], 'notification_prefs has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.notification_prefs'::regclass),
  'row level security is on');

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com');
insert into public.profiles (id, full_name, email) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', 'bola@example.com');
insert into public.notification_prefs (user_id) values ('11111111-1111-1111-1111-111111111111');

select results_eq(
  $$ select channels, lead_minutes, grace_minutes, discreet from public.notification_prefs $$,
  $$ values (array['push'], 0::smallint, 60::smallint, false) $$,
  'by default: phone notifications, on time, missed after an hour, names shown'
);

create function pg_temp.prefs(settings text) returns text language sql as $$
  select format(
    'insert into public.notification_prefs (user_id, %s) values (''22222222-2222-2222-2222-222222222222'', %s)',
    split_part(settings, '=', 1), split_part(settings, '=', 2))
$$;

select throws_ok(pg_temp.prefs('channels=''{}'''), '23514', null, 'at least one channel');
select throws_ok(pg_temp.prefs('channels=''{push,fax}'''), '23514', null, 'only the known channels');
select throws_ok(pg_temp.prefs('channels=''{whatsapp}'''), '23514', null,
  'WhatsApp needs an opt-in first');
select lives_ok(
  $$ insert into public.notification_prefs (user_id, channels, whatsapp_opted_in_at)
     values ('22222222-2222-2222-2222-222222222222', '{whatsapp,push}', now()) $$,
  'WhatsApp is allowed once the opt-in is recorded'
);
delete from public.notification_prefs where user_id = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$ insert into public.notification_prefs (user_id, follow_up_minutes, follow_up_channel)
     values ('22222222-2222-2222-2222-222222222222', 15, 'whatsapp') $$,
  '23514', null, 'WhatsApp follow-ups need the opt-in too'
);
select throws_ok(pg_temp.prefs('follow_up_minutes=15'), '23514', null,
  'a follow-up needs both a delay and a channel');
select throws_ok(pg_temp.prefs('quiet_hours_start=''22:00'''), '23514', null,
  'quiet hours need a start and an end');
select lives_ok(
  $$ insert into public.notification_prefs (user_id, quiet_hours_start, quiet_hours_end)
     values ('22222222-2222-2222-2222-222222222222', '22:00', '06:00') $$,
  'quiet hours can run past midnight'
);
delete from public.notification_prefs where user_id = '22222222-2222-2222-2222-222222222222';

select throws_ok(pg_temp.prefs('grace_minutes=5'), '23514', null,
  'a dose gets at least 15 minutes before it counts as missed');

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty(
  $$ select 1 from public.notification_prefs where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'deleting the account deletes its preferences'
);

select * from finish();
rollback;
