-- ==============================================================================
-- Migration: 20261101_media_foundation.sql
-- Description: Core Media Foundation for Videos, Audio, Series, Playlists & Engagement
-- Safe, idempotent, auto-adapts pre-existing schemas (renaming user_id/author_id
-- to owner_id, and post_id to item_id if present).
-- ==============================================================================

-- 0. Enable pg_trgm extension for fuzzy trigram search
create extension if not exists pg_trgm;

-- Ensure prerequisite tables exist safely so RLS subqueries never fail
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create table if not exists public.church_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  church_id text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, church_id)
);

-- ==============================================================================
-- 1. Table Evolution & Adaptation (Handles pre-existing tables safely)
-- ==============================================================================

-- 1.1 media_series
create table if not exists public.media_series (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  church_id uuid references public.churches(id) on delete set null,
  title text not null default 'Untitled Series',
  description text,
  cover_url text,
  kind text not null default 'video' check (kind in ('video', 'audio')),
  accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  -- Ensure owner_id column exists on media_series if table previously existed with user_id or author_id
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_series' and column_name = 'owner_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_series' and column_name = 'user_id') then
      alter table public.media_series rename column user_id to owner_id;
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_series' and column_name = 'author_id') then
      alter table public.media_series rename column author_id to owner_id;
    else
      alter table public.media_series add column owner_id uuid references public.profiles(id) on delete cascade;
    end if;
  end if;

  -- Ensure other columns exist on media_series
  alter table public.media_series add column if not exists church_id uuid references public.churches(id) on delete set null;
  alter table public.media_series add column if not exists title text not null default 'Untitled Series';
  alter table public.media_series add column if not exists description text;
  alter table public.media_series add column if not exists cover_url text;
  alter table public.media_series add column if not exists kind text not null default 'video';
  alter table public.media_series add column if not exists accent text;
  alter table public.media_series add column if not exists created_at timestamptz not null default now();
  alter table public.media_series add column if not exists updated_at timestamptz not null default now();
end $$;

create index if not exists idx_media_series_owner on public.media_series (owner_id);
create index if not exists idx_media_series_church on public.media_series (church_id);
create index if not exists idx_media_series_kind on public.media_series (kind, created_at desc);

-- 1.2 media_items
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video', 'audio')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  church_id uuid references public.churches(id) on delete set null,
  title text not null check (char_length(title) >= 1 and char_length(title) <= 240),
  description text,
  media_url text not null,
  thumb_url text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  category text not null default 'General',
  tags text[] not null default '{}'::text[],
  series_id uuid references public.media_series(id) on delete set null,
  episode_no integer check (episode_no is null or episode_no > 0),
  language text not null default 'en',
  visibility text not null check (visibility in ('public', 'followers', 'church', 'private')) default 'public',
  status text not null check (status in ('processing', 'published', 'hidden')) default 'published',
  chapters jsonb not null default '[]'::jsonb,
  transcript_url text,
  accent text,
  view_count integer not null default 0 check (view_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

do $$
begin
  -- Adapt any pre-existing media_items columns
  alter table public.media_items add column if not exists kind text not null default 'video';
  alter table public.media_items add column if not exists author_id uuid references public.profiles(id) on delete cascade;
  alter table public.media_items add column if not exists church_id uuid references public.churches(id) on delete set null;
  alter table public.media_items add column if not exists title text not null default 'Untitled Media';
  alter table public.media_items add column if not exists description text;
  alter table public.media_items add column if not exists media_url text not null default '';
  alter table public.media_items add column if not exists thumb_url text;
  alter table public.media_items add column if not exists duration_seconds integer not null default 0;
  alter table public.media_items add column if not exists category text not null default 'General';
  alter table public.media_items add column if not exists tags text[] not null default '{}'::text[];
  alter table public.media_items add column if not exists series_id uuid references public.media_series(id) on delete set null;
  alter table public.media_items add column if not exists episode_no integer;
  alter table public.media_items add column if not exists language text not null default 'en';
  alter table public.media_items add column if not exists visibility text not null default 'public';
  alter table public.media_items add column if not exists status text not null default 'published';
  alter table public.media_items add column if not exists chapters jsonb not null default '[]'::jsonb;
  alter table public.media_items add column if not exists transcript_url text;
  alter table public.media_items add column if not exists accent text;
  alter table public.media_items add column if not exists view_count integer not null default 0;
  alter table public.media_items add column if not exists like_count integer not null default 0;
  alter table public.media_items add column if not exists comment_count integer not null default 0;
  alter table public.media_items add column if not exists save_count integer not null default 0;
  alter table public.media_items add column if not exists created_at timestamptz not null default now();
  alter table public.media_items add column if not exists published_at timestamptz not null default now();
end $$;

create index if not exists idx_media_items_kind_status_pub on public.media_items (kind, status, published_at desc);
create index if not exists idx_media_items_author on public.media_items (author_id);
create index if not exists idx_media_items_church on public.media_items (church_id);
create index if not exists idx_media_items_category on public.media_items (category);
create index if not exists idx_media_items_series on public.media_items (series_id) where series_id is not null;
create index if not exists idx_media_items_tags on public.media_items using gin (tags);
create index if not exists idx_media_items_title_trgm on public.media_items using gin (title gin_trgm_ops);

-- 1.3 media_engagement
create table if not exists public.media_engagement (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.media_items(id) on delete cascade,
  liked boolean not null default false,
  saved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists idx_media_eng_user_saved on public.media_engagement (user_id, item_id) where saved = true;
create index if not exists idx_media_eng_user_liked on public.media_engagement (user_id, item_id) where liked = true;

-- 1.4 media_views
create table if not exists public.media_views (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.media_items(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  viewer_key text not null,
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  view_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint media_views_daily_dedupe unique (item_id, viewer_key, view_date)
);

create index if not exists idx_media_views_item_date on public.media_views (item_id, view_date desc);

-- 1.5 watch_progress
create table if not exists public.watch_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.media_items(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists idx_watch_progress_user on public.watch_progress (user_id, updated_at desc);

-- 1.6 playlists & playlist_items (Robust adaptation for owner_id vs user_id)
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null default 'New Playlist',
  description text,
  is_public boolean not null default true,
  kind text not null default 'mixed',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  -- If playlists table previously had user_id instead of owner_id, rename or add owner_id
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlists' and column_name = 'owner_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlists' and column_name = 'user_id') then
      alter table public.playlists rename column user_id to owner_id;
    else
      alter table public.playlists add column owner_id uuid references public.profiles(id) on delete cascade;
    end if;
  end if;

  -- Ensure all other columns exist
  alter table public.playlists add column if not exists title text not null default 'New Playlist';
  alter table public.playlists add column if not exists description text;
  alter table public.playlists add column if not exists is_public boolean not null default true;
  alter table public.playlists add column if not exists kind text not null default 'mixed';
  alter table public.playlists add column if not exists cover_url text;
  alter table public.playlists add column if not exists created_at timestamptz not null default now();
  alter table public.playlists add column if not exists updated_at timestamptz not null default now();
end $$;

create index if not exists idx_playlists_owner on public.playlists (owner_id);
create index if not exists idx_playlists_kind on public.playlists (kind, is_public);

create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  item_id uuid references public.media_items(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now()
);

do $$
begin
  -- Adapt item_id if playlist_items previously existed with post_id
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlist_items' and column_name = 'item_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlist_items' and column_name = 'post_id') then
      alter table public.playlist_items rename column post_id to item_id;
    else
      alter table public.playlist_items add column item_id uuid references public.media_items(id) on delete cascade;
    end if;
  end if;
end $$;

-- Drop and re-add constraint safely
alter table public.playlist_items drop constraint if exists playlist_items_unique;
alter table public.playlist_items add constraint playlist_items_unique unique (playlist_id, item_id);

create index if not exists idx_playlist_items_order on public.playlist_items (playlist_id, position asc);

-- ==============================================================================
-- 2. Triggers and RPC Functions
-- ==============================================================================

-- 2.1 toggle_media_like
create or replace function public.toggle_media_like(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_new_liked boolean;
  v_like_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to like media';
  end if;

  insert into public.media_engagement (user_id, item_id, liked, updated_at)
  values (v_user_id, p_item_id, true, now())
  on conflict (user_id, item_id)
  do update set
    liked = not public.media_engagement.liked,
    updated_at = now()
  returning liked into v_new_liked;

  if v_new_liked then
    update public.media_items
    set like_count = like_count + 1
    where id = p_item_id
    returning like_count into v_like_count;
  else
    update public.media_items
    set like_count = greatest(0, like_count - 1)
    where id = p_item_id
    returning like_count into v_like_count;
  end if;

  return jsonb_build_object(
    'item_id', p_item_id,
    'liked', v_new_liked,
    'like_count', coalesce(v_like_count, 0)
  );
end;
$$;

-- 2.2 toggle_media_save
create or replace function public.toggle_media_save(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_new_saved boolean;
  v_save_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to save media';
  end if;

  insert into public.media_engagement (user_id, item_id, saved, updated_at)
  values (v_user_id, p_item_id, true, now())
  on conflict (user_id, item_id)
  do update set
    saved = not public.media_engagement.saved,
    updated_at = now()
  returning saved into v_new_saved;

  if v_new_saved then
    update public.media_items
    set save_count = save_count + 1
    where id = p_item_id
    returning save_count into v_save_count;
  else
    update public.media_items
    set save_count = greatest(0, save_count - 1)
    where id = p_item_id
    returning save_count into v_save_count;
  end if;

  return jsonb_build_object(
    'item_id', p_item_id,
    'saved', v_new_saved,
    'save_count', coalesce(v_save_count, 0)
  );
end;
$$;

-- 2.3 record_media_view
create or replace function public.record_media_view(
  p_item_id uuid,
  p_watched_seconds int default 0,
  p_viewer_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_key text;
  v_inserted boolean := false;
  v_new_count int;
begin
  v_user_id := auth.uid();
  v_key := coalesce(
    nullif(trim(p_viewer_key), ''),
    case when v_user_id is not null then v_user_id::text else 'anon-' || md5(now()::text) end
  );

  insert into public.media_views (item_id, user_id, viewer_key, watched_seconds, view_date)
  values (p_item_id, v_user_id, v_key, greatest(0, coalesce(p_watched_seconds, 0)), current_date)
  on conflict (item_id, viewer_key, view_date)
  do update set
    watched_seconds = greatest(public.media_views.watched_seconds, excluded.watched_seconds)
  returning true into v_inserted;

  if v_inserted then
    update public.media_items
    set view_count = view_count + 1
    where id = p_item_id
    returning view_count into v_new_count;
  else
    select view_count into v_new_count
    from public.media_items
    where id = p_item_id;
  end if;

  return jsonb_build_object(
    'item_id', p_item_id,
    'view_counted', v_inserted,
    'view_count', coalesce(v_new_count, 0)
  );
end;
$$;

-- 2.4 search_media
create or replace function public.search_media(
  q text,
  p_kind text default null,
  p_category text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  kind text,
  author_id uuid,
  church_id uuid,
  title text,
  description text,
  media_url text,
  thumb_url text,
  duration_seconds integer,
  category text,
  tags text[],
  series_id uuid,
  episode_no integer,
  accent text,
  view_count integer,
  like_count integer,
  published_at timestamptz,
  similarity_score real
)
language sql
stable
set search_path = public
as $$
  select
    m.id,
    m.kind,
    m.author_id,
    m.church_id,
    m.title,
    m.description,
    m.media_url,
    m.thumb_url,
    m.duration_seconds,
    m.category,
    m.tags,
    m.series_id,
    m.episode_no,
    m.accent,
    m.view_count,
    m.like_count,
    m.published_at,
    greatest(
      similarity(m.title, coalesce(q, '')),
      case when m.title ilike ('%' || coalesce(q, '') || '%') then 0.6 else 0.0 end
    )::real as similarity_score
  from public.media_items m
  where m.status = 'published'
    and (p_kind is null or m.kind = p_kind)
    and (p_category is null or m.category = p_category)
    and (
      q is null or trim(q) = ''
      or m.title ilike ('%' || trim(q) || '%')
      or similarity(m.title, trim(q)) > 0.15
      or trim(q) = any(m.tags)
    )
  order by similarity_score desc, m.published_at desc
  limit least(coalesce(p_limit, 20), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- 2.5 trending_media
create or replace function public.trending_media(
  p_kind text default null,
  p_days int default 7,
  p_limit int default 12
)
returns setof public.media_items
language sql
stable
set search_path = public
as $$
  select m.*
  from public.media_items m
  where m.status = 'published'
    and m.visibility = 'public'
    and (p_kind is null or m.kind = p_kind)
    and m.published_at >= now() - (coalesce(p_days, 7) || ' days')::interval
  order by
    ((m.view_count * 1.0) + (m.like_count * 3.5) + (m.save_count * 2.0)) /
    power(greatest(1.0, extract(epoch from (now() - m.published_at)) / 3600.0 + 2.0), 1.25) desc,
    m.published_at desc
  limit least(coalesce(p_limit, 12), 40);
$$;

-- ==============================================================================
-- 3. Row Level Security (RLS)
-- ==============================================================================

alter table public.media_series enable row level security;
alter table public.media_items enable row level security;
alter table public.media_engagement enable row level security;
alter table public.media_views enable row level security;
alter table public.watch_progress enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;

-- 3.1 media_series Policies
drop policy if exists "Public can read series" on public.media_series;
create policy "Public can read series"
  on public.media_series for select
  using (true);

drop policy if exists "Owners and church leaders manage series" on public.media_series;
create policy "Owners and church leaders manage series"
  on public.media_series for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- 3.2 media_items Policies
drop policy if exists "Read published media items" on public.media_items;
create policy "Read published media items"
  on public.media_items for select
  using (
    auth.uid() = author_id
    or
    (
      status = 'published' and (
        visibility = 'public'
        or
        (
          visibility = 'followers'
          and auth.uid() is not null
          and exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.followed_id = author_id
          )
        )
        or
        (
          visibility = 'church'
          and auth.uid() is not null
          and (
            exists (
              select 1 from public.church_members cm
              where cm.user_id = auth.uid()
                and (cm.church_id = media_items.church_id::text or cm.church_id = (select p.church_id::text from public.profiles p where p.id = auth.uid()))
                and cm.status = 'active'
            )
            or exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.church_id = media_items.church_id
            )
          )
        )
      )
    )
    or
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role in ('platform_admin', 'church_admin') or p.badge in ('lead_pastor', 'admin', 'moderator'))
    )
  );

drop policy if exists "Authors can insert media items" on public.media_items;
create policy "Authors can insert media items"
  on public.media_items for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors and moderators can update media items" on public.media_items;
create policy "Authors and moderators can update media items"
  on public.media_items for update
  to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role in ('platform_admin', 'church_admin') or p.badge in ('lead_pastor', 'admin', 'moderator'))
    )
  )
  with check (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role in ('platform_admin', 'church_admin') or p.badge in ('lead_pastor', 'admin', 'moderator'))
    )
  );

drop policy if exists "Authors can delete own media items" on public.media_items;
create policy "Authors can delete own media items"
  on public.media_items for delete
  to authenticated
  using (auth.uid() = author_id);

-- 3.3 media_engagement Policies
drop policy if exists "Users read own engagement" on public.media_engagement;
create policy "Users read own engagement"
  on public.media_engagement for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage own engagement" on public.media_engagement;
create policy "Users manage own engagement"
  on public.media_engagement for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3.4 media_views Policies
drop policy if exists "Insert media views" on public.media_views;
create policy "Insert media views"
  on public.media_views for insert
  with check (true);

drop policy if exists "Read own media views" on public.media_views;
create policy "Read own media views"
  on public.media_views for select
  using (auth.uid() = user_id or auth.uid() is null);

-- 3.5 watch_progress Policies
drop policy if exists "User manages own watch progress" on public.watch_progress;
create policy "User manages own watch progress"
  on public.watch_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3.6 playlists & playlist_items Policies
drop policy if exists "Read public playlists or own" on public.playlists;
create policy "Read public playlists or own"
  on public.playlists for select
  using (is_public = true or auth.uid() = owner_id);

drop policy if exists "Owner manages playlists" on public.playlists;
create policy "Owner manages playlists"
  on public.playlists for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Read playlist items for visible playlists" on public.playlist_items;
create policy "Read playlist items for visible playlists"
  on public.playlist_items for select
  using (
    exists (
      select 1 from public.playlists pl
      where pl.id = playlist_items.playlist_id
        and (pl.is_public = true or pl.owner_id = auth.uid())
    )
  );

drop policy if exists "Owner manages playlist items" on public.playlist_items;
create policy "Owner manages playlist items"
  on public.playlist_items for all
  using (
    exists (
      select 1 from public.playlists pl
      where pl.id = playlist_items.playlist_id
        and pl.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists pl
      where pl.id = playlist_items.playlist_id
        and pl.owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- 4. Storage Buckets Setup (Safely wrapped)
-- ==============================================================================

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('media-library', 'media-library', true, 104857600, null),
    ('thumbnails', 'thumbnails', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  on conflict (id) do update set public = true;

  -- Storage RLS
  drop policy if exists "Public media library read" on storage.objects;
  create policy "Public media library read"
    on storage.objects for select
    using (bucket_id in ('media-library', 'thumbnails', 'post-media', 'avatars'));

  drop policy if exists "Authenticated media library upload" on storage.objects;
  create policy "Authenticated media library upload"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id in ('media-library', 'thumbnails', 'post-media', 'avatars')
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "Authenticated media library update own" on storage.objects;
  create policy "Authenticated media library update own"
    on storage.objects for update
    to authenticated
    using (
      bucket_id in ('media-library', 'thumbnails', 'post-media', 'avatars')
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "Authenticated media library delete own" on storage.objects;
  create policy "Authenticated media library delete own"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id in ('media-library', 'thumbnails', 'post-media', 'avatars')
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception
  when others then
    -- Catch and notify if storage schema has restricted SQL execution permissions
    raise notice 'Storage configuration skipped or restricted: %', sqlerrm;
end $$;
