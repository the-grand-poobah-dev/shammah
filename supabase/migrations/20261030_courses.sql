-- =============================================================================
-- Shammah Migration: 20261030_courses.sql
-- Purpose: Dynamic Courses, Modules, Lessons, Quizzes, Enrollments, Progress,
--          Reviews, Verifiable Certificates, M-Pesa Paid Course Unlock, and RPCs.
-- Safe to run multiple times (100% idempotent).
-- =============================================================================

-- 0. Ensure role grants on schema and tables so RLS policies never throw 42501
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  cover_url text,
  category text NOT NULL DEFAULT 'discipleship',
  level text NOT NULL DEFAULT 'Foundational',
  language text NOT NULL DEFAULT 'English',
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes >= 0),
  price_kes integer NOT NULL DEFAULT 0 CHECK (price_kes >= 0),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  accent text DEFAULT '#06b6d4',
  tags text[] NOT NULL DEFAULT '{}',
  outcomes text[] NOT NULL DEFAULT '{}',
  instructor_name text,
  instructor_avatar text,
  instructor_badge text DEFAULT 'pastor',
  church_name text,
  certificate_title text,
  badge_icon text DEFAULT '🎓',
  badge_name text DEFAULT 'Kingdom Scholar',
  rating_avg numeric(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  enrolled_count integer NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.courses
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'discipleship',
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'Foundational',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS price_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS accent text DEFAULT '#06b6d4',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS outcomes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS instructor_avatar text,
  ADD COLUMN IF NOT EXISTS instructor_badge text DEFAULT 'pastor',
  ADD COLUMN IF NOT EXISTS church_name text,
  ADD COLUMN IF NOT EXISTS certificate_title text,
  ADD COLUMN IF NOT EXISTS badge_icon text DEFAULT '🎓',
  ADD COLUMN IF NOT EXISTS badge_name text DEFAULT 'Kingdom Scholar',
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrolled_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_courses_status_category ON public.courses(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_author_id ON public.courses(author_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.courses TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated, service_role;

DROP POLICY IF EXISTS "courses_select_published_or_owner" ON public.courses;
CREATE POLICY "courses_select_published_or_owner"
  ON public.courses FOR SELECT
  USING (
    status = 'published'
    OR auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('platform_admin', 'church_admin')
    )
  );

DROP POLICY IF EXISTS "courses_insert_authenticated" ON public.courses;
CREATE POLICY "courses_insert_authenticated"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "courses_update_owner_or_admin" ON public.courses;
CREATE POLICY "courses_update_owner_or_admin"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('platform_admin', 'church_admin')
    )
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('platform_admin', 'church_admin')
    )
  );

DROP POLICY IF EXISTS "courses_delete_owner_or_admin" ON public.courses;
CREATE POLICY "courses_delete_owner_or_admin"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('platform_admin', 'church_admin')
    )
  );

-- 2. COURSE MODULES TABLE
CREATE TABLE IF NOT EXISTS public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.course_modules
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_course_modules_course_pos ON public.course_modules(course_id, position);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_modules TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.course_modules TO authenticated, service_role;

DROP POLICY IF EXISTS "course_modules_select_all" ON public.course_modules;
CREATE POLICY "course_modules_select_all"
  ON public.course_modules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "course_modules_write_owner" ON public.course_modules;
CREATE POLICY "course_modules_write_owner"
  ON public.course_modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  );

-- 3. COURSE LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'video' CHECK (kind IN ('video', 'audio', 'text', 'quiz', 'download')),
  media_url text,
  body_md text,
  scripture_ref text,
  duration_seconds integer NOT NULL DEFAULT 600 CHECK (duration_seconds >= 0),
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.course_lessons
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS body_md text,
  ADD COLUMN IF NOT EXISTS scripture_ref text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 600,
  ADD COLUMN IF NOT EXISTS is_preview boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_course_lessons_module_pos ON public.course_lessons(module_id, position);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_lessons TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated, service_role;

DROP POLICY IF EXISTS "course_lessons_select_all" ON public.course_lessons;
CREATE POLICY "course_lessons_select_all"
  ON public.course_lessons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "course_lessons_write_owner" ON public.course_lessons;
CREATE POLICY "course_lessons_write_owner"
  ON public.course_lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id
        AND (
          c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id
        AND (
          c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  );

-- 4. COURSE QUIZ QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.course_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0 CHECK (correct_index >= 0),
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.course_quiz_questions
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS correct_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_course_quiz_questions_lesson ON public.course_quiz_questions(lesson_id, position);

ALTER TABLE public.course_quiz_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_quiz_questions TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.course_quiz_questions TO authenticated, service_role;

DROP POLICY IF EXISTS "course_quiz_questions_select_all" ON public.course_quiz_questions;
CREATE POLICY "course_quiz_questions_select_all"
  ON public.course_quiz_questions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "course_quiz_questions_write_owner" ON public.course_quiz_questions;
CREATE POLICY "course_quiz_questions_write_owner"
  ON public.course_quiz_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_modules cm ON cm.id = cl.module_id
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cl.id = lesson_id
        AND (
          c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_lessons cl
      JOIN public.course_modules cm ON cm.id = cl.module_id
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cl.id = lesson_id
        AND (
          c.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
          )
        )
    )
  );

-- 5. COURSE ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  paid boolean NOT NULL DEFAULT false,
  amount_paid_kes integer NOT NULL DEFAULT 0,
  mpesa_receipt text,
  checkout_request_id text,
  UNIQUE (user_id, course_id)
);

ALTER TABLE IF EXISTS public.course_enrollments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS enrolled_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_paid_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mpesa_receipt text,
  ADD COLUMN IF NOT EXISTS checkout_request_id text;

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_checkout ON public.course_enrollments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.course_enrollments TO authenticated, service_role;

DROP POLICY IF EXISTS "course_enrollments_select_own_or_instructor" ON public.course_enrollments;
CREATE POLICY "course_enrollments_select_own_or_instructor"
  ON public.course_enrollments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('platform_admin', 'church_admin')
    )
  );

DROP POLICY IF EXISTS "course_enrollments_insert_own" ON public.course_enrollments;
CREATE POLICY "course_enrollments_insert_own"
  ON public.course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "course_enrollments_update_own" ON public.course_enrollments;
CREATE POLICY "course_enrollments_update_own"
  ON public.course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. LESSON PROGRESS TABLE (includes private learner notes & resume position)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  last_position_seconds integer NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  quiz_score integer CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
  personal_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE IF EXISTS public.lesson_progress
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_position_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiz_score integer,
  ADD COLUMN IF NOT EXISTS personal_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON public.lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated, service_role;

DROP POLICY IF EXISTS "lesson_progress_select_own_or_instructor" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select_own_or_instructor"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lesson_progress_write_own" ON public.lesson_progress;
CREATE POLICY "lesson_progress_write_own"
  ON public.lesson_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. COURSE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE IF EXISTS public.course_reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rating integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id, created_at DESC);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_reviews TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.course_reviews TO authenticated, service_role;

DROP POLICY IF EXISTS "course_reviews_select_all" ON public.course_reviews;
CREATE POLICY "course_reviews_select_all"
  ON public.course_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "course_reviews_write_own" ON public.course_reviews;
CREATE POLICY "course_reviews_write_own"
  ON public.course_reviews FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to recalculate course rating_avg and rating_count on review changes
CREATE OR REPLACE FUNCTION public.sync_course_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid := COALESCE(NEW.course_id, OLD.course_id);
BEGIN
  UPDATE public.courses c
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM public.course_reviews cr
      WHERE cr.course_id = v_course_id
    ), 0.00),
    rating_count = (
      SELECT COUNT(*)::integer
      FROM public.course_reviews cr
      WHERE cr.course_id = v_course_id
    )
  WHERE c.id = v_course_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_ratings ON public.course_reviews;
CREATE TRIGGER trg_sync_course_ratings
  AFTER INSERT OR UPDATE OR DELETE ON public.course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_course_ratings();

-- 8. COURSE CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  code text NOT NULL UNIQUE,
  recipient_name text,
  course_title text,
  instructor_name text,
  church_name text,
  UNIQUE (user_id, course_id)
);

ALTER TABLE IF EXISTS public.course_certificates
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS code text UNIQUE,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS course_title text,
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS church_name text;

CREATE INDEX IF NOT EXISTS idx_course_certificates_code ON public.course_certificates(code);
CREATE INDEX IF NOT EXISTS idx_course_certificates_user ON public.course_certificates(user_id);

ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.course_certificates TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.course_certificates TO authenticated, service_role;

DROP POLICY IF EXISTS "course_certificates_select_public_verify" ON public.course_certificates;
CREATE POLICY "course_certificates_select_public_verify"
  ON public.course_certificates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "course_certificates_insert_own" ON public.course_certificates;
CREATE POLICY "course_certificates_insert_own"
  ON public.course_certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 9. SERVER-VALIDATED RPCs: enroll, complete_lesson, course_progress, issue_certificate
-- =============================================================================

-- 9A. enroll(p_course_id uuid)
DROP FUNCTION IF EXISTS public.enroll(uuid);
CREATE OR REPLACE FUNCTION public.enroll(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course record;
  v_existing record;
  v_has_paid_tx boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to enroll in a course.' USING ERRCODE = '42501';
  END IF;

  SELECT id, title, price_kes, status
  INTO v_course
  FROM public.courses
  WHERE id = p_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing
  FROM public.course_enrollments
  WHERE user_id = v_uid AND course_id = p_course_id;

  IF FOUND AND (v_course.price_kes = 0 OR v_existing.paid = true) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_enrolled', true,
      'course_id', p_course_id,
      'paid', v_existing.paid,
      'enrolled_at', v_existing.enrolled_at
    );
  END IF;

  -- If paid course, verify payment in course_enrollments or mpesa_transactions
  IF COALESCE(v_course.price_kes, 0) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.mpesa_transactions mt
      WHERE mt.user_id = v_uid
        AND (mt.project_id = p_course_id::text OR mt.plan_id = p_course_id::text)
        AND mt.status IN ('completed', 'confirmed')
        AND mt.amount_kes >= v_course.price_kes
    ) INTO v_has_paid_tx;

    IF NOT v_has_paid_tx AND (v_existing IS NULL OR v_existing.paid = false) THEN
      RAISE EXCEPTION 'This is a paid course (KES %). Please complete M-Pesa payment first.', v_course.price_kes
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.course_enrollments (user_id, course_id, enrolled_at, paid, amount_paid_kes)
  VALUES (v_uid, p_course_id, now(), true, COALESCE(v_course.price_kes, 0))
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    paid = true,
    amount_paid_kes = GREATEST(public.course_enrollments.amount_paid_kes, EXCLUDED.amount_paid_kes);

  UPDATE public.courses
  SET enrolled_count = (
    SELECT COUNT(*)::integer FROM public.course_enrollments ce
    WHERE ce.course_id = p_course_id AND (ce.paid = true OR COALESCE(v_course.price_kes, 0) = 0)
  )
  WHERE id = p_course_id;

  RETURN jsonb_build_object(
    'ok', true,
    'course_id', p_course_id,
    'paid', true,
    'enrolled_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll(uuid) TO authenticated, service_role;

-- 9B. course_progress(p_course_id uuid)
DROP FUNCTION IF EXISTS public.course_progress(uuid);
CREATE OR REPLACE FUNCTION public.course_progress(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
  v_pct integer := 0;
  v_lessons jsonb := '{}'::jsonb;
  v_cert record;
BEGIN
  SELECT COUNT(*)::integer INTO v_total_lessons
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.course_id = p_course_id;

  IF v_uid IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.course_lessons cl ON cl.id = lp.lesson_id
    JOIN public.course_modules cm ON cm.id = cl.module_id
    WHERE lp.user_id = v_uid
      AND cm.course_id = p_course_id
      AND lp.completed = true;

    SELECT COALESCE(
      jsonb_object_agg(
        lp.lesson_id::text,
        jsonb_build_object(
          'completed', lp.completed,
          'last_position_seconds', lp.last_position_seconds,
          'quiz_score', lp.quiz_score,
          'personal_notes', lp.personal_notes,
          'updated_at', lp.updated_at
        )
      ),
      '{}'::jsonb
    )
    INTO v_lessons
    FROM public.lesson_progress lp
    JOIN public.course_lessons cl ON cl.id = lp.lesson_id
    JOIN public.course_modules cm ON cm.id = cl.module_id
    WHERE lp.user_id = v_uid AND cm.course_id = p_course_id;

    SELECT id, code, issued_at
    INTO v_cert
    FROM public.course_certificates
    WHERE user_id = v_uid AND course_id = p_course_id
    LIMIT 1;
  END IF;

  IF v_total_lessons > 0 THEN
    v_pct := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100)::integer;
  END IF;

  RETURN jsonb_build_object(
    'course_id', p_course_id,
    'total_lessons', v_total_lessons,
    'completed_lessons', v_completed_lessons,
    'progress_pct', LEAST(100, GREATEST(0, v_pct)),
    'is_completed', (v_total_lessons > 0 AND v_completed_lessons >= v_total_lessons),
    'lessons', v_lessons,
    'certificate_code', v_cert.code,
    'certificate_issued_at', v_cert.issued_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.course_progress(uuid) TO anon, authenticated, service_role;

-- 9C. issue_certificate(p_course_id uuid)
DROP FUNCTION IF EXISTS public.issue_certificate(uuid);
CREATE OR REPLACE FUNCTION public.issue_certificate(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total_lessons integer := 0;
  v_completed_lessons integer := 0;
  v_existing record;
  v_course record;
  v_profile record;
  v_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to issue a certificate.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_existing
  FROM public.course_certificates
  WHERE user_id = v_uid AND course_id = p_course_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'certificate', row_to_json(v_existing)
    );
  END IF;

  SELECT COUNT(*)::integer INTO v_total_lessons
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.course_id = p_course_id;

  SELECT COUNT(*)::integer INTO v_completed_lessons
  FROM public.lesson_progress lp
  JOIN public.course_lessons cl ON cl.id = lp.lesson_id
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE lp.user_id = v_uid
    AND cm.course_id = p_course_id
    AND lp.completed = true;

  IF v_total_lessons = 0 OR v_completed_lessons < v_total_lessons THEN
    RAISE EXCEPTION 'Please complete all % lessons before claiming your certificate (% completed).',
      v_total_lessons, v_completed_lessons
      USING ERRCODE = 'P0001';
  END IF;

  SELECT title, instructor_name, church_name
  INTO v_course
  FROM public.courses
  WHERE id = p_course_id;

  SELECT display_name INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  v_code := 'SHM-CERT-' || UPPER(SUBSTRING(REPLACE(p_course_id::text, '-', '') FROM 1 FOR 6))
            || '-' || UPPER(SUBSTRING(MD5(v_uid::text || now()::text) FROM 1 FOR 6));

  INSERT INTO public.course_certificates (
    user_id, course_id, issued_at, code,
    recipient_name, course_title, instructor_name, church_name
  )
  VALUES (
    v_uid,
    p_course_id,
    now(),
    v_code,
    COALESCE(v_profile.display_name, 'Believer in Christ'),
    v_course.title,
    COALESCE(v_course.instructor_name, 'Kingdom Instructor'),
    COALESCE(v_course.church_name, 'Shammah Discipleship Academy')
  )
  RETURNING * INTO v_existing;

  UPDATE public.course_enrollments
  SET completed_at = COALESCE(completed_at, now())
  WHERE user_id = v_uid AND course_id = p_course_id;

  RETURN jsonb_build_object(
    'ok', true,
    'certificate', row_to_json(v_existing)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid) TO authenticated, service_role;

-- 9D. complete_lesson(p_lesson_id uuid)
DROP FUNCTION IF EXISTS public.complete_lesson(uuid);
CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_progress jsonb;
  v_cert jsonb := null;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save lesson progress.' USING ERRCODE = '42501';
  END IF;

  SELECT cm.course_id INTO v_course_id
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cl.id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Ensure enrollment record exists
  INSERT INTO public.course_enrollments (user_id, course_id, enrolled_at, paid)
  VALUES (v_uid, v_course_id, now(), true)
  ON CONFLICT (user_id, course_id) DO NOTHING;

  INSERT INTO public.lesson_progress (user_id, lesson_id, course_id, completed, updated_at)
  VALUES (v_uid, p_lesson_id, v_course_id, true, now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    completed = true,
    updated_at = now();

  v_progress := public.course_progress(v_course_id);

  IF (v_progress->>'is_completed')::boolean = true THEN
    BEGIN
      v_cert := public.issue_certificate(v_course_id);
    EXCEPTION WHEN OTHERS THEN
      v_cert := null;
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'lesson_id', p_lesson_id,
    'course_id', v_course_id,
    'progress', v_progress,
    'certificate_result', v_cert
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_lesson(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
