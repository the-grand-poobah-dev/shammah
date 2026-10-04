-- ============================================================
-- Shammah migration 012: Direct Messages & Inbox Privacy
-- Replaces mock direct messages simulation with real Supabase table, RLS & Realtime
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Inbox Permission on Profiles
-- ---------------------------------------------------------------
alter table profiles
  add column if not exists inbox_permission text not null default 'everyone';

alter table profiles drop constraint if exists profiles_inbox_permission_check;
alter table profiles add constraint profiles_inbox_permission_check
  check (inbox_permission in ('everyone', 'followers_church', 'no_one'));

create index if not exists profiles_inbox_permission_idx on profiles (inbox_permission);

-- ---------------------------------------------------------------
-- 2. Direct Messages Table
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

-- Index for fetching conversation between two users ordered chronologically
create index if not exists direct_messages_conversation_idx
  on direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at asc);

-- Index for user inbox listings and unread counts
create index if not exists direct_messages_sender_created_idx
  on direct_messages (sender_id, created_at desc);

create index if not exists direct_messages_recipient_created_idx
  on direct_messages (recipient_id, created_at desc);

create index if not exists direct_messages_unread_idx
  on direct_messages (recipient_id, read_at) where read_at is null;

-- ---------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------
alter table direct_messages enable row level security;
grant select, insert, update on public.direct_messages to authenticated;

-- SELECT: A user may select only messages where they are sender or recipient
drop policy if exists "users can read their own direct messages" on direct_messages;
create policy "users can read their own direct messages" on direct_messages
  for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- INSERT:
-- 1. Sender must be the authenticated user (sender_id = auth.uid())
-- 2. Recipient inbox_permission must not be 'no_one'
-- Note on 'followers_church': follow relationships are handled in a separate prompt;
-- until real follow verification is active, 'followers_church' falls back to open access ('everyone')
-- rather than silently mis-enforcing it.
drop policy if exists "users can send direct messages" on direct_messages;
create policy "users can send direct messages" on direct_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from profiles p
      where p.id = recipient_id
        and coalesce(p.inbox_permission, 'everyone') <> 'no_one'
    )
  );

-- UPDATE: A user may update (mark read) only messages where they are the recipient
drop policy if exists "recipients can mark messages as read" on direct_messages;
create policy "recipients can mark messages as read" on direct_messages
  for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- ---------------------------------------------------------------
-- 4. Supabase Realtime
-- ---------------------------------------------------------------
alter table direct_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;
end $$;

-- ---------------------------------------------------------------
-- 5. Helper RPC Functions
-- ---------------------------------------------------------------
-- Returns a list of conversations for a user with participant profiles and latest messages
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
language sql stable security definer as $$
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
grant execute on function public.get_user_conversations(uuid) to authenticated;

-- Returns total unread direct messages count for badge
create or replace function public.total_unread_messages_count(p_user_id uuid)
returns bigint
language sql stable security definer as $$
  select coalesce(count(*)::bigint, 0)
  from direct_messages
  where recipient_id = p_user_id and read_at is null;
$$;
grant execute on function public.total_unread_messages_count(uuid) to authenticated;

notify pgrst, 'reload schema';
