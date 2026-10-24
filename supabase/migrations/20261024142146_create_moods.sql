-- Moods: the daily check-in, one per person per day.

create table public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The day in the person's own time zone
  logged_on date not null,
  mood text not null check (mood in ('happy', 'neutral', 'sad')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Choosing again on the same day updates that day's mood
  constraint moods_one_per_day unique (user_id, logged_on)
);

comment on table public.moods is 'The daily mood check-in: happy, neutral or sad, with an optional note.';

create trigger set_updated_at before update on public.moods
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.moods enable row level security;
