-- Profiles: people read their own profile and change its name, time zone and language.
-- Phone and email change through the server (they need verifying, Task 41), the plan only through
-- payments (Phase 6), and profiles are created and deleted by the server (Tasks 37 and 86).

grant select on public.profiles to authenticated;
grant update (full_name, timezone, language) on public.profiles to authenticated;

create policy "People can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "People can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
