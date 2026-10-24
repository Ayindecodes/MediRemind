-- Push subscriptions: people register their own browsers and phones, see them and remove them.
-- last_used_at is kept by the server. If someone else signs in on a browser that is already
-- registered, the endpoint is taken, so the server moves it over (Task 58).

grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, user_agent) on public.push_subscriptions to authenticated;

create policy "People can read their own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People can register their own devices"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People can remove their own devices"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
