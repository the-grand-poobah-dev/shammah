-- Tighten media comment access to match the visibility of its parent media item.
-- Required as a follow-up because the initial comments policy only checked published status.
-- Safe to re-run; this migration does not modify comment rows.

drop policy if exists "Read comments for published media" on public.media_comments;
create policy "Read comments for published media"
  on public.media_comments for select
  to anon, authenticated
  using (
    (
      exists (
        select 1
        from public.media_items m
        where m.id = media_comments.item_id
          and m.status = 'published'
          and (
            m.visibility = 'public'
            or m.author_id = (select auth.uid())
            or (
              m.visibility = 'followers'
              and (select auth.uid()) is not null
              and public.is_following_user((select auth.uid()), m.author_id)
            )
            or (
              m.visibility = 'church'
              and (select auth.uid()) is not null
              and m.church_id is not null
              and public.is_active_church_member((select auth.uid()), m.church_id)
            )
            or exists (
              select 1
              from public.profiles p
              where p.id = (select auth.uid())
                and (
                  p.role = any (array['platform_admin'::text, 'church_admin'::text])
                  or p.badge = any (array['lead_pastor'::text, 'admin'::text, 'moderator'::text])
                )
            )
          )
      )
    )
    or user_id = (select auth.uid())
  );

drop policy if exists "Signed-in users add own media comments" on public.media_comments;
create policy "Signed-in users add own media comments"
  on public.media_comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.media_items m
      where m.id = media_comments.item_id
        and m.status = 'published'
        and (
          m.visibility = 'public'
          or m.author_id = (select auth.uid())
          or (
            m.visibility = 'followers'
            and (select auth.uid()) is not null
            and public.is_following_user((select auth.uid()), m.author_id)
          )
          or (
            m.visibility = 'church'
            and (select auth.uid()) is not null
            and m.church_id is not null
            and public.is_active_church_member((select auth.uid()), m.church_id)
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and (
                p.role = any (array['platform_admin'::text, 'church_admin'::text])
                or p.badge = any (array['lead_pastor'::text, 'admin'::text, 'moderator'::text])
              )
          )
        )
    )
  );

-- Verification:
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'media_comments'
-- order by policyname;
