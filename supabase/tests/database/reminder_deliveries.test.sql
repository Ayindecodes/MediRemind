-- public.reminder_deliveries
begin;
select plan(15);

select has_table('public', 'reminder_deliveries', 'reminder_deliveries exists');
select columns_are('public', 'reminder_deliveries', array[
  'id', 'user_id', 'medication_id', 'scheduled_for', 'channel', 'kind', 'attempt', 'status',
  'provider_message_id', 'error', 'cost_kobo', 'created_at', 'sent_at', 'delivered_at', 'updated_at'
], 'reminder_deliveries has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.reminder_deliveries'::regclass),
  'row level security is on');
select has_index('public', 'reminder_deliveries', 'reminder_deliveries_queued_idx', 'the queue is indexed');
select has_index('public', 'reminder_deliveries', 'reminder_deliveries_provider_message_idx',
  'delivery reports can find their message');
select has_index('public', 'reminder_deliveries', 'reminder_deliveries_user_id_created_at_idx',
  'each person''s messages can be counted by month');

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}'),
  ('22222222-2222-2222-2222-222222222222', 'bola@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, email) values
  ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Bola Ade', 'bola@example.com');
insert into public.medications (id, user_id, name, schedule, start_date) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Amlodipine',
   '{"type": "daily", "times": ["08:00"]}', '2026-10-01');

insert into public.reminder_deliveries (user_id, medication_id, scheduled_for, channel)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          '2026-10-24 08:00+01', 'sms');

select results_eq(
  $$ select kind, attempt, status from public.reminder_deliveries $$,
  $$ values ('reminder', 1::smallint, 'queued') $$,
  'a new delivery is the first attempt of a reminder, waiting to be sent'
);
select throws_ok(
  $$ insert into public.reminder_deliveries (user_id, medication_id, scheduled_for, channel)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '2026-10-24 08:00+01', 'sms') $$,
  '23505', null, 'the same reminder cannot be queued twice, even by overlapping runs'
);
select lives_ok(
  $$ insert into public.reminder_deliveries (user_id, medication_id, scheduled_for, channel, attempt)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '2026-10-24 08:00+01', 'sms', 2) $$,
  'a retry is a new attempt'
);
select lives_ok(
  $$ insert into public.reminder_deliveries (user_id, medication_id, scheduled_for, channel, kind)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '2026-10-24 08:00+01', 'sms', 'follow_up') $$,
  'a follow-up is separate from the reminder'
);
select throws_ok(
  $$ update public.reminder_deliveries set status = 'sent' where attempt = 1 and kind = 'reminder' $$,
  '23514', null, 'a sent message records when it was sent'
);
select throws_ok(
  $$ update public.reminder_deliveries set status = 'delivered', sent_at = now()
     where attempt = 1 and kind = 'reminder' $$,
  '23514', null, 'a delivered message records when it was delivered'
);
select throws_ok(
  $$ update public.reminder_deliveries set cost_kobo = -1 where attempt = 1 and kind = 'reminder' $$,
  '23514', null, 'costs are never negative'
);
select throws_ok(
  $$ insert into public.reminder_deliveries (user_id, medication_id, scheduled_for, channel)
     values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             '2026-10-25 08:00+01', 'sms') $$,
  '23503', null, 'a reminder cannot be recorded against someone else''s medicine'
);

delete from public.medications where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is_empty($$ select 1 from public.reminder_deliveries $$,
  'deleting a medicine for good deletes its delivery records');

select * from finish();
rollback;
