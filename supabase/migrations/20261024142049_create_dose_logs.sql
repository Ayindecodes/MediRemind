-- Dose logs: what happened to each dose. "Upcoming" and "due" are worked out from the schedule,
-- so only what was done (or that a dose was missed) is stored.

create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  medication_id uuid not null,
  -- When the dose was due. A dose of an as-needed medicine uses the time it was taken.
  scheduled_for timestamptz not null,
  status text not null check (status in ('taken', 'skipped', 'missed')),
  taken_at timestamptz,
  -- Optional, e.g. 'felt unwell'
  skip_reason text check (char_length(skip_reason) <= 200),
  -- Where it was recorded: the app, a notification button, a WhatsApp or SMS reply, a caregiver,
  -- or the system marking a dose missed
  source text not null default 'app'
    check (source in ('app', 'push', 'whatsapp', 'sms', 'caregiver', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dose_logs_taken_at_only_when_taken check ((status = 'taken') = (taken_at is not null)),
  constraint dose_logs_skip_reason_only_when_skipped check (skip_reason is null or status = 'skipped'),
  -- One record per dose: recording the same dose again updates it (Task 45), so tapping Taken
  -- twice can't count twice
  constraint dose_logs_one_per_dose unique (medication_id, scheduled_for),
  -- The log's owner must be the medicine's owner
  constraint dose_logs_medication_fkey foreign key (medication_id, user_id)
    references public.medications (id, user_id) on delete cascade
);

comment on table public.dose_logs is
  'One row per dose that was taken, skipped or missed.';

create index dose_logs_user_id_scheduled_for_idx on public.dose_logs (user_id, scheduled_for desc);

create trigger set_updated_at before update on public.dose_logs
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.dose_logs enable row level security;
