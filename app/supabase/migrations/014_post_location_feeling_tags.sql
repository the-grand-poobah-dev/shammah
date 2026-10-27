-- ============================================================
-- Shammah migration 014: Post Location, Feeling & Member Tags with Privacy
-- ============================================================

-- 1. Post metadata
alter table public.posts
  add column if not exists location_label    text,
  add column if not exists location_place_id text,
  add column if not exists location_lat      double precision,
  add column if not exists location_lng      double precision,
  add column if not exists feeling           text;   -- e.g. "Grateful 🙏" or plain label

-- 2. Profile tagging preferences
alter table public.profiles
  add column if not exists who_can_tag_me text not null default 'everyone'
    check (who_can_tag_me in ('everyone','following','no_one')),
  add column if not exists review_tags   boolean not null default false;

-- 3. Post tags (junction + review state)
create table if not exists public.post_tags (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  tagged_user uuid not null references public.profiles(id) on delete cascade,
  tagged_by   uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending'
    check (status in ('pending','accepted','declined')),
  created_at  timestamptz not null default now(),
  unique (post_id, tagged_user)
);

create index if not exists post_tags_user_status_idx on public.post_tags (tagged_user, status);
create index if not exists post_tags_post_idx on public.post_tags (post_id);

-- 4. Enable RLS and setup policies
alter table public.post_tags enable row level security;

grant select, insert, update, delete on public.post_tags to authenticated;
grant select on public.post_tags to anon;

-- Author can insert tags
drop policy if exists "post_tags_insert_policy" on public.post_tags;
create policy "post_tags_insert_policy"
  on public.post_tags
  for insert
  to authenticated
  with check (auth.uid() = tagged_by);

-- Select policy:
-- 1. Anyone can see 'accepted' tags
-- 2. The tagged user can see their own tag (including pending/declined)
-- 3. The tagger can see tags they created
drop policy if exists "post_tags_select_policy" on public.post_tags;
create policy "post_tags_select_policy"
  on public.post_tags
  for select
  using (
    status = 'accepted'
    or auth.uid() = tagged_user
    or auth.uid() = tagged_by
  );

-- Update policy:
-- Tagged user can update their status to accepted or declined
drop policy if exists "post_tags_update_policy" on public.post_tags;
create policy "post_tags_update_policy"
  on public.post_tags
  for update
  to authenticated
  using (auth.uid() = tagged_user)
  with check (auth.uid() = tagged_user);

-- Delete policy:
-- Author or tagged user can remove tag
drop policy if exists "post_tags_delete_policy" on public.post_tags;
create policy "post_tags_delete_policy"
  on public.post_tags
  for delete
  to authenticated
  using (auth.uid() = tagged_by or auth.uid() = tagged_user);

-- Reload schema cache
notify pgrst, 'reload schema';
