-- Subscriptions: paid plans bought through Paystack (Phase 6). Monthly and yearly plans renew by
-- card; a pass is paid once, by card, bank transfer or USSD, and simply ends.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('premium', 'family')),
  billing text not null check (billing in ('monthly', 'yearly', 'pass')),
  -- Mirrors Paystack: non_renewing means cancelled but paid up to the period's end
  status text not null default 'active'
    check (status in ('active', 'non_renewing', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  -- The price paid for each period, in kobo (100 kobo = ₦1)
  amount_kobo integer not null check (amount_kobo > 0),
  -- Paystack's references, needed to look up, renew and cancel the subscription
  paystack_customer_code text check (char_length(paystack_customer_code) <= 100),
  paystack_subscription_code text unique check (char_length(paystack_subscription_code) <= 100),
  paystack_email_token text check (char_length(paystack_email_token) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_period_order check (current_period_end > current_period_start),
  constraint subscriptions_pass_never_renews
    check (billing <> 'pass' or paystack_subscription_code is null)
);

comment on table public.subscriptions is 'Paid plans: renewing card subscriptions and one-off passes.';

-- A person has at most one subscription that is still running
create unique index subscriptions_one_live_per_user on public.subscriptions (user_id)
  where status in ('active', 'non_renewing', 'past_due');

create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.subscriptions enable row level security;
