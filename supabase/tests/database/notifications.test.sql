-- public.notifications
begin;
select plan(11);

select has_table('public', 'notifications', 'notifications exists');
select columns_are('public', 'notifications', array[
  'id', 'user_id', 'type', 'message', 'action_url', 'read_at', 'created_at'
], 'notifications has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  'row level security is on');
select has_index('public', 'notifications', 'notifications_user_id_created_at_idx',
  'notifications are indexed for the newest-first list');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ada@example.com');
insert into public.profiles (id, full_name, email)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com');

create function pg_temp.notify(link text) returns text language sql as $$
  select format(
    'insert into public.notifications (user_id, type, message, action_url) values '
    '(''11111111-1111-1111-1111-111111111111'', ''refill'', ''About 3 days of Amlodipine left'', %L)',
    link)
$$;

select lives_ok(pg_temp.notify('/dashboard/medications'), 'links to pages in the app are allowed');
select lives_ok(pg_temp.notify('/'), 'the home page is allowed');
select throws_ok(pg_temp.notify('https://evil.example'), '23514', null, 'no links to other sites');
select throws_ok(pg_temp.notify('//evil.example'), '23514', null, 'no protocol-relative links');
select throws_ok(pg_temp.notify('/\evil.example'), '23514', null,
  'no backslash links, which browsers treat as //');
select throws_ok(
  $$ insert into public.notifications (user_id, type, message)
     values ('11111111-1111-1111-1111-111111111111', 'session', 'Your coach is waiting') $$,
  '23514', null, 'only the known types (coaching sessions are not a feature)'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$ select 1 from public.notifications $$,
  'deleting the account deletes its notifications');

select * from finish();
rollback;
