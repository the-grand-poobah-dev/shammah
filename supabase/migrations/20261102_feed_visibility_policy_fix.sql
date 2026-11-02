-- Remove legacy permissive SELECT policies that bypass private/follower/church visibility.
begin;

drop policy if exists "posts are publicly readable" on public.posts;

drop policy if exists "comments are publicly readable" on public.comments;
drop policy if exists "Read comments for visible media" on public.comments;

create policy "comments_read_visible_parent"
on public.comments for select to anon, authenticated
using (
  author_id = (select auth.uid())
  or (
    post_id is not null
    and exists (
      select 1
      from public.posts p
      where p.id = comments.post_id
        and (
          p.visibility = 'public'
          or p.author_id = (select auth.uid())
          or (
            p.visibility = 'followers'
            and (select auth.uid()) is not null
            and exists (
              select 1 from public.follows f
              where f.follower_id = (select auth.uid())
                and f.followed_id = p.author_id
            )
          )
          or (
            p.visibility = 'church'
            and (select auth.uid()) is not null
            and exists (
              select 1 from public.profiles viewer
              where viewer.id = (select auth.uid())
                and viewer.church_id is not null
                and viewer.church_id = p.church_id
            )
          )
        )
    )
  )
  or (
    media_id is not null
    and exists (
      select 1
      from public.media_items m
      where m.id = comments.media_id
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
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and (
                p.role in ('platform_admin', 'church_admin')
                or p.badge in ('lead_pastor', 'admin', 'moderator')
              )
          )
        )
    )
  )
);

commit;
