-- Helpers shared by the table migrations that follow.

-- Keeps a table's updated_at column current. Attach it with:
--   create trigger set_updated_at before update on <table>
--     for each row execute function public.set_updated_at();
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Whether Postgres knows the time zone name, e.g. 'Africa/Lagos'. Reminders are scheduled in each
-- person's time zone, so an unknown name must never be saved.
create function public.is_valid_timezone(name text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  perform now() at time zone name;
  return true;
exception
  when invalid_parameter_value then
    return false;
end;
$$;
