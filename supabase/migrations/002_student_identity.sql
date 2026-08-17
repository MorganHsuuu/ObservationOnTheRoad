alter table submissions
  add column if not exists student_id text,
  add column if not exists student_name text;
