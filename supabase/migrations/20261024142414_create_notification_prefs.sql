-- Notification preferences: how and when each person is reminded. One row per account.

create table public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- The default reminder channels; each medicine can override them
  channels text[] not null default array['push']
    check (cardinality(channels) > 0 and channels <@ array['push', 'whatsapp', 'sms', 'email']),
  -- WhatsApp may only be used after the person opts in (Meta's rule), so the opt-in is recorded
  whatsapp_opted_in_at timestamptz,
  -- No reminders between these local times. The range may cross midnight, e.g. 22:00 to 06:00.
  quiet_hours_start time,
  quiet_hours_end time,
  -- Send reminders this many minutes before a dose is due
  lead_minutes smallint not null default 0 check (lead_minutes between 0 and 120),
  -- A dose counts as missed this many minutes after it was due
  grace_minutes smallint not null default 60 check (grace_minutes between 15 and 240),
  -- If a reminder isn't answered within this many minutes, follow up on follow_up_channel
  follow_up_minutes smallint check (follow_up_minutes between 5 and 120),
  follow_up_channel text check (follow_up_channel in ('whatsapp', 'sms')),
  -- Leave medicine names out of every message
  discreet boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint notification_prefs_quiet_hours_pair
    check ((quiet_hours_start is null) = (quiet_hours_end is null)),
  constraint notification_prefs_quiet_hours_differ check (quiet_hours_start <> quiet_hours_end),
  constraint notification_prefs_follow_up_pair
    check ((follow_up_minutes is null) = (follow_up_channel is null)),
  constraint notification_prefs_whatsapp_needs_opt_in check (
    whatsapp_opted_in_at is not null
    or (not ('whatsapp' = any (channels)) and follow_up_channel is distinct from 'whatsapp')
  )
);

comment on table public.notification_prefs is
  'How and when each person is reminded: channels, quiet hours, timing, follow-ups and discreet mode.';

create trigger set_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.notification_prefs enable row level security;
