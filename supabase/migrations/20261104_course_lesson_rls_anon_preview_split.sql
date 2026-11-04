-- Split public preview access from authenticated enrollment access.
-- The combined legacy policy references course_enrollments while evaluating an
-- anonymous lesson query. Because anon intentionally has no SELECT grant on
-- course_enrollments, PostgreSQL raises "permission denied" before RLS can
-- filter rows. Do not restore anon table grants: keep enrollment data private.
--
-- Run manually in Supabase SQL Editor. Safe to rerun.

begin;

drop policy if exists course_lessons_read_preview_or_enrolled
  on public.course_lessons;

drop policy if exists course_lessons_read_public_previews
  on public.course_lessons;

drop policy if exists course_lessons_read_authenticated_access
  on public.course_lessons;

-- Anonymous visitors can read only lessons explicitly marked as previews
-- within published courses. This policy never references private enrollments.
create policy course_lessons_read_public_previews
  on public.course_lessons
  for select
  to anon
  using (
    is_preview = true
    and exists (
      select 1
      from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = course_lessons.module_id
        and c.status = 'published'
    )
  );

-- Signed-in users may read previews, lessons for a course they have paid for
-- (or a free course), their own authored course, or courses they administer.
-- The authenticated role retains SELECT on course_enrollments, while its RLS
-- policy restricts direct enrollment reads to the current user's own rows.
create policy course_lessons_read_authenticated_access
  on public.course_lessons
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = course_lessons.module_id
        and (
          (
            c.status = 'published'
            and (
              course_lessons.is_preview = true
              or exists (
                select 1
                from public.course_enrollments ce
                where ce.course_id = c.id
                  and ce.user_id = (select auth.uid())
                  and (ce.paid = true or c.price_kes = 0)
              )
            )
          )
          or c.author_id = (select auth.uid())
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role = any (array['platform_admin'::text, 'church_admin'::text])
          )
        )
    )
  );

commit;
