-- Courses security hardening.
-- Browser access is intentionally narrow; the server API/RPCs enforce course visibility,
-- enrollment/payment state, quiz answer secrecy, and certificate verification.

begin;

-- Compatibility column used by the current creator UI and API.
alter table public.courses add column if not exists instructor_role text;

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
        and (
          (
            c.status = 'published'
            and (
              is_preview = true
              or exists (
                select 1 from public.course_enrollments ce
                where ce.course_id = c.id
                  and ce.user_id = (select auth.uid())
                  and (ce.paid = true or c.price_kes = 0)
              )
            )
          )
          or c.author_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.role in ('platform_admin', 'church_admin')
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
      where ce.course_id = course_reviews.course_id and ce.user_id = (select auth.uid())
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


-- Replace the original enrollment RPC so unpublished courses cannot be joined.
create or replace function public.enroll(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $
declare
  v_uid uuid := auth.uid();
  v_course record;
  v_existing record;
  v_has_paid_tx boolean := false;
begin
  if v_uid is null then
    raise exception 'Authentication required to enroll in a course.' using errcode = '42501';
  end if;

  select id, title, price_kes, status
    into v_course
    from public.courses
    where id = p_course_id;
  if not found then
    raise exception 'Course not found.' using errcode = 'P0002';
  end if;
  if v_course.status <> 'published' then
    raise exception 'Only published courses can be enrolled in.' using errcode = '42501';
  end if;

  select * into v_existing
    from public.course_enrollments
    where user_id = v_uid and course_id = p_course_id;

  if found and (coalesce(v_course.price_kes, 0) = 0 or v_existing.paid = true) then
    return jsonb_build_object('ok', true, 'already_enrolled', true,
      'course_id', p_course_id, 'paid', v_existing.paid, 'enrolled_at', v_existing.enrolled_at);
  end if;

  if coalesce(v_course.price_kes, 0) > 0 then
    select exists (
      select 1 from public.mpesa_transactions mt
      where mt.user_id = v_uid
        and (mt.project_id = p_course_id::text or mt.plan_id = p_course_id::text)
        and mt.status in ('completed', 'confirmed')
        and mt.amount_kes >= v_course.price_kes
    ) into v_has_paid_tx;
    if not v_has_paid_tx then
      raise exception 'This is a paid course. Complete and verify M-Pesa payment first.'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.course_enrollments (user_id, course_id, enrolled_at, paid, amount_paid_kes)
  values (v_uid, p_course_id, now(), true, coalesce(v_course.price_kes, 0))
  on conflict (user_id, course_id) do update set
    paid = true,
    amount_paid_kes = greatest(public.course_enrollments.amount_paid_kes, excluded.amount_paid_kes);

  update public.courses
    set enrolled_count = (
      select count(*)::integer from public.course_enrollments ce
      where ce.course_id = p_course_id and ce.paid = true
    )
    where id = p_course_id;

  return jsonb_build_object('ok', true, 'course_id', p_course_id, 'paid', true, 'enrolled_at', now());
end;
$;

-- Do not let complete_lesson silently create an enrollment. The learner must already
-- have an enrollment and paid access for any priced course.
create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $
declare
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_price integer;
  v_enrollment record;
  v_progress jsonb;
  v_cert jsonb := null;
begin
  if v_uid is null then
    raise exception 'Authentication required to save lesson progress.' using errcode = '42501';
  end if;

  select cm.course_id, c.price_kes
    into v_course_id, v_price
    from public.course_lessons cl
    join public.course_modules cm on cm.id = cl.module_id
    join public.courses c on c.id = cm.course_id
    where cl.id = p_lesson_id;
  if v_course_id is null then
    raise exception 'Lesson not found.' using errcode = 'P0002';
  end if;

  select * into v_enrollment
    from public.course_enrollments ce
    where ce.user_id = v_uid and ce.course_id = v_course_id;
  if not found then
    raise exception 'Enroll in this course before completing lessons.' using errcode = '42501';
  end if;
  if coalesce(v_price, 0) > 0 and coalesce(v_enrollment.paid, false) is not true then
    raise exception 'Verified payment is required to access this course.' using errcode = '42501';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, course_id, completed, updated_at)
  values (v_uid, p_lesson_id, v_course_id, true, now())
  on conflict (user_id, lesson_id) do update set completed = true, updated_at = now();

  v_progress := public.course_progress(v_course_id);
  if coalesce((v_progress->>'is_completed')::boolean, false) then
    begin
      v_cert := public.issue_certificate(v_course_id);
    exception when others then
      v_cert := null;
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'lesson_id', p_lesson_id,
    'course_id', v_course_id,
    'progress', v_progress,
    'certificate_result', v_cert
  );
end;
$;

-- Certificates cannot be minted by a learner who is not enrolled with valid access.
create or replace function public.issue_certificate(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $
declare
  v_uid uuid := auth.uid();
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
  v_existing record;
  v_course record;
  v_profile record;
  v_code text;
  v_enrollment record;
begin
  if v_uid is null then
    raise exception 'Authentication required to issue a certificate.' using errcode = '42501';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if not found then
    raise exception 'Course not found.' using errcode = 'P0002';
  end if;

  select * into v_enrollment from public.course_enrollments
    where user_id = v_uid and course_id = p_course_id;
  if not found or (coalesce(v_course.price_kes, 0) > 0 and coalesce(v_enrollment.paid, false) is not true) then
    raise exception 'A valid enrollment is required for a certificate.' using errcode = '42501';
  end if;

  select * into v_existing from public.course_certificates
    where user_id = v_uid and course_id = p_course_id;
  if found then
    return jsonb_build_object('ok', true, 'certificate', row_to_json(v_existing));
  end if;

  select count(*)::integer into v_total_lessons
    from public.course_lessons cl
    join public.course_modules cm on cm.id = cl.module_id
    where cm.course_id = p_course_id;
  select count(*)::integer into v_completed_lessons
    from public.lesson_progress lp
    join public.course_lessons cl on cl.id = lp.lesson_id
    join public.course_modules cm on cm.id = cl.module_id
    where lp.user_id = v_uid and cm.course_id = p_course_id and lp.completed = true;

  if v_total_lessons = 0 or v_completed_lessons < v_total_lessons then
    raise exception 'Complete all course lessons before claiming a certificate.' using errcode = 'P0001';
  end if;

  select display_name into v_profile from public.profiles where id = v_uid;
  v_code := 'SHM-CERT-' || upper(substring(replace(p_course_id::text, '-', '') from 1 for 6))
    || '-' || upper(substring(md5(v_uid::text || clock_timestamp()::text) from 1 for 6));

  insert into public.course_certificates (
    user_id, course_id, issued_at, code, recipient_name, course_title, instructor_name, church_name
  ) values (
    v_uid, p_course_id, now(), v_code,
    coalesce(v_profile.display_name, 'Believer in Christ'),
    v_course.title, coalesce(v_course.instructor_name, 'Kingdom Instructor'),
    coalesce(v_course.church_name, 'Shammah Discipleship Academy')
  ) returning * into v_existing;

  update public.course_enrollments
    set completed_at = coalesce(completed_at, now())
    where user_id = v_uid and course_id = p_course_id;

  return jsonb_build_object('ok', true, 'certificate', row_to_json(v_existing));
end;
$;

revoke execute on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;

commit;
