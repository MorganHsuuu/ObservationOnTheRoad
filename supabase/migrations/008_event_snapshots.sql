create table event_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  kind text not null check (kind in ('roster', 'tasks')),
  source text not null default 'manual' check (source in ('manual', 'daily')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index event_snapshots_lookup
  on event_snapshots (event_id, kind, created_at desc);

alter table event_snapshots enable row level security;
