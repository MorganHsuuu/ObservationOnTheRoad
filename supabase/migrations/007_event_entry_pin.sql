alter table events
  add column if not exists entry_pin text;

alter table events
  drop constraint if exists events_entry_pin_check;

alter table events
  add constraint events_entry_pin_check
  check (entry_pin is null or entry_pin ~ '^\d{4}$');

comment on column events.entry_pin is 'Optional 4-digit event login PIN';

revoke select (entry_pin) on table public.events from anon, authenticated;
