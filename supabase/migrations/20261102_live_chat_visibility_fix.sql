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
