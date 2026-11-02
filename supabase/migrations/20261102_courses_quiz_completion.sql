-- Persist server-graded quiz attempts and require a passing score before quiz completion.
BEGIN;

CREATE TABLE IF NOT EXISTS public.course_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  correct_count integer NOT NULL CHECK (correct_count >= 0),
  total_questions integer NOT NULL CHECK (total_questions > 0),
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (correct_count <= total_questions)
);

CREATE INDEX IF NOT EXISTS course_quiz_attempts_user_lesson_idx
  ON public.course_quiz_attempts (user_id, lesson_id, created_at DESC);

ALTER TABLE public.course_quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_quiz_attempts_read_own" ON public.course_quiz_attempts;
CREATE POLICY "course_quiz_attempts_read_own"
  ON public.course_quiz_attempts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL PRIVILEGES ON TABLE public.course_quiz_attempts FROM anon, authenticated;
GRANT SELECT ON TABLE public.course_quiz_attempts TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.course_quiz_attempts TO service_role;

-- Lesson progress must be written through the server API or the validated completion RPC;
-- direct client writes would otherwise let a learner bypass quiz completion checks.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.lesson_progress FROM anon, authenticated;
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_price integer;
  v_kind text;
  v_enrollment record;
  v_progress jsonb;
  v_cert jsonb := null;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save lesson progress.' USING errcode = '42501';
  END IF;

  SELECT cm.course_id, c.price_kes, cl.kind
    INTO v_course_id, v_price, v_kind
    FROM public.course_lessons cl
    JOIN public.course_modules cm ON cm.id = cl.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE cl.id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found.' USING errcode = 'P0002';
  END IF;

  SELECT * INTO v_enrollment
    FROM public.course_enrollments ce
    WHERE ce.user_id = v_uid AND ce.course_id = v_course_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enroll in this course before completing lessons.' USING errcode = '42501';
  END IF;
  IF COALESCE(v_price, 0) > 0 AND COALESCE(v_enrollment.paid, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Verified payment is required to access this course.' USING errcode = '42501';
  END IF;

  IF v_kind = 'quiz' AND NOT EXISTS (
    SELECT 1
    FROM public.course_quiz_attempts qa
    WHERE qa.user_id = v_uid
      AND qa.course_id = v_course_id
      AND qa.lesson_id = p_lesson_id
      AND qa.passed = true
  ) THEN
    RAISE EXCEPTION 'Pass this quiz with at least 70%% before completing it.' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.lesson_progress (user_id, lesson_id, course_id, completed, updated_at)
  VALUES (v_uid, p_lesson_id, v_course_id, true, now())
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET completed = true, updated_at = now();

  v_progress := public.course_progress(v_course_id);
  IF COALESCE((v_progress->>'is_completed')::boolean, false) THEN
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
$function$;

REVOKE ALL ON FUNCTION public.complete_lesson(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lesson(uuid) TO authenticated, service_role;

COMMIT;
