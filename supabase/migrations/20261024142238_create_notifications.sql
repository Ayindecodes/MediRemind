-- Notifications: the in-app list behind the bell. Reminders sent by push, WhatsApp, SMS or email
-- are recorded separately, in reminder_deliveries.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('reminder', 'missed', 'refill', 'streak', 'caregiver', 'billing', 'system')),
  message text not null check (char_length(message) between 1 and 500),
  -- A page in the app to open, e.g. '/dashboard/medications'. Only paths inside the app: '//x' and
  -- '/\x' are other websites to a browser.
  action_url text check (action_url ~ '^/([^/\\].*)?$' and char_length(action_url) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications, newest first, unread until read_at is set.';

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.notifications enable row level security;
