-- public.medications
begin;
select plan(16);

select has_table('public', 'medications', 'medications exists');
select columns_are('public', 'medications', array[
  'id', 'user_id', 'name', 'strength', 'form', 'dose_amount', 'dose_unit', 'schedule',
  'start_date', 'end_date', 'instructions', 'notes', 'appearance', 'photo_path', 'nafdac_number',
  'quantity_remaining', 'refill_alert_days', 'reminder_channels', 'paused_at', 'archived_at',
  'created_at', 'updated_at'
], 'medications has exactly the expected columns');
select ok((select relrowsecurity from pg_class where oid = 'public.medications'::regclass),
  'row level security is on');
select has_index('public', 'medications', 'medications_user_id_idx', 'medications are indexed by owner');

insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-111111111111', 'ada@example.com', '{"full_name": "Test"}');
-- Signing up creates a profile; these tests set up their own
delete from public.profiles;
insert into public.profiles (id, full_name, phone)
  values ('11111111-1111-1111-1111-111111111111', 'Ada Obi', '+2348031234567');

insert into public.medications (user_id, name, strength, schedule, start_date)
  values ('11111111-1111-1111-1111-111111111111', 'Amlodipine', '5 mg',
          '{"type": "daily", "times": ["08:00"]}', '2026-10-01');

select results_eq(
  $$ select form, dose_amount, dose_unit from public.medications where name = 'Amlodipine' $$,
  $$ values ('tablet', 1.00::numeric(8, 2), 'tablet') $$,
  'a new medicine defaults to one tablet'
);

-- Each rejected insert below breaks exactly one rule
create function pg_temp.add(extra text) returns text language sql as $$
  select format(
    'insert into public.medications (user_id, name, schedule, start_date, %s) values '
    '(''11111111-1111-1111-1111-111111111111'', ''Test'', ''{"type": "daily"}'', ''2026-10-01'', %s)',
    split_part(extra, '=', 1), split_part(extra, '=', 2))
$$;

select throws_ok(pg_temp.add('end_date=''2026-09-30'''), '23514', null,
  'a course cannot end before it starts');
select throws_ok(pg_temp.add('form=''powder'''), '23514', null, 'only the known forms');
select throws_ok(pg_temp.add('dose_amount=0'), '23514', null, 'a dose must be more than zero');
select throws_ok(pg_temp.add('dose_unit=''spoon'''), '23514', null, 'only the known dose units');
select throws_ok(pg_temp.add('quantity_remaining=-1'), '23514', null, 'supply cannot go negative');
select throws_ok(pg_temp.add('refill_alert_days=0'), '23514', null,
  'a refill alert needs at least one day');
select throws_ok(pg_temp.add('reminder_channels=''{pigeon}'''), '23514', null,
  'only the known reminder channels');
select throws_ok(pg_temp.add('reminder_channels=''{}'''), '23514', null,
  'an empty channel list is not allowed (null means the defaults)');
select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Test', '["08:00"]', '2026-10-01') $$,
  '23514', null, 'the schedule must be an object with a type'
);
select throws_ok(
  $$ insert into public.medications (user_id, name, schedule, start_date)
     values ('11111111-1111-1111-1111-111111111111', 'Test', '{"times": ["08:00"]}', '2026-10-01') $$,
  '23514', null, 'the schedule must say what type it is'
);

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is_empty($$ select 1 from public.medications $$,
  'deleting the account deletes its medications');

select * from finish();
rollback;
