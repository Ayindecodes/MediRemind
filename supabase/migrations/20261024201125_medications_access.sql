-- Medications: people read, add and edit their own medicines. Deleting one archives it (an update,
-- so it can be undone), so there is no delete. The server alone sets the photo, a paid feature
-- (Task 49), and the paused flag, which follows the plan (Task 71). Rows can't be moved to another
-- person: user_id is fixed at insert, and the policies only accept the signed-in person's ID.

grant select on public.medications to authenticated;

grant insert (
  user_id, name, strength, form, dose_amount, dose_unit, schedule, start_date, end_date,
  instructions, notes, appearance, nafdac_number, quantity_remaining, refill_alert_days,
  reminder_channels
) on public.medications to authenticated;

grant update (
  name, strength, form, dose_amount, dose_unit, schedule, start_date, end_date, instructions, notes,
  appearance, nafdac_number, quantity_remaining, refill_alert_days, reminder_channels, archived_at
) on public.medications to authenticated;

create policy "People can read their own medications"
  on public.medications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People can add their own medications"
  on public.medications for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People can update their own medications"
  on public.medications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
