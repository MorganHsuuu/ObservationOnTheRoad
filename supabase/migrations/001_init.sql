create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  location_name text,
  lat double precision,
  lng double precision,
  event_date date,
  story_md text,
  briefing_md text,
  status text not null default 'setup',
  gallery_public boolean default false,
  show_public boolean default false,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  order_index int not null,
  title text not null,
  prompt_md text not null,
  hint text,
  requires_photo boolean default true,
  requires_caption boolean default true,
  max_photos int default 1,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  name text not null,
  code text not null,
  members text,
  unique (event_id, code)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  image_urls text[] not null default '{}',
  thumb_urls text[] not null default '{}',
  caption text,
  lat double precision,
  lng double precision,
  is_featured boolean default false,
  is_hidden boolean default false,
  created_at timestamptz default now()
);

alter table events enable row level security;
alter table tasks enable row level security;
alter table teams enable row level security;
alter table submissions enable row level security;

create policy "events_public_read" on events
  for select using (true);

create policy "tasks_public_read" on tasks
  for select using (status in ('published', 'closed'));

create policy "submissions_public_read" on submissions
  for select using (
    is_hidden = false
    and exists (
      select 1
      from tasks t
      join events e on e.id = t.event_id
      where t.id = submissions.task_id
        and (e.gallery_public = true or e.show_public = true)
    )
  );

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;

create policy "submissions_public_storage_read"
  on storage.objects for select
  using (bucket_id = 'submissions');

alter publication supabase_realtime add table events;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table submissions;
