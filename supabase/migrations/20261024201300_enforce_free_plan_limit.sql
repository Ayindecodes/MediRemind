-- The free plan's limit of 3 active medicines, enforced in the database, so no request, from the
-- app or straight to the API, can go over it.
--
-- Active means not archived, not paused and not finished (its end date is before today in the
-- person's time zone), so a completed course doesn't use up a free place. Paid plans have no
-- limit; a paid plan past its end date counts as free.

create function public.enforce_free_plan_limit()
returns trigger
language plpgsql
-- Runs as its owner so it always sees and locks the person's whole profile and list
security definer
set search_path = ''
as $$
declare
  owner public.profiles;
  today date;
  active_count integer;
begin
  -- Lock the profile, so two medicines added at the same moment can't both slip under the limit
  select * into owner from public.profiles p where p.id = new.user_id for update;

  if owner.plan <> 'free' and (owner.plan_expires_at is null or owner.plan_expires_at > now()) then
    return new;
  end if;

  today := (now() at time zone owner.timezone)::date;

  -- Only a medicine that is active can count against the limit...
  if new.archived_at is not null or new.paused_at is not null or new.end_date < today then
    return new;
  end if;
  -- ...and only when it becomes active: editing one that already was can't go over
  if tg_op = 'UPDATE'
    and old.archived_at is null and old.paused_at is null
    and (old.end_date is null or old.end_date >= today) then
    return new;
  end if;

  select count(*) into active_count
  from public.medications m
  where m.user_id = new.user_id
    and m.id <> new.id
    and m.archived_at is null
    and m.paused_at is null
    and (m.end_date is null or m.end_date >= today);

  if active_count >= 3 then
    -- The hint is the API error code, so the app can offer the upgrade (Task 36)
    raise exception 'The free plan allows 3 active medicines. Archive one or upgrade to add more.'
      using errcode = 'P0001', hint = 'upgrade_required';
  end if;

  return new;
end;
$$;

-- It only runs as a trigger; nobody calls it through the API
revoke execute on function public.enforce_free_plan_limit() from public, anon, authenticated;

create trigger enforce_free_plan_limit
  before insert or update of archived_at, paused_at, end_date on public.medications
  for each row execute function public.enforce_free_plan_limit();
