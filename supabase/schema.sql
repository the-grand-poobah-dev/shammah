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
  inbox_permission         text not null default 'everyone',
  is_locked                boolean not null default false,
  created_at               timestamptz not null default now(),
  constraint profiles_about_len check (about is null or char_length(about) <= 250),
  constraint profiles_inbox_permission_check check (inbox_permission in ('everyone', 'followers_church', 'no_one'))
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
  is_pinned               boolean not null default false,
  pinned_at               timestamptz,
  visibility              text not null default 'public',
  created_at              timestamptz not null default now(),
  constraint posts_visibility_check
    check (visibility in ('public','followers','church','private')),
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
-- 9. Reposts
-- ---------------------------------------------------------------
create table if not exists post_reposts (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  quote_text text,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_reposts_post_idx on post_reposts (post_id);
create index if not exists post_reposts_user_idx on post_reposts (user_id);
create index if not exists post_reposts_created_idx on post_reposts (created_at desc);

-- ---------------------------------------------------------------
-- 10. Polls
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
-- 13. Direct Messages
-- ---------------------------------------------------------------
create table if not exists direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  text_content text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  constraint direct_messages_distinct_users check (sender_id <> recipient_id),
  constraint direct_messages_text_not_empty check (char_length(btrim(text_content)) > 0)
);

create index if not exists direct_messages_conversation_idx
  on direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at asc);
create index if not exists direct_messages_sender_created_idx
  on direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_recipient_created_idx
  on direct_messages (recipient_id, created_at desc);
create index if not exists direct_messages_unread_idx
  on direct_messages (recipient_id, read_at) where read_at is null;

-- ---------------------------------------------------------------
-- 14. Follows
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

-- ---------------------------------------------------------------
-- 15. Blocks
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

-- ---------------------------------------------------------------
-- 16. Helpful RPCs (used by the app)
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

create or replace function public.repost_counts(p_post_ids uuid[])
returns table (post_id uuid, count bigint)
language sql stable as $$
  select post_id, count(*)::bigint
  from post_reposts
  where post_id = any(p_post_ids)
  group by post_id
$$;

create or replace function public.get_user_conversations(p_user_id uuid)
returns table (
  conversation_id text,
  participant_id uuid,
  participant_name text,
  participant_avatar text,
  participant_badge text,
  participant_verified boolean,
  participant_role text,
  participant_inbox_permission text,
  last_message text,
  last_message_time timestamptz,
  unread_count bigint
)
language sql stable as $$
  with user_msgs as (
    select
      m.id,
      m.sender_id,
      m.recipient_id,
      case when m.sender_id = p_user_id then m.recipient_id else m.sender_id end as other_user_id,
      m.text_content,
      m.created_at,
      m.read_at
    from direct_messages m
    where m.sender_id = p_user_id or m.recipient_id = p_user_id
  ),
  ranked_msgs as (
    select
      other_user_id,
      text_content,
      created_at,
      row_number() over (partition by other_user_id order by created_at desc) as rn
    from user_msgs
  ),
  unreads as (
    select
      sender_id as other_user_id,
      count(*)::bigint as cnt
    from direct_messages
    where recipient_id = p_user_id and read_at is null
    group by sender_id
  )
  select
    'conv-' || rm.other_user_id::text as conversation_id,
    rm.other_user_id as participant_id,
    coalesce(p.display_name, 'Fellowship Member') as participant_name,
    p.avatar_url as participant_avatar,
    p.badge as participant_badge,
    p.badge_verified as participant_verified,
    p.role as participant_role,
    coalesce(p.inbox_permission, 'everyone') as participant_inbox_permission,
    rm.text_content as last_message,
    rm.created_at as last_message_time,
    coalesce(u.cnt, 0)::bigint as unread_count
  from ranked_msgs rm
  join profiles p on p.id = rm.other_user_id
  left join unreads u on u.other_user_id = rm.other_user_id
  where rm.rn = 1
  order by rm.created_at desc;
$$;

create or replace function public.total_unread_messages_count(p_user_id uuid)
returns bigint
language sql stable as $$
  select coalesce(count(*)::bigint, 0)
  from direct_messages
  where recipient_id = p_user_id and read_at is null;
$$;

-- ---------------------------------------------------------------
-- 15. Storage buckets (profile, church, poll, post)
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
--   010_pinned_posts.sql
--   011_reposts_and_visibility.sql
--   012_direct_messages.sql
--   013_follows_blocks_and_profile_privacy.sql
-- Keep using those migrations for live projects.
-- ============================================================
