-- Moods: people read, log, change and delete their own check-ins. A check-in's day can't be moved;
-- choosing again on the same day updates it.

grant select, delete on public.moods to authenticated;
grant insert (user_id, logged_on, mood, note) on public.moods to authenticated;
grant update (mood, note) on public.moods to authenticated;

create policy "People can read their own moods"
  on public.moods for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People can log their own moods"
  on public.moods for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People can change their own moods"
  on public.moods for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People can delete their own moods"
  on public.moods for delete to authenticated
  using (user_id = (select auth.uid()));
