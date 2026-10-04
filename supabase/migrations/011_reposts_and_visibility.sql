-- ============================================================
-- Shammah migration 011: Post Reposts & Post Visibility Settings
-- Replaces mock localStorage post interactions with real Supabase persistence & RLS
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Post Visibility
-- ---------------------------------------------------------------
alter table posts
  add column if not exists visibility text not null default 'public';

alter table posts drop constraint if exists posts_visibility_check;
alter table posts add constraint posts_visibility_check
  check (visibility in ('public', 'followers', 'church', 'private'));

create index if not exists posts_visibility_idx on posts (visibility);

-- Enable RLS on posts (idempotent)
alter table posts enable row level security;

-- Grant permissions to authenticated and anon users
grant select on public.posts to anon, authenticated;
grant update on public.posts to authenticated;

-- RLS Policy: Users can only read posts based on privacy/visibility
-- - Authors can always view their own posts
-- - Platform admins can view any post
-- - 'public' posts are visible to anyone (including anon visitors)
-- - 'church' posts are visible to fellow church members
-- - 'private' posts are strictly visible ONLY to the author
drop policy if exists "posts are readable" on posts;
drop policy if exists "posts are readable based on visibility" on posts;
create policy "posts are readable based on visibility" on posts
  for select
  using (
    -- Author can always view their own posts
    auth.uid() = author_id
    -- Platform admins can view any post
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'platform_admin'
    )
    -- Public posts can be viewed by anyone
    or (coalesce(visibility, 'public') = 'public')
    -- Church-restricted posts can be viewed by members of the same church
    or (
      coalesce(visibility, 'public') = 'church'
      and church_id is not null
      and exists (
        select 1 from profiles p
        where p.id = auth.uid()
          and p.church_id = posts.church_id
      )
    )
  );

-- Authors can update their own posts (e.g. edit text or toggle visibility)
drop policy if exists "authors can update their own posts" on posts;
create policy "authors can update their own posts" on posts
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);


-- ---------------------------------------------------------------
-- 2. Post Reposts Table
-- ---------------------------------------------------------------
create table if not exists post_reposts (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  quote_text  text,
  created_at  timestamptz not null default now(),
  constraint post_reposts_post_user_uidx unique (post_id, user_id)
);

create index if not exists post_reposts_post_idx on post_reposts (post_id);
create index if not exists post_reposts_user_idx on post_reposts (user_id);
create index if not exists post_reposts_created_idx on post_reposts (created_at desc);

alter table post_reposts enable row level security;
grant select, insert, delete on public.post_reposts to authenticated;
grant select on public.post_reposts to anon;

-- Repost counts / status readable by any signed-in user (and anon for public counts)
drop policy if exists "reposts are readable by signed-in users" on post_reposts;
drop policy if exists "reposts are readable" on post_reposts;
create policy "reposts are readable by signed-in users" on post_reposts
  for select
  using (true);

-- A user can repost any visible post (enforced via foreign key & subquery)
drop policy if exists "users can repost visible posts" on post_reposts;
create policy "users can repost visible posts" on post_reposts
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from posts p
      where p.id = post_id
    )
  );

-- A user can only remove their own repost
drop policy if exists "users can remove their own reposts" on post_reposts;
create policy "users can remove their own reposts" on post_reposts
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------
-- 3. RPC Functions: Efficient counts
-- ---------------------------------------------------------------
-- Batch returns repost counts for an array of post IDs
create or replace function public.repost_counts(p_post_ids uuid[])
returns table (post_id uuid, count bigint)
language sql stable as $$
  select post_id, count(*)::bigint
  from post_reposts
  where post_id = any(p_post_ids)
  group by post_id;
$$;
grant execute on function public.repost_counts(uuid[]) to authenticated, anon;

-- Returns total reposts received by an author's posts (used in user profile statistics)
create or replace function public.user_reposts_received_count(p_author_id uuid)
returns bigint
language sql stable as $$
  select coalesce(count(*)::bigint, 0)
  from post_reposts r
  join posts p on p.id = r.post_id
  where p.author_id = p_author_id;
$$;
grant execute on function public.user_reposts_received_count(uuid) to authenticated, anon;

notify pgrst, 'reload schema';
