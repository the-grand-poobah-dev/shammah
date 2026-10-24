-- ============================================================
-- Shammah migration 008: post media (Storage) + RSS autofill
-- Run in Supabase Dashboard → SQL Editor → New query.
-- Safe to re-run (idempotent). Does not delete or break existing data.
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Extra columns on posts for richer media + RSS source tracking
-- ---------------------------------------------------------------
alter table posts
  add column if not exists source text not null default 'user',
  add column if not exists external_guid text,
  add column if not exists media_duration_seconds integer,
  add column if not exists media_thumbnail_url text;

-- Constrain source values
alter table posts drop constraint if exists posts_source_check;
alter table posts add constraint posts_source_check
  check (source in ('user', 'rss', 'import'));

-- Constrain media_type (keeps the original simple values + a couple of friendly aliases)
alter table posts drop constraint if exists posts_media_type_check;
alter table posts add constraint posts_media_type_check
  check (
    media_type is null
    or media_type in ('image', 'video', 'audio', 'reel', 'podcast')
  );

-- De-dupe RSS items (same external_guid only once)
create unique index if not exists posts_external_guid_uidx
  on posts (external_guid)
  where external_guid is not null;

-- Helpful indexes for the feed
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_source_created_idx on posts (source, created_at desc);

-- ---------------------------------------------------------------
-- 2. Storage bucket for post media (images, videos, audio)
--    Files live under:  <user-id>/<timestamp>-filename
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  104857600,  -- 100 MB (videos). Lower later if you want stricter limits.
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'
  ]
)
on conflict (id) do update
  set public = true,
      file_size_limit = 104857600,
      allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'
      ];

-- RLS on storage.objects for the new bucket
drop policy if exists "post-media read"   on storage.objects;
drop policy if exists "post-media insert" on storage.objects;
drop policy if exists "post-media update" on storage.objects;
drop policy if exists "post-media delete" on storage.objects;

create policy "post-media read"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "post-media insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-media update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post-media delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------
-- 3. RSS feeds table (URL + optional keywords → auto posts)
-- ---------------------------------------------------------------
create table if not exists rss_feeds (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid references churches(id) on delete cascade,  -- null = platform-wide
  title           text not null,
  feed_url        text not null,
  keywords        text[],                                          -- e.g. {'prayer','youth'}
  category_id     text references categories(id) default 'resources',
  last_fetched_at timestamptz,
  last_item_guid  text,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists rss_feeds_active_idx on rss_feeds (is_active) where is_active = true;

alter table rss_feeds enable row level security;

grant select, insert, update, delete on public.rss_feeds to authenticated;

drop policy if exists "rss feeds readable" on rss_feeds;
create policy "rss feeds readable"
  on rss_feeds for select
  using (auth.role() = 'authenticated');

drop policy if exists "rss feeds writable by admin or owner" on rss_feeds;
create policy "rss feeds writable by admin or owner"
  on rss_feeds for all
  using (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'platform_admin'
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'platform_admin'
    )
  );

-- ---------------------------------------------------------------
-- 4. Tell PostgREST to reload the schema cache
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';

-- ============================================================
-- HOW TO ADD A FEED (Table Editor or SQL):
--
-- insert into rss_feeds (title, feed_url, keywords, category_id, created_by)
-- values (
--   'Example Christian Podcast',
--   'https://example.com/feed.xml',
--   array['sermon','faith'],
--   'podcasts',
--   'YOUR-USER-UUID'
-- );
-- ============================================================
