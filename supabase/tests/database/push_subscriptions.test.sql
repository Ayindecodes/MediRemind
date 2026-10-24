-- public.push_subscriptions
begin;
select plan(8);

select has_table('public', 'push_subscriptions', 'push_subscriptions exists');
select columns_are('public', 'push_subscriptions', array[
  'id', 'user_id', 'endpoint', 'p256dh', 'auth', 'user_agent', 'created_at', 'last_used_at'
], 'push_subscriptions has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass),
  'row level security is on');
select has_index('public', 'push_subscriptions', 'push_subscriptions_user_id_idx',
  'subscriptions are indexed by owner');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ada@example.com');
insert into public.profiles (id, full_name, email)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('11111111-1111-1111-1111-111111111111', 'https://fcm.googleapis.com/fcm/send/abc', 'key', 'secret');

select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('11111111-1111-1111-1111-111111111111', 'https://fcm.googleapis.com/fcm/send/abc', 'k2', 's2') $$,
  '23505', null, 'a browser is subscribed once'
);
select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('11111111-1111-1111-1111-111111111111', 'http://push.example/abc', 'key', 'secret') $$,
  '23514', null, 'push endpoints must use https'
);
select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('11111111-1111-1111-1111-111111111111', 'https://push.example/def', '', 'secret') $$,
  '23514', null, 'the encryption keys are required'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$ select 1 from public.push_subscriptions $$,
  'deleting the account deletes its subscriptions');

select * from finish();
rollback;
