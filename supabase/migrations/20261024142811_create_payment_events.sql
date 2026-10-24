-- Payment events: every webhook Paystack sends (Task 70), stored once. They are financial records,
-- so they outlive the account: deleting a person only unlinks their events. How long they are kept
-- is part of the NDPA review (Task 16).

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paystack' check (provider in ('paystack')),
  -- What makes an event unique, e.g. 'charge.success:4099260516'. Paystack can send an event more
  -- than once, and the unique key below makes the repeats harmless.
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 200),
  event_type text not null check (char_length(event_type) between 1 and 100),
  user_id uuid references public.profiles (id) on delete set null,
  -- The payment reference, for matching against Paystack's records (Task 75)
  reference text check (char_length(reference) <= 200),
  amount_kobo integer check (amount_kobo >= 0),
  -- The webhook body exactly as received, after its signature was checked
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now(),
  -- When the app finished acting on the event; null means not handled yet
  processed_at timestamptz,
  constraint payment_events_once unique (provider, dedupe_key)
);

comment on table public.payment_events is
  'Paystack webhook events, each stored once and kept for accounting.';

create index payment_events_user_id_idx on public.payment_events (user_id);
create index payment_events_reference_idx on public.payment_events (reference)
  where reference is not null;
create index payment_events_unprocessed_idx on public.payment_events (received_at)
  where processed_at is null;

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.payment_events enable row level security;
