create table if not exists recordings (
  id          text primary key,
  user_id     text not null,
  title       text not null,
  duration_ms integer not null default 0,
  size_bytes  integer not null default 0,
  mime        text not null default 'video/webm',
  created_at  timestamptz not null default now()
);
create index if not exists recordings_user_id_idx on recordings (user_id, created_at desc);
