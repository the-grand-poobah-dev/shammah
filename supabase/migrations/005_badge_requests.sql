-- Shammah migration 005: badge change requests (the "Request a badge change" button)
-- Safe to re-run.

create table if not exists badge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  current_badge text references badges(id),
  requested_badge text not null references badges(id),
  reason text not null check (char_length(reason) between 10 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- one waiting request per person
create unique index if not exists one_pending_badge_request
  on badge_requests (user_id) where status = 'pending';

alter table badge_requests enable row level security;
grant select, insert on badge_requests to authenticated;

drop policy if exists "people read their own badge requests" on badge_requests;
create policy "people read their own badge requests" on badge_requests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "people file their own badge requests" on badge_requests;
create policy "people file their own badge requests" on badge_requests
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending');

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- HOW YOU REVIEW REQUESTS (SQL Editor):
--   select r.id, p.display_name, r.current_badge, r.requested_badge, r.reason, r.created_at
--   from badge_requests r join profiles p on p.id = r.user_id
--   where r.status = 'pending' order by r.created_at;
--
-- To approve one:
--   update profiles set badge = '<requested_badge>' where id = '<user_id>';
--   update badge_requests set status = 'approved', reviewed_at = now() where id = '<request id>';
-- To decline:
--   update badge_requests set status = 'declined', reviewed_at = now() where id = '<request id>';
-- ---------------------------------------------------------------
