-- ============================================================
-- Shammah migration 013: Follows, Blocks & Profile Privacy
-- Replaces mock localStorage follows/blocks with real Supabase tables & RLS
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Ensure Missing Lookup Badges Exist
-- ---------------------------------------------------------------
insert into badges (id, label, sort_order) values
  ('church_admin', 'Church Administrator', 135),
  ('partner',      'Ministry Partner',     136)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- 2. Profile Lock & Inbox Permission Columns
-- ---------------------------------------------------------------
alter table profiles
  add column if not exists is_locked boolean not null default false;

alter table profiles
  add column if not exists inbox_permission text not null default 'everyone';

alter table profiles drop constraint if exists profiles_inbox_permission_check;
alter table profiles add constraint profiles_inbox_permission_check
  check (inbox_permission in ('everyone', 'followers_church', 'no_one'));

create index if not exists profiles_is_locked_idx on profiles (is_locked);
create index if not exists profiles_inbox_permission_idx on profiles (inbox_permission);

-- ---------------------------------------------------------------
-- 3. Follows Table
-- ---------------------------------------------------------------
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followed_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_distinct_users check (follower_id <> followed_id)
);

create index if not exists follows_follower_id_idx on follows (follower_id);
create index if not exists follows_followed_id_idx on follows (followed_id);

alter table follows enable row level security;
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- Anyone signed in (or visiting profiles) can read follow relationships
drop policy if exists "follows are readable" on follows;
create policy "follows are readable" on follows
  for select
  using (true);

-- A user can only insert where they are the follower
drop policy if exists "users can follow" on follows;
create policy "users can follow" on follows
  for insert
  to authenticated
  with check (auth.uid() = follower_id);

-- A user can only delete where they are the follower
drop policy if exists "users can unfollow" on follows;
create policy "users can unfollow" on follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------
-- 4. Blocks Table
-- ---------------------------------------------------------------
create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_distinct_users check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocker_id_idx on blocks (blocker_id);
create index if not exists blocks_blocked_id_idx on blocks (blocked_id);

alter table blocks enable row level security;
grant select, insert, delete on public.blocks to authenticated;

-- Users can only read their own blocks (not visible to others, including the blocked person)
drop policy if exists "users can read their own blocks" on blocks;
create policy "users can read their own blocks" on blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id);

-- Users can only insert where they are the blocker
drop policy if exists "users can block" on blocks;
create policy "users can block" on blocks
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- Users can only delete where they are the blocker
drop policy if exists "users can unblock" on blocks;
create policy "users can unblock" on blocks
  for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- ---------------------------------------------------------------
-- 5. Helper Function: Check Block Relationship (Security Definer)
-- ---------------------------------------------------------------
create or replace function public.is_blocked_between(u1 uuid, u2 uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from blocks
    where (blocker_id = u1 and blocked_id = u2)
       or (blocker_id = u2 and blocked_id = u1)
  );
$$;

-- ---------------------------------------------------------------
-- 6. Helper Function: Get Follow Stats for a Profile
-- ---------------------------------------------------------------
create or replace function public.get_user_follow_stats(p_user_id uuid)
returns table (followers_count bigint, following_count bigint)
language sql stable as $$
  select
    (select count(*)::bigint from follows where followed_id = p_user_id) as followers_count,
    (select count(*)::bigint from follows where follower_id = p_user_id) as following_count;
$$;

-- ---------------------------------------------------------------
-- 7. Update Direct Messages Policy with Blocks & Follows Enforcement
-- ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'direct_messages') then
    drop policy if exists "users can send direct messages" on direct_messages;
    create policy "users can send direct messages" on direct_messages
      for insert
      to authenticated
      with check (
        auth.uid() = sender_id
        and not public.is_blocked_between(auth.uid(), recipient_id)
        and exists (
          select 1 from profiles p
          where p.id = recipient_id
            and (
              coalesce(p.inbox_permission, 'everyone') = 'everyone'
              or (
                coalesce(p.inbox_permission, 'everyone') = 'followers_church'
                and (
                  exists (select 1 from follows f where f.follower_id = recipient_id and f.followed_id = auth.uid())
                  or (
                    p.church_id is not null
                    and exists (select 1 from profiles me where me.id = auth.uid() and me.church_id = p.church_id)
                  )
                )
              )
            )
        )
      );
  end if;
end $$;

notify pgrst, 'reload schema';
