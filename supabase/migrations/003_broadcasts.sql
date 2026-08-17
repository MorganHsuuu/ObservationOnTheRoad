create table event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  student_id text not null,
  student_name text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create table broadcasts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  kind text not null check (kind in ('ack', 'yesno', 'choice')),
  body text not null,
  options text[] not null default '{}',
  status text not null default 'live' check (status in ('live', 'closed')),
  created_at timestamptz not null default now()
);

create unique index one_live_broadcast_per_event
  on broadcasts (event_id)
  where status = 'live';

create table broadcast_responses (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid references broadcasts(id) on delete cascade not null,
  team_id uuid references teams(id) on delete set null,
  student_id text not null,
  student_name text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (broadcast_id, student_id)
);

alter table event_participants enable row level security;
alter table broadcasts enable row level security;
alter table broadcast_responses enable row level security;

create policy "participants_public_read" on event_participants
  for select using (true);

create policy "broadcasts_public_read" on broadcasts
  for select using (true);

create policy "broadcast_responses_public_read" on broadcast_responses
  for select using (true);

alter publication supabase_realtime add table event_participants;
alter publication supabase_realtime add table broadcasts;
alter publication supabase_realtime add table broadcast_responses;
