create table if not exists feedback (
  id         text primary key,
  kind       text not null,
  choice     text not null,
  created_at timestamptz not null default now()
);
create index if not exists feedback_kind_idx on feedback (kind, choice);
