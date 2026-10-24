-- Notification preferences: people read and set their own. The WhatsApp opt-in is recorded by the
-- server when the person opts in (Task 60), so it can't be faked or backdated, and without it the
-- table's own rule keeps WhatsApp off.

grant select on public.notification_prefs to authenticated;

grant insert (
  user_id, channels, quiet_hours_start, quiet_hours_end, lead_minutes, grace_minutes,
  follow_up_minutes, follow_up_channel, discreet
) on public.notification_prefs to authenticated;

grant update (
  channels, quiet_hours_start, quiet_hours_end, lead_minutes, grace_minutes, follow_up_minutes,
  follow_up_channel, discreet
) on public.notification_prefs to authenticated;

create policy "People can read their own notification preferences"
  on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People can create their own notification preferences"
  on public.notification_prefs for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People can change their own notification preferences"
  on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
