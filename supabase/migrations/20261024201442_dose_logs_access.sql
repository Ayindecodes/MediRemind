-- Dose logs: people read their doses, record one, change it (taken to skipped, say) and undo it
-- (delete). The foreign key to medications (id, user_id) already ensures the medicine is theirs.
-- Doses recorded from a WhatsApp or SMS reply, by a caregiver, or marked missed come from the
-- server, so people can only record 'app' or 'push' as the source.

grant select, delete on public.dose_logs to authenticated;
grant insert (user_id, medication_id, scheduled_for, status, taken_at, skip_reason, source)
  on public.dose_logs to authenticated;
grant update (status, taken_at, skip_reason, source) on public.dose_logs to authenticated;

create policy "People can read their own doses"
  on public.dose_logs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People can record their own doses"
  on public.dose_logs for insert to authenticated
  with check (user_id = (select auth.uid()) and source in ('app', 'push'));

create policy "People can change their own dose records"
  on public.dose_logs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and source in ('app', 'push'));

create policy "People can undo their own dose records"
  on public.dose_logs for delete to authenticated
  using (user_id = (select auth.uid()));
