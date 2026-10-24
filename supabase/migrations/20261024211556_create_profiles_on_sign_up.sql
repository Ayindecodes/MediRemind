-- Profiles are created by the database when someone signs up, from what Supabase Auth stores, and
-- their phone and email follow any change made through Auth (Task 41).

-- Auth stores phone numbers without the +; profiles use E.164 (+2348031234567)
create function public.e164_phone(auth_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when auth_phone is null or auth_phone = '' then null else '+' || ltrim(auth_phone, '+') end
$$;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
-- Runs as its owner: the person signing up has no right to create profiles themselves
security definer
set search_path = ''
as $$
declare
  full_name text := left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 100);
begin
  -- The app's sign-up always sends a name; this stops anyone creating a nameless account by calling
  -- Auth directly. The error stops the sign-up, so no account is left without a profile.
  if full_name is null then
    raise exception 'Enter your name to sign up.' using errcode = 'P0001', hint = 'invalid_request';
  end if;

  insert into public.profiles (id, full_name, phone, email)
  values (new.id, full_name, public.e164_phone(new.phone), nullif(lower(new.email), ''));
  return new;
end;
$$;

create function public.sync_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set phone = public.e164_phone(new.phone), email = nullif(lower(new.email), '')
  where id = new.id;
  return new;
end;
$$;

-- Only Auth's own writes to auth.users run these; nobody calls them through the API
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.sync_profile_contact() from public, anon, authenticated;

create trigger create_profile_for_new_user
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create trigger sync_profile_contact
  after update of phone, email on auth.users
  for each row
  when (old.phone is distinct from new.phone or old.email is distinct from new.email)
  execute function public.sync_profile_contact();
