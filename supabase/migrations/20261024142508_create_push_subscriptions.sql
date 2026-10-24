-- Push subscriptions: each browser or phone that allowed notifications (Task 58).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Where the push service accepts messages for this browser. Unique, so subscribing again from the
  -- same browser updates the row. Deleted when the push service says it's gone (HTTP 410).
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  -- The browser's keys for encrypting messages to it
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  -- Which browser and device, so people can tell their subscriptions apart
  user_agent text check (char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

comment on table public.push_subscriptions is 'Browsers and phones that receive push notifications.';

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.push_subscriptions enable row level security;
