create table submission_likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  submission_id uuid references submissions(id) on delete cascade not null,
  student_id text not null,
  created_at timestamptz not null default now(),
  unique (submission_id, student_id)
);

create index submission_likes_event_id_idx on submission_likes (event_id);

alter table submission_likes enable row level security;

create policy "submission_likes_public_read" on submission_likes
  for select using (true);

alter publication supabase_realtime add table submission_likes;
