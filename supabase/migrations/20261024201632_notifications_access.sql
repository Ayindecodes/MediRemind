-- Notifications: people read their own, mark them read and clear them. Only the server creates
-- them, so nobody can put a notification, or a link, in anyone's list.

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "People can read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People can mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People can clear their own notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
