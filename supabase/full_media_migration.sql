-- ==============================================================================
-- SHAMMAH COMPLETE MEDIA & REELS MIGRATION (BULLETPROOF & SELF-HEALING)
-- Safe, idempotent, dynamically resolves foreign keys so it NEVER fails.
-- ==============================================================================

-- 0. Extensions & Prerequisites
create extension if not exists pg_trgm;

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

-- Ensure standard categories exist so FKs never fail
create table if not exists public.categories (
  id text primary key,
  name text not null
);

insert into public.categories (id, name) values
  ('prayer', 'Prayer Requests & Praise Reports'),
  ('worship', 'Worship & Creative Arts'),
  ('stories', 'Stories & Experiences'),
  ('podcasts', 'Podcasts & Videos'),
  ('lessons', 'Lessons & Icebreakers'),
  ('teen', 'Teen Talks'),
  ('youth', 'Youth & Campus'),
  ('testimonies', 'Testimonies & Miracles'),
  ('events', 'Events'),
  ('resources', 'Resources')
on conflict (id) do update set name = excluded.name;

-- ==============================================================================
-- 1. Table Definitions & Safe Column Evolution
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
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_series' and column_name = 'owner_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_series' and column_name = 'user_id') then
      alter table public.media_series rename column user_id to owner_id;
    elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_series' and column_name = 'author_id') then
      alter table public.media_series rename column author_id to owner_id;
    else
      alter table public.media_series add column owner_id uuid references public.profiles(id) on delete cascade;
    end if;
  end if;

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

-- 1.6 playlists & playlist_items
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
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlists' and column_name = 'owner_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlists' and column_name = 'user_id') then
      alter table public.playlists rename column user_id to owner_id;
    else
      alter table public.playlists add column owner_id uuid references public.profiles(id) on delete cascade;
    end if;
  end if;

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
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlist_items' and column_name = 'item_id') then
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'playlist_items' and column_name = 'post_id') then
      alter table public.playlist_items rename column post_id to item_id;
    else
      alter table public.playlist_items add column item_id uuid references public.media_items(id) on delete cascade;
    end if;
  end if;
end $$;

alter table public.playlist_items drop constraint if exists playlist_items_unique;
alter table public.playlist_items add constraint playlist_items_unique unique (playlist_id, item_id);
create index if not exists idx_playlist_items_order on public.playlist_items (playlist_id, position asc);

-- 1.7 Posts extra columns for Reels
alter table public.posts
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists sound_title text default 'Original Sound',
  add column if not exists duration_seconds integer default 0,
  add column if not exists media_duration_seconds integer default 0,
  add column if not exists media_thumbnail_url text,
  add column if not exists visibility text not null default 'public';

create index if not exists idx_posts_reels_created on public.posts (media_type, created_at desc) where media_type = 'reel';
create index if not exists idx_posts_author_reels on public.posts (author_id, media_type) where media_type = 'reel';

-- 1.8 Comments extra columns for Media Items
alter table public.comments
  add column if not exists media_id uuid references public.media_items(id) on delete cascade;

do $$
begin
  alter table public.comments alter column post_id drop not null;
exception when others then
  null;
end $$;

create index if not exists idx_comments_media_id on public.comments (media_id, created_at asc) where media_id is not null;

-- ==============================================================================
-- 2. Stored Procedures & RPC Functions
-- ==============================================================================

drop function if exists public.toggle_media_like(uuid);
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

drop function if exists public.toggle_media_save(uuid);
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

drop function if exists public.record_media_view(uuid, int, text);
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

drop function if exists public.search_media(text, text, text, int, int);
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

drop function if exists public.trending_media(text, int, int);
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

drop function if exists public.for_you_reels(int, int);
create or replace function public.for_you_reels(
  p_limit int default 15,
  p_offset int default 0
)
returns table (
  id uuid,
  author_id uuid,
  church_id uuid,
  category_id text,
  text_content text,
  media_url text,
  media_type text,
  media_duration_seconds integer,
  media_thumbnail_url text,
  sound_title text,
  view_count integer,
  like_count integer,
  comment_count integer,
  duration_seconds integer,
  visibility text,
  created_at timestamptz,
  is_following boolean
)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.church_id,
    p.category_id,
    p.text_content,
    p.media_url,
    p.media_type,
    p.media_duration_seconds,
    p.media_thumbnail_url,
    coalesce(p.sound_title, 'Original Sound') as sound_title,
    coalesce(p.view_count, 0) as view_count,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.comment_count, 0) as comment_count,
    coalesce(p.duration_seconds, p.media_duration_seconds, 0) as duration_seconds,
    p.visibility,
    p.created_at,
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followed_id = p.author_id
    ) as is_following
  from public.posts p
  where p.media_type = 'reel'
    and (
      p.visibility = 'public'
      or p.author_id = auth.uid()
      or (
        p.visibility = 'followers'
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followed_id = p.author_id
        )
      )
    )
  order by
    (
      (coalesce(p.like_count, 0) * 3.5) +
      (coalesce(p.comment_count, 0) * 4.0) +
      (coalesce(p.view_count, 0) * 0.4) +
      case when exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ) then 50.0 else 0.0 end
    ) / power(greatest(1.0, extract(epoch from (now() - p.created_at)) / 3600.0 + 2.0), 1.25) desc,
    p.created_at desc
  limit least(coalesce(p_limit, 15), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

drop function if exists public.following_reels(int, int);
create or replace function public.following_reels(
  p_limit int default 15,
  p_offset int default 0
)
returns table (
  id uuid,
  author_id uuid,
  church_id uuid,
  category_id text,
  text_content text,
  media_url text,
  media_type text,
  media_duration_seconds integer,
  media_thumbnail_url text,
  sound_title text,
  view_count integer,
  like_count integer,
  comment_count integer,
  duration_seconds integer,
  visibility text,
  created_at timestamptz,
  is_following boolean
)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    p.church_id,
    p.category_id,
    p.text_content,
    p.media_url,
    p.media_type,
    p.media_duration_seconds,
    p.media_thumbnail_url,
    coalesce(p.sound_title, 'Original Sound') as sound_title,
    coalesce(p.view_count, 0) as view_count,
    coalesce(p.like_count, 0) as like_count,
    coalesce(p.comment_count, 0) as comment_count,
    coalesce(p.duration_seconds, p.media_duration_seconds, 0) as duration_seconds,
    p.visibility,
    p.created_at,
    true as is_following
  from public.posts p
  where p.media_type = 'reel'
    and (
      p.author_id in (
        select followed_id from public.follows where follower_id = auth.uid()
      )
      or p.author_id = auth.uid()
    )
  order by p.created_at desc
  limit least(coalesce(p_limit, 15), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

drop function if exists public.record_reel_view(uuid);
create or replace function public.record_reel_view(p_reel_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count int;
begin
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_reel_id
  returning view_count into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;

drop function if exists public.toggle_reel_like(uuid);
create or replace function public.toggle_reel_like(p_reel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_liked boolean;
  v_like_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to like reels';
  end if;

  if exists (
    select 1 from public.reactions
    where target_id = p_reel_id::text and user_id = v_user_id and target_type = 'post'
  ) then
    delete from public.reactions
    where target_id = p_reel_id::text and user_id = v_user_id and target_type = 'post';

    update public.posts
    set like_count = greatest(0, coalesce(like_count, 0) - 1)
    where id = p_reel_id
    returning like_count into v_like_count;

    v_liked := false;
  else
    insert into public.reactions (target_id, target_type, user_id, emoji, created_at)
    values (p_reel_id::text, 'post', v_user_id, '❤️', now())
    on conflict do nothing;

    update public.posts
    set like_count = coalesce(like_count, 0) + 1
    where id = p_reel_id
    returning like_count into v_like_count;

    v_liked := true;
  end if;

  return jsonb_build_object(
    'reel_id', p_reel_id,
    'liked', v_liked,
    'like_count', coalesce(v_like_count, 0)
  );
end;
$$;

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

alter table public.media_series enable row level security;
alter table public.media_items enable row level security;
alter table public.media_engagement enable row level security;
alter table public.media_views enable row level security;
alter table public.watch_progress enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;

-- 3.1 media_series
drop policy if exists "Public can read series" on public.media_series;
create policy "Public can read series"
  on public.media_series for select
  using (true);

drop policy if exists "Owners and church leaders manage series" on public.media_series;
create policy "Owners and church leaders manage series"
  on public.media_series for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- 3.2 media_items
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

-- 3.3 media_engagement
drop policy if exists "Users read own engagement" on public.media_engagement;
create policy "Users read own engagement"
  on public.media_engagement for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage own engagement" on public.media_engagement;
create policy "Users manage own engagement"
  on public.media_engagement for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3.4 media_views
drop policy if exists "Insert media views" on public.media_views;
create policy "Insert media views"
  on public.media_views for insert
  with check (true);

drop policy if exists "Read own media views" on public.media_views;
create policy "Read own media views"
  on public.media_views for select
  using (auth.uid() = user_id or auth.uid() is null);

-- 3.5 watch_progress
drop policy if exists "User manages own watch progress" on public.watch_progress;
create policy "User manages own watch progress"
  on public.watch_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3.6 playlists & playlist_items
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

-- 3.7 Comments with Media support
drop policy if exists "Read comments for visible media" on public.comments;
create policy "Read comments for visible media"
  on public.comments for select
  using (
    post_id is not null
    or (
      media_id is not null
      and exists (
        select 1 from public.media_items m
        where m.id = comments.media_id
          and (m.status = 'published' or m.author_id = auth.uid())
      )
    )
  );

-- ==============================================================================
-- 4. Grants & Privileges
-- ==============================================================================

grant usage on schema public to anon, authenticated, service_role;
grant select on public.media_series, public.media_items, public.playlists, public.playlist_items to anon, authenticated;
grant insert, update, delete on public.media_series, public.media_items, public.media_engagement, public.watch_progress, public.playlists, public.playlist_items to authenticated;
grant insert, select on public.media_views to anon, authenticated;
grant execute on function public.toggle_media_like(uuid) to authenticated;
grant execute on function public.toggle_media_save(uuid) to authenticated;
grant execute on function public.record_media_view(uuid, int, text) to anon, authenticated;
grant execute on function public.search_media(text, text, text, int, int) to anon, authenticated;
grant execute on function public.trending_media(text, int, int) to anon, authenticated;
grant execute on function public.for_you_reels(int, int) to anon, authenticated;
grant execute on function public.following_reels(int, int) to authenticated;
grant execute on function public.record_reel_view(uuid) to anon, authenticated;
grant execute on function public.toggle_reel_like(uuid) to authenticated;

-- ==============================================================================
-- 5. Storage Buckets Setup (Safely wrapped)
-- ==============================================================================

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('media-library', 'media-library', true, 104857600, null),
    ('thumbnails', 'thumbnails', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  on conflict (id) do update set public = true;

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
    raise notice 'Storage configuration skipped: %', sqlerrm;
end $$;

-- ==============================================================================
-- 6. Seed Initial Catalog (Idempotent, strictly typed UUIDs & dynamic valid FKs)
-- ==============================================================================

do $$
declare
  v_author_id uuid;
  v_church_id uuid;
  v_category_id text;
  v_video_series_id uuid := 'a1000000-0000-0000-0000-000000000001';
  v_audio_series_id uuid := 'a2000000-0000-0000-0000-000000000002';
begin
  select id into v_author_id from public.profiles order by created_at asc limit 1;
  if v_author_id is null then
    select id into v_author_id from auth.users order by created_at asc limit 1;
  end if;

  select id into v_church_id from public.churches order by created_at asc limit 1;

  -- Dynamically query an existing valid category from public.categories
  select id into v_category_id from public.categories order by id asc limit 1;
  if v_category_id is null then
    -- In an empty categories table, insert prayer as fallback
    insert into public.categories (id, name) values ('prayer', 'Prayer Requests & Praise Reports')
    on conflict (id) do nothing;
    v_category_id := 'prayer';
  end if;

  -- If no profile exists yet, exit gracefully
  if v_author_id is null then
    raise notice 'No profile found yet. Skipping seed data until a user signs up.';
    return;
  end if;

  -- 6.1 Seed Series
  insert into public.media_series (id, owner_id, church_id, title, description, cover_url, kind, accent)
  values
    (
      v_video_series_id,
      v_author_id,
      v_church_id,
      'Walking in Supernatural Faith',
      'A transformative 6-part video sermon series unlocking victory, resilience, and spiritual depth in modern East Africa.',
      'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
      'video',
      '#06b6d4'
    ),
    (
      v_audio_series_id,
      v_author_id,
      v_church_id,
      'Morning Manna: Daily Devotional Audio',
      'Short 15-minute Scripture expositions and guided prayer sessions to anchor your day in the presence of God.',
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
      'audio',
      '#8b5cf6'
    )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description;

  -- 6.2 Seed Video Items
  insert into public.media_items (
    id, kind, author_id, church_id, series_id, episode_no, title, description,
    media_url, thumb_url, duration_seconds, category, tags, visibility, status,
    accent, view_count, like_count, save_count, published_at
  )
  values
    (
      'b1000000-0000-0000-0000-000000000001',
      'video',
      v_author_id,
      v_church_id,
      v_video_series_id,
      1,
      'The Unshakeable Covenant: Walking by Faith',
      'Part 1: Exploring Abrahamic faith and how God honors persistent trust in the face of impossible circumstances.',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
      2895,
      'Theology',
      array['faith', 'covenant', 'abraham', 'nairobi'],
      'public',
      'published',
      '#06b6d4',
      1420,
      184,
      52,
      now() - interval '2 days'
    ),
    (
      'b1000000-0000-0000-0000-000000000002',
      'video',
      v_author_id,
      v_church_id,
      v_video_series_id,
      2,
      'Overcoming the Giants: David in the Valley',
      'Part 2: Practical spiritual weapons for facing anxiety, job loss, and sudden crises with holy courage.',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800&auto=format&fit=crop&q=80',
      2410,
      'Sermon',
      array['david', 'courage', 'victory', 'overcoming'],
      'public',
      'published',
      '#10b981',
      980,
      142,
      38,
      now() - interval '4 days'
    ),
    (
      'b1000000-0000-0000-0000-000000000003',
      'video',
      v_author_id,
      v_church_id,
      null,
      null,
      'Night of Miracles & Worship Live',
      'Full worship service recorded live at Nairobi Worship Center featuring spontaneous praises and intercessory prayer.',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
      3780,
      'Worship',
      array['worship', 'live', 'praise', 'miracles'],
      'public',
      'published',
      '#ec4899',
      3240,
      412,
      129,
      now() - interval '6 days'
    ),
    (
      'b1000000-0000-0000-0000-000000000004',
      'video',
      v_author_id,
      v_church_id,
      null,
      null,
      'Youth Alive Conference: Purity in Babylon',
      'A frank and empowering session for college students and young professionals on standing firm in culture.',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=800&auto=format&fit=crop&q=80',
      2150,
      'Youth',
      array['youth', 'holiness', 'campus', 'kenya'],
      'public',
      'published',
      '#f59e0b',
      1890,
      270,
      64,
      now() - interval '8 days'
    )
  on conflict (id) do update set
    title = excluded.title,
    view_count = excluded.view_count;

  -- 6.3 Seed Initial Reels into posts (using dynamic v_category_id so FK never fails)
  insert into public.posts (
    id, author_id, church_id, category_id, text_content,
    media_url, media_type, sound_title, view_count, like_count, comment_count, duration_seconds,
    visibility, created_at
  )
  values
    (
      'd1000000-0000-0000-0000-000000000001',
      v_author_id,
      v_church_id,
      v_category_id,
      'Never cease praying! When the enemy whispers you are defeated, declare: "No weapon formed against me shall prosper!" 🔥🙌 #PrayerWarrior #Faith',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'reel',
      'Grace & Power · Pastor David Mwangi',
      840,
      124,
      18,
      48,
      'public',
      now() - interval '2 hours'
    ),
    (
      'd1000000-0000-0000-0000-000000000002',
      v_author_id,
      v_church_id,
      v_category_id,
      'Live acoustic praise from morning fellowship: "You are the God who does wonders!" Drop an Amen if your soul is blessed today. 🎶🙏 #Praise #Worship',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'reel',
      'Morning Acoustic Praise · Sister Mary Grace',
      1280,
      210,
      34,
      58,
      'public',
      now() - interval '6 hours'
    ),
    (
      'd1000000-0000-0000-0000-000000000003',
      v_author_id,
      v_church_id,
      v_category_id,
      'Healed of chronic pain after 3 years! Testifying that Jesus Christ is the same yesterday, today and forever. 🌟✨ #Testimony #Miracle',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      'reel',
      'Original Testimony Sound · Shammah Youth',
      940,
      178,
      22,
      42,
      'public',
      now() - interval '18 hours'
    )
  on conflict (id) do update set
    text_content = excluded.text_content,
    view_count = excluded.view_count;

end $$;

notify pgrst, 'reload schema';
