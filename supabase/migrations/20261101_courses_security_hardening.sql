-- Courses security hardening.
-- Browser access is intentionally narrow; the server API/RPCs enforce course visibility,
-- enrollment/payment state, quiz answer secrecy, and certificate verification.

begin;

-- Keep RLS enabled on every course-related table, including legacy progress.
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_quiz_questions enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.course_progress enable row level security;
alter table public.course_reviews enable row level security;
alter table public.course_certificates enable row level security;

-- Remove legacy broad policies that exposed drafts or granted direct write paths.
drop policy if exists "Courses readable by everyone" on public.courses;
drop policy if exists "Public read published courses" on public.courses;
drop policy if exists "Authenticated users can create courses" on public.courses;
drop policy if exists "Authors and church leaders manage courses" on public.courses;
drop policy if exists "courses_select_published_or_owner" on public.courses;
drop policy if exists "courses_insert_authenticated" on public.courses;
drop policy if exists "courses_update_owner_or_admin" on public.courses;
drop policy if exists "courses_delete_owner_or_admin" on public.courses;

create policy "courses_read_published_or_owner"
  on public.courses for select to anon, authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('platform_admin', 'church_admin')
    )
  );

create policy "courses_insert_by_author"
  on public.courses for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "courses_update_by_author_or_admin"
  on public.courses for update to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('platform_admin', 'church_admin')
    )
  )
  with check (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('platform_admin', 'church_admin')
    )
  );

create policy "courses_delete_by_author_or_admin"
  on public.courses for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('platform_admin', 'church_admin')
    )
  );

-- Curriculum metadata is visible only for published courses or to the course owner/admin.
drop policy if exists "Public read course modules" on public.course_modules;
drop policy if exists "course_modules_select_all" on public.course_modules;
drop policy if exists "course_modules_write_owner" on public.course_modules;
create policy "course_modules_read_visible_course"
  on public.course_modules for select to anon, authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.status = 'published'
          or c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
          )
        )
    )
  );
create policy "course_modules_write_owner"
  on public.course_modules for all to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
          )
        )
    )
  );

-- Lesson content is gated by preview status or a valid enrollment. The API also applies
-- this rule because it uses a server-side client for aggregation.
drop policy if exists "course_lessons_select_all" on public.course_lessons;
drop policy if exists "course_lessons_write_owner" on public.course_lessons;
create policy "course_lessons_read_preview_or_enrolled"
  on public.course_lessons for select to anon, authenticated
  using (
    exists (
      select 1
      from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = module_id
        and c.status = 'published'
        and (
          is_preview = true
          or c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
          )
          or exists (
            select 1 from public.course_enrollments ce
            where ce.course_id = c.id
              and ce.user_id = (select auth.uid())
              and (ce.paid = true or c.price_kes = 0)
          )
        )
    )
  );
create policy "course_lessons_write_owner"
  on public.course_lessons for all to authenticated
  using (
    exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = module_id
        and (
          c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = module_id
        and (
          c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
          )
        )
    )
  );

-- Quiz question rows contain correct_index and explanations, so browser roles cannot read
-- them directly. The server API/RPC is responsible for delivering quiz-safe payloads.
drop policy if exists "course_quiz_questions_select_all" on public.course_quiz_questions;
drop policy if exists "course_quiz_questions_write_owner" on public.course_quiz_questions;
revoke all privileges on table public.course_quiz_questions from anon, authenticated;

-- Enrollments are private. Enrollment creation/unlock must go through the verified RPC/API.
drop policy if exists "course_enrollments_select_own_or_instructor" on public.course_enrollments;
drop policy if exists "course_enrollments_insert_own" on public.course_enrollments;
drop policy if exists "course_enrollments_update_own" on public.course_enrollments;
drop policy if exists "Enrollment owner access" on public.course_enrollments;
create policy "course_enrollments_read_own"
  on public.course_enrollments for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate, references, trigger
  on table public.course_enrollments from anon, authenticated;
grant select on table public.course_enrollments to authenticated;

-- Private lesson progress and notes belong only to their author.
drop policy if exists "lesson_progress_select_own_or_instructor" on public.lesson_progress;
drop policy if exists "lesson_progress_write_own" on public.lesson_progress;
create policy "lesson_progress_read_own"
  on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "lesson_progress_insert_own"
  on public.lesson_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "lesson_progress_update_own"
  on public.lesson_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "lesson_progress_delete_own"
  on public.lesson_progress for delete to authenticated
  using (user_id = (select auth.uid()));

-- Legacy course_progress rows are private too; remove any policy that trusts enrollment IDs alone.
drop policy if exists "Progress owner access" on public.course_progress;
drop policy if exists "Users can manage own course progress" on public.course_progress;
drop policy if exists "Users can read own course progress" on public.course_progress;
create policy "course_progress_read_own"
  on public.course_progress for select to authenticated
  using (user_id = (select auth.uid()));
create policy "course_progress_write_own"
  on public.course_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Reviews may be read on published courses; writes are restricted to enrolled learners.
drop policy if exists "course_reviews_select_all" on public.course_reviews;
drop policy if exists "course_reviews_insert_own" on public.course_reviews;
drop policy if exists "course_reviews_update_own" on public.course_reviews;
drop policy if exists "course_reviews_delete_own" on public.course_reviews;
create policy "course_reviews_read_published"
  on public.course_reviews for select to anon, authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.status = 'published'
    )
    or user_id = (select auth.uid())
  );
create policy "course_reviews_insert_enrolled"
  on public.course_reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.course_enrollments ce
      where ce.course_id = course_id and ce.user_id = (select auth.uid())
        and (ce.paid = true or exists (
          select 1 from public.courses c where c.id = course_id and c.price_kes = 0
        ))
    )
  );
create policy "course_reviews_update_own"
  on public.course_reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "course_reviews_delete_own"
  on public.course_reviews for delete to authenticated
  using (user_id = (select auth.uid()));

-- Certificates are publicly verifiable through the API by code only. Direct table access
-- would expose recipient/user data, so browser access is limited to the owner's rows.
drop policy if exists "course_certificates_select_public_verify" on public.course_certificates;
drop policy if exists "course_certificates_insert_own" on public.course_certificates;
drop policy if exists "course_certificates_select_own" on public.course_certificates;
create policy "course_certificates_select_own"
  on public.course_certificates for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate, references, trigger
  on table public.course_certificates from anon, authenticated;
grant select on table public.course_certificates to authenticated;

-- Browser roles must not be able to manipulate ratings/counts or course content through
-- direct table writes. The verified server API handles creator actions.
revoke insert, update, delete, truncate, references, trigger
  on table public.courses, public.course_modules, public.course_lessons, public.course_reviews
  from anon, authenticated;
grant select on table public.courses, public.course_modules, public.course_lessons, public.course_reviews
  to anon, authenticated;

-- Sensitive RPCs must not be callable anonymously. They still verify auth.uid() internally.
revoke execute on function public.enroll(uuid) from public, anon;
revoke execute on function public.course_progress(uuid) from public, anon;
revoke execute on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.enroll(uuid), public.course_progress(uuid), public.issue_certificate(uuid)
  to authenticated;

commit;
