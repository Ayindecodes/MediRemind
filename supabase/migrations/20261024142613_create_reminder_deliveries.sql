-- Reminder deliveries: every reminder sent, or tried, on every channel. The dispatcher (Task 56)
-- inserts a row before sending, and the unique key below stops the same reminder going out twice
-- even if two runs overlap.

create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  medication_id uuid not null,
  -- The dose the reminder is about
  scheduled_for timestamptz not null,
  channel text not null check (channel in ('push', 'whatsapp', 'sms', 'email')),
  -- The first reminder, or a follow-up when it wasn't answered (Task 62)
  kind text not null default 'reminder' check (kind in ('reminder', 'follow_up')),
  -- Retries after a failure count up from 1
  attempt smallint not null default 1 check (attempt between 1 and 5),
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed')),
  -- The provider's ID for the message, to match its delivery reports (Termii, WhatsApp)
  provider_message_id text check (char_length(provider_message_id) <= 200),
  error text check (char_length(error) <= 1000),
  -- What the message cost in kobo (100 kobo = ₦1), for plan limits and spending alerts
  cost_kobo integer check (cost_kobo >= 0),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint reminder_deliveries_once unique (medication_id, scheduled_for, channel, kind, attempt),
  constraint reminder_deliveries_sent_at check (status in ('queued', 'failed') or sent_at is not null),
  constraint reminder_deliveries_delivered_at check (status <> 'delivered' or delivered_at is not null),
  -- The delivery's owner must be the medicine's owner
  constraint reminder_deliveries_medication_fkey foreign key (medication_id, user_id)
    references public.medications (id, user_id) on delete cascade
);

comment on table public.reminder_deliveries is
  'Every reminder sent or tried, with its channel, status and cost.';

-- The dispatcher's queue
create index reminder_deliveries_queued_idx on public.reminder_deliveries (created_at)
  where status = 'queued';
-- Delivery reports arrive with the provider's message ID
create index reminder_deliveries_provider_message_idx
  on public.reminder_deliveries (channel, provider_message_id)
  where provider_message_id is not null;
-- Each person's messages this month, for plan limits
create index reminder_deliveries_user_id_created_at_idx
  on public.reminder_deliveries (user_id, created_at desc);

create trigger set_updated_at before update on public.reminder_deliveries
  for each row execute function public.set_updated_at();

-- Access rules arrive in Task 35. Until then only the service role can read or write.
alter table public.reminder_deliveries enable row level security;
