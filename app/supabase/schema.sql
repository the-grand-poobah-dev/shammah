-- ============================================================
-- Shammah — Full reference schema (as of Step 3)
-- ============================================================
-- This file is DOCUMENTATION + a bootstrap for a brand-new project.
-- Do NOT paste and run this on an existing Supabase project that
-- already has data — use the numbered migrations instead.
--
-- Live tables you listed:
--   badge_requests, badges, categories, churches, comments,
--   poll_options, poll_votes, posts, profile_private, profiles,
--   reactions, subscriptions
--
-- Plus (Step 3): rss_feeds
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Categories (seed data included)
-- ---------------------------------------------------------------
create table if not exists categories (
  id   text primary key,
  name text not null
);

insert into categories (id, name) values
  ('lessons',  'Lessons & Icebreakers'),
  ('stories',  'Stories & Experiences'),
  ('podcasts', 'Podcasts & Videos'),
  ('events',   'Events'),
  ('involved', 'Get Involved'),
  ('resources','Resources'),
  ('parent',   'Parent Corner'),
  ('worship',  'Worship & Creative Arts'),
  ('teen',     'Teen Talks'),
  ('kids',     'Kids'' Corner'),
  ('volunteer','Volunteer Spotlight'),
  ('hacks',    'Ministry Hacks'),
  ('prayer',   'Prayer Requests & Praise Reports'),
  ('seasonal', 'Seasonal Specials'),
  ('faq',      'FAQ for Parents/Volunteers'),
  ('field',    'From the Mission Field')
on conflict (id) do update set name = excluded.name;

-- ---------------------------------------------------------------
-- 2. Badges lookup
-- ---------------------------------------------------------------
create table if not exists badges (
  id         text primary key,
  label      text not null,
  sort_order integer not null default 0
);

insert into badges (id, label, sort_order) values
  ('believer',    'Believer',          10),
  ('seeker',      'Seeker',            20),
  ('student',     'Student',           30),
  ('intercessor', 'Intercessor',       40),
  ('teacher',     'Teacher',           50),
  ('worship',     'Worship Leader',    60),
  ('youth',       'Youth Leader',      70),
  ('deacon',      'Deacon / Deaconess',80),
  ('elder',       'Elder',             90),
  ('evangelist',  'Evangelist',       100),
  ('missionary',  'Missionary',       110),
  ('chaplain',    'Chaplain',         120),
  ('pastor',      'Pastor',           130),
  ('reverend',    'Reverend',         140),
  ('priest',      'Priest',           150),
  ('bishop',      'Bishop',           160),
  ('apostle',     'Apostle',          170),
  ('prophet',     'Prophet',          180)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------
-- 3. Churches
-- ---------------------------------------------------------------
create table if not exists churches (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  denomination        text,
  logo_url            text,
  cover_url           text,
  location_label      text,
  location_place_id   text,
  location_lat        double precision,
  location_lng        double precision,
  website             text,
  created_by          uuid,  -- references profiles(id) after profiles exists
  subscription_status text not null default 'unpaid',  -- unpaid | trial | active
  onboarded_at        timestamptz,
  created_at          timestamptz not null default now(),
  constraint churches_description_len check (description is null or char_length(description) <= 500)
);

-- ---------------------------------------------------------------
-- 4. Profiles (extends auth.users)
-- ---------------------------------------------------------------
create table if not exists profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  display_name             text,
  role                     text not null default 'member',  -- member | church_admin | platform_admin
  church_id                uuid references churches(id) on delete set null,
  badge                    text references badges(id),
  badge_verified           boolean not null default false,
  avatar_url               text,
  cover_url                text,
  about                    text,
  location_label           text,
  location_place_id        text,
  location_lat             double precision,
  location_lng             double precision,
  display_name_changed_at  timestamptz,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  constraint profiles_about_len check (about is null or char_length(about) <= 250)
);

-- Now that profiles exists, wire the churches FK
alter table churches
  drop constraint if exists churches_created_by_fkey;
alter table churches
  add constraint churches_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- ---------------------------------------------------------------
-- 5. Private profile data (DOB etc. — only the owner can read)
-- ---------------------------------------------------------------
create table if not exists profile_private (
  id            uuid primary key references profiles(id) on delete cascade,
  date_of_birth date,
  updated_at    timestamptz default now()
);

-- ---------------------------------------------------------------
-- 6. Posts
-- ---------------------------------------------------------------
create table if not exists posts (
  id                      uuid primary key default gen_random_uuid(),
  author_id               uuid references profiles(id) on delete cascade,
  church_id               uuid references churches(id) on delete set null,
  category_id             text not null references categories(id),
  text_content            text,
  media_url               text,
  media_type              text,   -- image | video | audio | reel | podcast
  media_duration_seconds  integer,
  media_thumbnail_url     text,
  source                  text not null default 'user',  -- user | rss | import
  external_guid           text,
  created_at              timestamptz not null default now(),
  constraint posts_media_type_check
    check (media_type is null or media_type in ('image','video','audio','reel','podcast')),
  constraint posts_source_check
    check (source in ('user','rss','import'))
);

create unique index if not exists posts_external_guid_uidx
  on posts (external_guid) where external_guid is not null;
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_church_created_idx on posts (church_id, created_at desc);

-- ---------------------------------------------------------------
-- 7. Comments (threaded, with @mentions)
-- ---------------------------------------------------------------
create table if not exists comments (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references posts(id) on delete cascade,
  author_id          uuid not null references profiles(id) on delete cascade,
  parent_id          uuid references comments(id) on delete cascade,
  text_content       text not null,
  mentioned_user_ids uuid[] default '{}',
  created_at         timestamptz not null default now()
);

create index if not exists comments_post_created_idx on comments (post_id, created_at);

-- ---------------------------------------------------------------
-- 8. Reactions (emoji on posts or comments)
-- ---------------------------------------------------------------
create table if not exists reactions (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null,          -- 'post' | 'comment'
  target_id   uuid not null,
  user_id     uuid not null references profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

create index if not exists reactions_target_idx on reactions (target_type, target_id);

-- ---------------------------------------------------------------
-- 9. Polls
-- ---------------------------------------------------------------
create table if not exists poll_options (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references posts(id) on delete cascade,
  label     text not null default '',
  image_url text,
  position  integer not null default 0
);

create table if not exists poll_votes (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references posts(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  voter_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, voter_id)
);

-- ---------------------------------------------------------------
-- 10. Badge change requests
-- ---------------------------------------------------------------
create table if not exists badge_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  current_badge   text references badges(id),
  requested_badge text not null references badges(id),
  reason          text not null check (char_length(reason) between 10 and 500),
  status          text not null default 'pending'
                    check (status in ('pending','approved','declined')),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);

create unique index if not exists one_pending_badge_request
  on badge_requests (user_id) where status = 'pending';

-- ---------------------------------------------------------------
-- 11. Subscriptions (M-Pesa)
-- ---------------------------------------------------------------
create table if not exists subscriptions (
  id            uuid primary key default gen_random_uuid(),
  church_id     uuid not null references churches(id) on delete cascade,
  amount_kes    integer not null,
  mpesa_receipt text,
  phone         text,
  status        text not null default 'pending',  -- pending | confirmed | failed
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 12. RSS feeds (Step 3)
-- ---------------------------------------------------------------
create table if not exists rss_feeds (
  id              uuid primary key default gen_random_uuid(),
  church_id       uuid references churches(id) on delete cascade,
  title           text not null,
  feed_url        text not null,
  keywords        text[],
  category_id     text references categories(id) default 'resources',
  last_fetched_at timestamptz,
  last_item_guid  text,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 13. Helpful RPCs (used by the app)
-- ---------------------------------------------------------------
create or replace function public.category_counts()
returns table (category_id text, total bigint)
language sql stable as $$
  select category_id, count(*)::bigint as total from posts group by category_id
$$;

create or replace function public.church_member_counts()
returns table (church_id uuid, total bigint)
language sql stable as $$
  select church_id, count(*)::bigint as total
  from profiles
  where church_id is not null
  group by church_id
$$;

create or replace function public.comment_counts(p_post_ids uuid[])
returns table (post_id uuid, count bigint)
language sql stable as $$
  select post_id, count(*)::bigint
  from comments
  where post_id = any(p_post_ids)
  group by post_id
$$;

create or replace function public.reaction_counts(p_target_type text, p_target_ids uuid[])
returns table (target_id uuid, emoji text, count bigint)
language sql stable as $$
  select target_id, emoji, count(*)::bigint
  from reactions
  where target_type = p_target_type
    and target_id = any(p_target_ids)
  group by target_id, emoji
$$;

create or replace function public.poll_results(p_post_ids uuid[])
returns table (post_id uuid, option_id uuid, votes bigint)
language sql stable as $$
  select v.post_id, v.option_id, count(*)::bigint as votes
  from poll_votes v
  where v.post_id = any(p_post_ids)
  group by v.post_id, v.option_id
$$;

-- ---------------------------------------------------------------
-- 14. Storage buckets (profile, church, poll, post)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-media', 'profile-media', true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('church-media',  'church-media',  true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('poll-images',   'poll-images',   true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('post-media',    'post-media',    true, 104857600,
    array[
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/webm','video/quicktime',
      'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm'
    ])
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- NOTE: Row Level Security policies, triggers (badge lock,
-- name-change cooldown, church guards, DOB check) and GRANTs
-- live in the numbered migration files:
--   001_onboarding.sql
--   002_fix_posts_policy.sql
--   005_badge_requests.sql
--   006_profile_private_grants.sql
--   007_churches_and_categories.sql
--   008_post_media_and_rss.sql
-- Keep using those migrations for live projects.
-- ============================================================
