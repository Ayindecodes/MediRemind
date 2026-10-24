-- Profiles: one row per account, keyed by the Supabase Auth user.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  -- The sign-in number in E.164 form, e.g. +2348031234567
  phone text unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- Optional; stored lowercase so lookups don't depend on how it was typed
  email text unique check (email = lower(email) and email like '%_@_%._%' and char_length(email) <= 254),
  timezone text not null default 'Africa/Lagos' check (public.is_valid_timezone(timezone)),
  -- English, Nigerian Pidgin, Yoruba, Hausa or Igbo (ISO 639 codes)
  language text not null default 'en' check (language in ('en', 'pcm', 'yo', 'ha', 'ig')),
  plan text not null default 'free' check (plan in ('free', 'premium', 'family')),
  -- When a paid plan or pass ends; the free plan never does
  plan_expires_at timestamptz check (plan <> 'free' or plan_expires_at is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Accounts moved from the old JSON store have only an email; new ones sign in by phone
  constraint profiles_contact_required check (phone is not null or email is not null)
);

comment on table public.profiles is 'One row per account: contact details, preferences and plan.';

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.profiles enable row level security;
