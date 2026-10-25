-- public.payment_events
begin;
select plan(10);

select has_table('public', 'payment_events', 'payment_events exists');
select columns_are('public', 'payment_events', array[
  'id', 'provider', 'dedupe_key', 'event_type', 'user_id', 'reference', 'amount_kobo', 'payload',
  'received_at', 'processed_at'
], 'payment_events has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.payment_events'::regclass),
  'row level security is on');
select has_index('public', 'payment_events', 'payment_events_unprocessed_idx',
  'unhandled events can be found quickly');

insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, email)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com');
insert into public.payment_events (dedupe_key, event_type, user_id, reference, amount_kobo, payload)
  values ('charge.success:4099260516', 'charge.success', '11111111-1111-1111-1111-111111111111',
          'ref_123', 150000, '{"event": "charge.success", "data": {"id": 4099260516}}');

select is((select provider from public.payment_events), 'paystack', 'events come from Paystack');
select throws_ok(
  $$ insert into public.payment_events (dedupe_key, event_type, payload)
     values ('charge.success:4099260516', 'charge.success', '{"event": "charge.success"}') $$,
  '23505', null, 'the same event is stored once, however often it is sent'
);
select throws_ok(
  $$ insert into public.payment_events (dedupe_key, event_type, payload)
     values ('charge.success:1', 'charge.success', '"not an object"') $$,
  '23514', null, 'the payload is a JSON object'
);
select throws_ok(
  $$ insert into public.payment_events (dedupe_key, event_type, payload, amount_kobo)
     values ('charge.success:2', 'charge.success', '{}', -100) $$,
  '23514', null, 'amounts are never negative'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select isnt_empty($$ select 1 from public.payment_events $$,
  'payment records outlive the account');
select ok((select user_id is null from public.payment_events),
  'but they are no longer linked to the deleted person');

select * from finish();
rollback;
