-- A medicine's schedule must be one of the kinds the schedule engine understands
-- (lib/schedule/schema.ts), so the app never meets a saved schedule it can't turn into doses.

alter table public.medications
  add constraint medications_schedule_type check (
    schedule ->> 'type' in ('daily', 'every_n_hours', 'every_n_days', 'weekdays', 'course', 'as_needed')
  );
