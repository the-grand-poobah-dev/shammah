-- Shammah LiveKit broadcast foundation. Run manually in Supabase SQL Editor.
-- Idempotent; keep RLS enabled and do not use client-side service credentials.

create extension if not exists pgcrypto;

create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  church_id uuid null references public.churches(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 140),
  description text null check (description is null or char_length(description) <= 3000),
  thumb_url text null,
  status text not null default 'live' check (status in ('scheduled','live','ended')),
  room_name text not null unique,
  visibility text not null default 'public' check (visibility in ('public','followers','church','private')),
  started_at timestamptz null,
  ended_at timestamptz null,
  scheduled_for timestamptz null,
  viewer_count integer not null default 0 check (viewer_count >= 0),
  peak_viewers integer not null default 0 check (peak_viewers >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  replay_media_id uuid null references public.media_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_streams_status_started_idx
  on public.live_streams (status, started_at desc);
create index if not exists live_streams_host_created_idx
  on public.live_streams (host_id, created_at desc);
create index if not exists live_streams_church_status_idx
  on public.live_streams (church_id, status) where church_id is not null;

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  is_pinned boolean not null default false,
  is_deleted boolean not null default false
);
create index if not exists live_chat_stream_created_idx
  on public.live_chat_messages (stream_id, created_at);
create index if not exists live_chat_user_created_idx
  on public.live_chat_messages (user_id, created_at desc);

create table if not exists public.live_moderators (
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);

create table if not exists public.live_bans (
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);

create table if not exists public.live_viewers (
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);
create index if not exists live_viewers_last_seen_idx on public.live_viewers (stream_id, last_seen_at desc);
alter table public.live_viewers enable row level security;

alter table public.live_streams enable row level security;
alter table public.live_chat_messages enable row level security;
alter table public.live_moderators enable row level security;
alter table public.live_bans enable row level security;

drop policy if exists live_streams_read_visible on public.live_streams;
create policy live_streams_read_visible on public.live_streams
for select to authenticated
using (
  visibility = 'public'
  or host_id = auth.uid()
  or (visibility = 'followers' and exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid() and f.followed_id = host_id
  ))
  or (visibility = 'church' and church_id is not null and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.church_id = live_streams.church_id
  ))
);

drop policy if exists live_streams_host_insert on public.live_streams;
create policy live_streams_host_insert on public.live_streams
for insert to authenticated
with check (host_id = auth.uid());

drop policy if exists live_streams_host_update on public.live_streams;
create policy live_streams_host_update on public.live_streams
for update to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

drop policy if exists live_streams_host_delete on public.live_streams;
create policy live_streams_host_delete on public.live_streams
for delete to authenticated
using (host_id = auth.uid());

drop policy if exists live_chat_read_visible on public.live_chat_messages;
-- Remove legacy permissive chat policies before installing the scoped policies below.
drop policy if exists "Stream viewers can read chat messages" on public.live_chat_messages;
drop policy if exists "Non-banned authenticated users can insert chat messages" on public.live_chat_messages;
drop policy if exists "Hosts and moderators can update chat messages" on public.live_chat_messages;
drop policy if exists "Hosts and moderators can delete chat messages" on public.live_chat_messages;
revoke select, insert, update, delete, truncate, references, trigger
  on table public.live_chat_messages from public, anon, authenticated;
grant select, insert on table public.live_chat_messages to authenticated;

create policy live_chat_read_visible on public.live_chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.live_streams s
    where s.id = live_chat_messages.stream_id
      and (s.visibility = 'public' or s.host_id = auth.uid()
        or (s.visibility = 'followers' and exists (
          select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = s.host_id
        ))
        or (s.visibility = 'church' and s.church_id is not null and exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.church_id = s.church_id
        )))
  )
  and not exists (
    select 1 from public.live_bans b
    where b.stream_id = live_chat_messages.stream_id and b.user_id = auth.uid()
  )
);

drop policy if exists live_chat_insert_eligible on public.live_chat_messages;
create policy live_chat_insert_eligible on public.live_chat_messages
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.live_streams s where s.id = stream_id and s.status = 'live')
  and not exists (select 1 from public.live_bans b where b.stream_id = live_chat_messages.stream_id and b.user_id = auth.uid())
);

drop policy if exists live_chat_moderate_host on public.live_chat_messages;
create policy live_chat_moderate_host on public.live_chat_messages
for update to authenticated
using (
  exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
  or exists (select 1 from public.live_moderators m where m.stream_id = live_chat_messages.stream_id and m.user_id = auth.uid())
)
with check (
  exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
  or exists (select 1 from public.live_moderators m where m.stream_id = live_chat_messages.stream_id and m.user_id = auth.uid())
);

drop policy if exists live_moderators_read_own_or_host on public.live_moderators;
create policy live_moderators_read_own_or_host on public.live_moderators
for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
);

drop policy if exists live_moderators_manage_host on public.live_moderators;
create policy live_moderators_manage_host on public.live_moderators
for all to authenticated
using (exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid()))
with check (exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid()));

drop policy if exists live_bans_read_host_or_self on public.live_bans;
create policy live_bans_read_host_or_self on public.live_bans
for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
  or exists (select 1 from public.live_moderators m where m.stream_id = live_bans.stream_id and m.user_id = auth.uid())
);

drop policy if exists live_bans_manage_host_or_mod on public.live_bans;
create policy live_bans_manage_host_or_mod on public.live_bans
for all to authenticated
using (
  exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
  or exists (select 1 from public.live_moderators m where m.stream_id = live_bans.stream_id and m.user_id = auth.uid())
)
with check (
  exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
  or exists (select 1 from public.live_moderators m where m.stream_id = live_bans.stream_id and m.user_id = auth.uid())
);

-- Stream creation and lifecycle changes are server-only so /api/live/start
-- can enforce trust, account-age and rate limits before creating a room.
revoke insert, update, delete, truncate, references, trigger
  on table public.live_streams from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.live_viewers from anon, authenticated;
grant all privileges on table public.live_viewers to service_role;

-- Enforce chat rate limits even if a client attempts direct Supabase inserts.
create or replace function public.enforce_live_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.stream_id::text || ':' || new.user_id::text, 0));
  select count(*) into recent_count
  from public.live_chat_messages
  where stream_id = new.stream_id
    and user_id = new.user_id
    and created_at > now() - interval '60 seconds';

  if recent_count >= 8 then
    raise exception 'Chat rate limit reached. Please wait before sending another message.';
  end if;

  return new;
end;
$$;

drop trigger if exists live_chat_rate_limit_trigger on public.live_chat_messages;
create trigger live_chat_rate_limit_trigger
before insert on public.live_chat_messages
for each row execute function public.enforce_live_chat_rate_limit();

-- Extend the unified report flow for live broadcasts while preserving
-- any application-specific target types already present in the table.
do $$
declare
  constraint_row record;
  existing_types text[];
  legacy_type text;
  allowed_types text := '''post'',''status'',''live_stream'',''reel'',''video'',''comment'',''poll'',''course'',''fundraiser'',''challenge''';
begin
  if to_regclass('public.content_reports') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'content_reports' and column_name = 'target_type'
     ) then
    for constraint_row in
      select conname from pg_constraint
      where conrelid = 'public.content_reports'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%target_type%'
    loop
      execute format('alter table public.content_reports drop constraint %I', constraint_row.conname);
    end loop;

    execute 'select coalesce(array_agg(distinct target_type), ARRAY[]::text[]) from public.content_reports'
      into existing_types;
    foreach legacy_type in array existing_types loop
      if legacy_type <> all(array['post','status','live_stream','reel','video','comment','poll','course','fundraiser','challenge']) then
        allowed_types := allowed_types || ',' || quote_literal(legacy_type);
      end if;
    end loop;

    execute format(
      'alter table public.content_reports add constraint content_reports_target_type_check check (target_type in (%s))',
      allowed_types
    );
  end if;
end $$;
