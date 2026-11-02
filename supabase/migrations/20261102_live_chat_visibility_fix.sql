begin;

-- Enforce the same visibility rules for direct Supabase chat inserts as the app API.
drop policy if exists live_chat_insert_eligible on public.live_chat_messages;

create policy live_chat_insert_eligible on public.live_chat_messages
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.live_streams s
    where s.id = live_chat_messages.stream_id
      and s.status = 'live'
      and (
        s.host_id = (select auth.uid())
        or s.visibility = 'public'
        or (
          s.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = (select auth.uid())
              and f.followed_id = s.host_id
          )
        )
        or (
          s.visibility = 'church'
          and s.church_id is not null
          and exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.church_id = s.church_id
          )
        )
      )
  )
  and not exists (
    select 1 from public.live_bans b
    where b.stream_id = live_chat_messages.stream_id
      and b.user_id = (select auth.uid())
  )
);

-- Soft-deleted chat must not remain readable through direct table queries.
drop policy if exists live_chat_read_visible on public.live_chat_messages;
create policy live_chat_read_visible on public.live_chat_messages
for select to authenticated
using (
  not live_chat_messages.is_deleted
  and exists (
    select 1 from public.live_streams s
    where s.id = live_chat_messages.stream_id
      and (
        s.visibility = 'public'
        or s.host_id = (select auth.uid())
        or (
          s.visibility = 'followers'
          and exists (
            select 1 from public.follows f
            where f.follower_id = (select auth.uid())
              and f.followed_id = s.host_id
          )
        )
        or (
          s.visibility = 'church'
          and s.church_id is not null
          and exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.church_id = s.church_id
          )
        )
      )
  )
  and not exists (
    select 1 from public.live_bans b
    where b.stream_id = live_chat_messages.stream_id
      and b.user_id = (select auth.uid())
  )
);

-- Clients must not forge timestamps or moderation flags to bypass rate limits
-- or make their own messages appear pinned/deleted.
create or replace function public.guard_live_chat_insert()
returns trigger
language plpgsql
set search_path = public
as $guard_live_chat$
begin
  new.created_at := now();
  new.is_pinned := false;
  new.is_deleted := false;
  return new;
end;
$guard_live_chat$;

drop trigger if exists live_chat_insert_guard_trigger on public.live_chat_messages;
create trigger live_chat_insert_guard_trigger
before insert on public.live_chat_messages
for each row execute function public.guard_live_chat_insert();

commit;
