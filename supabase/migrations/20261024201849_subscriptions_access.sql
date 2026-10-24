-- Subscriptions: people can see their own plan, its status and its dates (the billing page,
-- Task 73), but not Paystack's codes and token, which only the server uses to manage it. Only the
-- server creates and changes subscriptions, from verified payments (Phase 6).

grant select (
  id, user_id, plan, billing, status, current_period_start, current_period_end, amount_kobo,
  created_at, updated_at
) on public.subscriptions to authenticated;

create policy "People can read their own subscriptions"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
