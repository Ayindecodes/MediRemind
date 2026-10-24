-- public.moods
begin;
select plan(8);

select has_table('public', 'moods', 'moods exists');
select columns_are('public', 'moods', array[
  'id', 'user_id', 'logged_on', 'mood', 'note', 'created_at', 'updated_at'
], 'moods has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.moods'::regclass),
  'row level security is on');

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'ada@example.com');
insert into public.profiles (id, full_name, email)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', 'ada@example.com');
insert into public.moods (user_id, logged_on, mood)
  values ('11111111-1111-1111-1111-111111111111', '2026-10-24', 'happy');

select throws_ok(
  $$ insert into public.moods (user_id, logged_on, mood)
     values ('11111111-1111-1111-1111-111111111111', '2026-10-24', 'sad') $$,
  '23505', null, 'one mood per day'
);
select lives_ok(
  $$ insert into public.moods (user_id, logged_on, mood, note)
     values ('11111111-1111-1111-1111-111111111111', '2026-10-25', 'sad', 'long day') $$,
  'the next day gets its own mood'
);
select throws_ok(
  $$ insert into public.moods (user_id, logged_on, mood)
     values ('11111111-1111-1111-1111-111111111111', '2026-10-26', 'ecstatic') $$,
  '23514', null, 'only happy, neutral or sad'
);
select throws_ok(
  format($$ insert into public.moods (user_id, logged_on, mood, note)
     values ('11111111-1111-1111-1111-111111111111', '2026-10-26', 'happy', %L) $$, repeat('x', 501)),
  '23514', null, 'notes are at most 500 characters'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$ select 1 from public.moods $$, 'deleting the account deletes its moods');

select * from finish();
rollback;
