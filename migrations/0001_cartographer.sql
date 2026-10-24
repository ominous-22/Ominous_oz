-- The saved desk: runs, operator log, and deleted run ids, stored as one JSON
-- document. Merged server-side on every save so two devices never drop each
-- other's runs. One owner today (user_id 'owner'); the key leaves room for more.
create table if not exists cartographer_desk (
  user_id    text primary key,
  data       text not null,
  updated_at timestamptz not null default now()
);
