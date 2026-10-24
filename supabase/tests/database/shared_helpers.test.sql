-- Helpers from 20261024141138_shared_helpers.sql
begin;
select plan(4);

select ok(public.is_valid_timezone('Africa/Lagos'), 'Africa/Lagos is a valid time zone');
select ok(public.is_valid_timezone('UTC'), 'UTC is a valid time zone');
select ok(not public.is_valid_timezone('Africa/Lagoss'), 'a misspelt zone is not valid');

-- set_updated_at, tried on a scratch table
create temporary table scratch (id int primary key, updated_at timestamptz not null default now());
create trigger set_updated_at before update on scratch
  for each row execute function public.set_updated_at();
insert into scratch values (1, '2020-01-01');
update scratch set id = 1;
select ok((select updated_at > '2020-01-01' from scratch), 'set_updated_at stamps the update time');

select * from finish();
rollback;
