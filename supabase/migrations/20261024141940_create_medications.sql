-- Medications: what each person takes, how much, and on what schedule.

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  -- As written on the pack, e.g. '500 mg' or '5 mg/5 ml'
  strength text check (char_length(strength) <= 50),
  form text not null default 'tablet'
    check (form in ('tablet', 'capsule', 'liquid', 'injection', 'cream', 'drops', 'inhaler', 'patch')),
  -- How much is taken each time, in dose_unit. Refill tracking counts down by this.
  dose_amount numeric(8, 2) not null default 1 check (dose_amount > 0),
  dose_unit text not null default 'tablet'
    check (dose_unit in ('tablet', 'capsule', 'ml', 'drop', 'puff', 'patch', 'application', 'unit')),
  -- When doses are due. The schedule engine (Task 43) defines its shape; here it must be an
  -- object that says which kind of schedule it is, e.g. {"type": "daily", "times": ["08:00"]}.
  schedule jsonb not null check (jsonb_typeof(schedule) = 'object' and schedule ? 'type'),
  start_date date not null,
  end_date date check (end_date >= start_date),
  -- e.g. 'after food'
  instructions text check (char_length(instructions) <= 200),
  notes text check (char_length(notes) <= 500),
  -- How the medicine looks, for its picture in the app, e.g. {"shape": "round", "color": "white"}
  appearance jsonb check (jsonb_typeof(appearance) = 'object'),
  -- Path of its photo in Storage (paid plans, Task 49)
  photo_path text check (char_length(photo_path) <= 300),
  -- The NAFDAC registration number on the pack, e.g. 'A4-1234'
  nafdac_number text check (char_length(nafdac_number) <= 20),
  -- Supply left, in dose_unit; null when the person doesn't track it
  quantity_remaining numeric(10, 2) check (quantity_remaining >= 0),
  -- Warn when this many days of supply are left
  refill_alert_days smallint check (refill_alert_days between 1 and 365),
  -- How this medicine's reminders are sent; null means the account's defaults
  reminder_channels text[] check (
    cardinality(reminder_channels) > 0
    and reminder_channels <@ array['push', 'whatsapp', 'sms', 'email']
  ),
  -- Set when a downgrade leaves more medicines than the plan allows (Task 71)
  paused_at timestamptz,
  -- Deleting archives a medicine, so it can be undone and its dose history stays (Task 46)
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets dose logs and reminder records prove they belong to the medicine's owner
  constraint medications_id_user_id_key unique (id, user_id)
);

comment on table public.medications is
  'What each person takes: the medicine, the dose, its schedule and its supply.';

create index medications_user_id_idx on public.medications (user_id);

create trigger set_updated_at before update on public.medications
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.medications enable row level security;
