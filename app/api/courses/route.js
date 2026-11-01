import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function resolveSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    rawUrl &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('your-project-url')
  ) {
    return rawUrl;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return `https://${payload.ref}.supabase.co`;
    } catch {}
  }
  return null;
}

function getSupabaseServerClient(authHeader) {
  const url = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key || key.includes('your-anon-key')) return null;

  const headers = {};
  if (!serviceKey && authHeader) {
    headers.Authorization = authHeader;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers }
  });
}

function getSupabaseUserClient(request) {
  const url = resolveSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = request.headers.get('authorization') || '';
  if (!url || !anonKey || !/^Bearer\s+\S+/i.test(authHeader)) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } }
  });
}

async function resolveSessionUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const url = resolveSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (token && url && key && !key.includes('your-anon-key')) {
    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data } = await client.auth.getUser(token);
      if (data?.user) return data.user;
    } catch {}
  }
  return null;
}

// No in-memory course catalogue: Supabase is the source of truth.
const SEEDED_COURSES = [];
const SEEDED_REVIEWS = [];

const memoryStore = {
  courses: SEEDED_COURSES.map((c) => JSON.parse(JSON.stringify(c))),
  enrollments: new Map(), // key: `${userId}:${courseId}`
  lessonProgress: new Map(), // key: `${userId}:${lessonId}`
  reviews: [...SEEDED_REVIEWS],
  certificates: new Map() // key: code -> cert object
};

function findCourseInMemory(idOrSlug) {
  return memoryStore.courses.find(
    (c) => c.id === idOrSlug || c.legacy_slug === idOrSlug
  );
}

function computeCourseStatsForUser(course, userId) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const allLessons = modules.flatMap((m) => m.lessons || []);
  const totalLessons = allLessons.length;
  let completedLessons = 0;
  const lessonProgressMap = {};

  if (userId) {
    for (const lesson of allLessons) {
      const lp = memoryStore.lessonProgress.get(`${userId}:${lesson.id}`);
      if (lp) {
        lessonProgressMap[lesson.id] = lp;
        if (lp.completed) completedLessons += 1;
      }
    }
  }

  const enrollment = userId ? memoryStore.enrollments.get(`${userId}:${course.id}`) || null : null;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  let certificate = null;
  if (userId) {
    for (const cert of memoryStore.certificates.values()) {
      if (cert.user_id === userId && cert.course_id === course.id) {
        certificate = cert;
        break;
      }
    }
  }

  return {
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    progress_percent: percent,
    enrolled: Boolean(enrollment),
    paid: Boolean(enrollment?.paid || (course.price_kes || 0) === 0),
    completed_at: enrollment?.completed_at || null,
    lesson_progress: lessonProgressMap,
    certificate
  };
}

function generateCertCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `SHM-${part1}-${part2}`;
}

async function fetchCoursesFromDb(supabase, userId) {
  if (!supabase) return null;
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return null;
    if (!Array.isArray(courses)) return null;
    if (courses.length === 0) return [];

    const courseIds = courses.map((c) => c.id);
    const [
      { data: modules },
      { data: lessons },
      { data: questions },
      { data: reviews },
      enrollRes,
      progressRes,
      certRes
    ] = await Promise.all([
      supabase.from('course_modules').select('*').in('course_id', courseIds).order('position', { ascending: true }),
      supabase.from('course_lessons').select('*').in('course_id', courseIds).order('position', { ascending: true }),
      supabase.from('course_quiz_questions').select('*').order('position', { ascending: true }),
      supabase.from('course_reviews').select('*').in('course_id', courseIds).order('created_at', { ascending: false }),
      userId
        ? supabase.from('course_enrollments').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('lesson_progress').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('course_certificates').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] })
    ]);

    const questionsByLesson = {};
    for (const q of questions || []) {
      if (!questionsByLesson[q.lesson_id]) questionsByLesson[q.lesson_id] = [];
      questionsByLesson[q.lesson_id].push(q);
    }

    const lessonsByModule = {};
    for (const l of lessons || []) {
      if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
      lessonsByModule[l.module_id].push({
        ...l,
        quiz_questions: questionsByLesson[l.id] || []
      });
    }

    const modulesByCourse = {};
    for (const m of modules || []) {
      if (!modulesByCourse[m.course_id]) modulesByCourse[m.course_id] = [];
      modulesByCourse[m.course_id].push({
        ...m,
        lessons: lessonsByModule[m.id] || []
      });
    }

    const enrollByCourse = {};
    for (const e of enrollRes?.data || []) {
      enrollByCourse[e.course_id] = e;
    }

    const progressByLesson = {};
    for (const lp of progressRes?.data || []) {
      progressByLesson[lp.lesson_id] = lp;
    }

    const certByCourse = {};
    for (const cert of certRes?.data || []) {
      certByCourse[cert.course_id] = cert;
    }

    const reviewsByCourse = {};
    for (const r of reviews || []) {
      if (!reviewsByCourse[r.course_id]) reviewsByCourse[r.course_id] = [];
      reviewsByCourse[r.course_id].push(r);
    }

    return courses.map((c) => {
      const cModules = modulesByCourse[c.id] || [];
      const allLessons = cModules.flatMap((m) => m.lessons || []);
      const totalLessons = allLessons.length;
      let completedLessons = 0;
      const lessonProgressMap = {};
      for (const l of allLessons) {
        if (progressByLesson[l.id]) {
          lessonProgressMap[l.id] = progressByLesson[l.id];
          if (progressByLesson[l.id].completed) completedLessons += 1;
        }
      }
      const enroll = enrollByCourse[c.id] || null;
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        ...c,
        modules: cModules,
        reviews: reviewsByCourse[c.id] || [],
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_percent: percent,
        enrolled: Boolean(enroll),
        paid: Boolean(enroll?.paid || (c.price_kes || 0) === 0),
        completed_at: enroll?.completed_at || null,
        lesson_progress: lessonProgressMap,
        certificate: certByCourse[c.id] || null
      };
    });
  } catch {
    return null;
  }
}

function sanitizeCourseForViewer(course, userId) {
  const isOwner = Boolean(userId && course.author_id === userId);
  const hasCourseAccess = Boolean(course.enrolled && course.paid);
  const mayReadFullCourse = isOwner || hasCourseAccess;
  return {
    ...course,
    modules: (course.modules || []).map((module) => ({
      ...module,
      lessons: (module.lessons || []).map((lesson) => {
        const mayReadLesson = mayReadFullCourse || lesson.is_preview === true;
        const questions = Array.isArray(lesson.quiz_questions) ? lesson.quiz_questions : [];
        return {
          ...lesson,
          media_url: mayReadLesson ? lesson.media_url : null,
          body_md: mayReadLesson ? lesson.body_md : null,
          quiz_questions: mayReadLesson
            ? questions.map((question) => {
                if (isOwner) return question;
                const { correct_index, explanation, ...safeQuestion } = question;
                return safeQuestion;
              })
            : []
        };
      })
    }))
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const sessionUser = await resolveSessionUser(request);
    const userId = sessionUser?.id || null;
    const supabase = getSupabaseServerClient(request.headers.get('authorization'));

    if (action === 'verify_certificate') {
      const code = String(searchParams.get('code') || '').trim().toUpperCase();
      if (!code) {
        return NextResponse.json({ error: 'Certificate code is required.' }, { status: 400 });
      }

      if (supabase) {
        try {
          const { data: cert } = await supabase
            .from('course_certificates')
            .select('*')
            .ilike('code', code)
            .maybeSingle();

          if (cert) {
            const { data: course } = await supabase
              .from('courses')
              .select('id, title, subtitle, instructor_name, instructor_role, category, level, duration_minutes, accent, cover_url')
              .eq('id', cert.course_id)
              .maybeSingle();

            return NextResponse.json({
              valid: true,
              certificate: {
                code: cert.code,
                recipient_name: cert.recipient_name,
                issued_at: cert.issued_at,
                course_title: cert.course_title || course?.title || null,
                instructor_name: cert.instructor_name || course?.instructor_name || null,
                course: course || null
              }
            });
          }
        } catch {}
      }

      return NextResponse.json({ valid: false, error: 'Certificate code not found.' }, { status: 404 });
    }

    const dbCourses = await fetchCoursesFromDb(supabase, userId);
    const visibleCourses = (dbCourses || memoryStore.courses.map((c) => {
      const stats = computeCourseStatsForUser(c, userId);
      const cReviews = memoryStore.reviews.filter((r) => r.course_id === c.id);
      return { ...c, ...stats, reviews: cReviews };
    })).filter((c) => c.status === 'published' || (userId && c.author_id === userId));
    const allCourses = visibleCourses.map((course) => sanitizeCourseForViewer(course, userId));

    if (action === 'detail') {
      const courseId = searchParams.get('id');
      const course = allCourses.find((c) => c.id === courseId || c.legacy_slug === courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
      }
      return NextResponse.json({ course });
    }

    if (action === 'instructor_dashboard') {
      if (!userId) return NextResponse.json({ error: 'Please sign in to view the instructor dashboard.' }, { status: 401 });
      const myCourses = allCourses.filter((c) => c.author_id === userId);
      let mpesaRevenue = 0;
      const transactions = [];

      if (supabase) {
        try {
          const courseIds = myCourses.map((c) => c.id);
          const { data: txs } = await supabase
            .from('mpesa_transactions')
            .select('*')
            .in('project_id', courseIds)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(25);
          if (Array.isArray(txs)) {
            for (const t of txs) {
              mpesaRevenue += Number(t.amount_kes || 0);
              transactions.push(t);
            }
          }
        } catch {}
      }

      const totalEnrollments = myCourses.reduce((acc, c) => acc + Number(c.enrolled_count || 0), 0);
      const allReviews = myCourses.flatMap((c) =>
        (c.reviews || []).map((r) => ({ ...r, course_title: c.title }))
      );

      return NextResponse.json({
        summary: {
          courses_count: myCourses.length,
          published_count: myCourses.filter((c) => c.status === 'published').length,
          draft_count: myCourses.filter((c) => c.status === 'draft').length,
          total_enrollments: totalEnrollments,
          avg_completion_rate: 0,
          total_revenue_kes: mpesaRevenue,
          avg_rating:
            myCourses.length > 0
              ? Number(
                  (
                    myCourses.reduce((a, c) => a + Number(c.rating_avg || 0), 0) /
                    myCourses.length
                  ).toFixed(1)
                )
              : 0
        },
        courses: myCourses,
        transactions,
        reviews: allReviews
      });
    }

    return NextResponse.json({ courses: allCourses });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load courses.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body || {};
    const sessionUser = await resolveSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Please sign in to perform this action.' }, { status: 401 });
    }
    const userId = sessionUser.id;
    const userName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Shammah Scholar';
    const supabase = getSupabaseServerClient(request.headers.get('authorization'));
    if (!supabase) {
      return NextResponse.json({ error: 'Course storage is not configured. Please try again later.' }, { status: 503 });
    }

    if (action === 'enroll') {
      const courseId = String(body.courseId || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)) {
        return NextResponse.json({ error: 'A valid course ID is required.' }, { status: 400 });
      }
      const userClient = getSupabaseUserClient(request);
      if (!userClient) {
        return NextResponse.json({ error: 'Your sign-in session could not be verified. Please sign in again.' }, { status: 401 });
      }
      const { data, error } = await userClient.rpc('enroll', { p_course_id: courseId });
      if (error) {
        const paymentRequired = /paid course|payment first|complete m-pesa/i.test(error.message || '');
        return NextResponse.json(
          { error: error.message || 'Could not enroll in this course.', requiresPayment: paymentRequired },
          { status: paymentRequired ? 402 : 400 }
        );
      }
      return NextResponse.json({ ok: true, enrolled: true, ...((data && typeof data === 'object') ? data : {}) });
    }

    if (action === 'complete_lesson') {
      const lessonId = String(body.lessonId || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lessonId)) {
        return NextResponse.json({ error: 'A valid lesson ID is required.' }, { status: 400 });
      }
      const userClient = getSupabaseUserClient(request);
      if (!userClient) {
        return NextResponse.json({ error: 'Your sign-in session could not be verified. Please sign in again.' }, { status: 401 });
      }
      const { data, error } = await userClient.rpc('complete_lesson', { p_lesson_id: lessonId });
      if (error) {
        return NextResponse.json({ error: error.message || 'Could not complete this lesson.' }, { status: 400 });
      }
      const courseId = data?.course_id;
      const positionSeconds = Math.max(0, Math.min(86400, Number(body.positionSeconds || 0)));
      const quizScore = body.quizScore == null ? null : Math.max(0, Math.min(100, Math.round(Number(body.quizScore))));
      const progressPayload = {
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        completed: true,
        last_position_seconds: positionSeconds,
        quiz_score: quizScore,
        updated_at: new Date().toISOString()
      };
      if (body.personalNotes !== undefined) progressPayload.personal_notes = String(body.personalNotes).slice(0, 10000);
      const { error: progressError } = await supabase
        .from('lesson_progress')
        .upsert(progressPayload, { onConflict: 'user_id,lesson_id' });
      if (progressError) {
        return NextResponse.json({ error: progressError.message || 'Lesson completed, but progress details could not be saved.' }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        progress: data?.progress || null,
        certificate: data?.certificate_result?.certificate || null
      });
    }

    if (action === 'save_lesson_progress') {
      const { courseId, lessonId, positionSeconds, personalNotes, quizScore } = body;
      if (!courseId || !lessonId) {
        return NextResponse.json({ error: 'Course and lesson IDs are required.' }, { status: 400 });
      }
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lessons')
        .select('id, course_id')
        .eq('id', lessonId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (lessonError || !lesson) {
        return NextResponse.json({ error: 'Lesson not found in this course.' }, { status: 404 });
      }
      const { data: course } = await supabase
        .from('courses')
        .select('id, price_kes')
        .eq('id', courseId)
        .maybeSingle();
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('paid')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (!course || !enrollment || (Number(course.price_kes || 0) > 0 && enrollment.paid !== true)) {
        return NextResponse.json({ error: 'Enroll in this course and complete any required payment before saving progress.' }, { status: 403 });
      }

      const payload = {
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        last_position_seconds: Math.max(0, Math.min(86400, Number(positionSeconds || 0))),
        updated_at: new Date().toISOString()
      };
      if (quizScore !== undefined) payload.quiz_score = quizScore == null ? null : Math.max(0, Math.min(100, Math.round(Number(quizScore))));
      if (personalNotes !== undefined) payload.personal_notes = String(personalNotes).slice(0, 10000);
      const { data: progress, error } = await supabase
        .from('lesson_progress')
        .upsert(payload, { onConflict: 'user_id,lesson_id' })
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message || 'Could not save lesson progress.' }, { status: 500 });
      return NextResponse.json({ ok: true, progress });
    }

    if (action === 'issue_certificate') {
      const courseId = String(body.courseId || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)) {
        return NextResponse.json({ error: 'A valid course ID is required.' }, { status: 400 });
      }
      const userClient = getSupabaseUserClient(request);
      if (!userClient) {
        return NextResponse.json({ error: 'Your sign-in session could not be verified. Please sign in again.' }, { status: 401 });
      }
      const { data, error } = await userClient.rpc('issue_certificate', { p_course_id: courseId });
      if (error) {
        return NextResponse.json({ error: error.message || 'Could not issue certificate.' }, { status: 400 });
      }
      return NextResponse.json({ ok: true, certificate: data?.certificate || data || null });
    }

    if (action === 'submit_review') {
      const { courseId, rating, body: reviewBody } = body;
      const cleanRating = Math.max(1, Math.min(5, Math.round(Number(rating || 5))));
      const cleanBody = String(reviewBody || '').trim().slice(0, 3000);
      if (!courseId || !Number.isFinite(cleanRating)) {
        return NextResponse.json({ error: 'Course and valid rating are required.' }, { status: 400 });
      }
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('paid')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (!enrollment) {
        return NextResponse.json({ error: 'You must enroll in this course before reviewing it.' }, { status: 403 });
      }
      const { data: savedReview, error } = await supabase
        .from('course_reviews')
        .upsert({
          user_id: userId,
          course_id: courseId,
          rating: cleanRating,
          body: cleanBody,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,course_id' })
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message || 'Could not submit review.' }, { status: 500 });
      return NextResponse.json({ ok: true, review: savedReview });
    }

    if (action === 'migrate_legacy_progress') {
      return NextResponse.json({
        ok: false,
        migrated_course_ids: [],
        error: 'Legacy course progress has not been mapped to the current database catalogue. The browser copy is being preserved.'
      }, { status: 409 });
    }

    if (action === 'save_course') {
      const { course: inputCourse } = body;
      if (!inputCourse || !inputCourse.title) {
        return NextResponse.json({ error: 'Course title is required.' }, { status: 400 });
      }

      let existingCourse = null;
      if (inputCourse.id) {
        const { data: foundCourse, error: lookupError } = await supabase
          .from('courses')
          .select('id, author_id')
          .eq('id', inputCourse.id)
          .maybeSingle();
        if (lookupError) {
          return NextResponse.json({ error: 'Could not verify course ownership.' }, { status: 500 });
        }
        existingCourse = foundCourse || null;
        if (existingCourse && existingCourse.author_id !== userId) {
          return NextResponse.json({ error: 'You can only edit courses you created.' }, { status: 403 });
        }
      }
      const isUpdate = Boolean(existingCourse);
      const courseId = inputCourse.id || `c-${Date.now()}`;
      const modules = Array.isArray(inputCourse.modules)
        ? inputCourse.modules.map((m, mIdx) => {
            const modId = m.id || `mod-${Date.now()}-${mIdx}`;
            return {
              id: modId,
              course_id: courseId,
              position: mIdx + 1,
              title: String(m.title || `Module ${mIdx + 1}`).trim(),
              lessons: Array.isArray(m.lessons)
                ? m.lessons.map((l, lIdx) => {
                    const lesId = l.id || `les-${Date.now()}-${mIdx}-${lIdx}`;
                    return {
                      id: lesId,
                      module_id: modId,
                      course_id: courseId,
                      position: lIdx + 1,
                      title: String(l.title || `Lesson ${lIdx + 1}`).trim(),
                      kind: ['video', 'audio', 'text', 'quiz', 'download'].includes(l.kind) ? l.kind : 'video',
                      media_url: String(l.media_url || '').trim(),
                      body_md: String(l.body_md || '').trim(),
                      duration_seconds: Math.max(60, Number(l.duration_seconds || 600)),
                      is_preview: Boolean(l.is_preview),
                      quiz_questions: Array.isArray(l.quiz_questions)
                        ? l.quiz_questions.map((q, qIdx) => ({
                            id: q.id || `q-${Date.now()}-${qIdx}`,
                            lesson_id: lesId,
                            position: qIdx + 1,
                            question: String(q.question || '').trim(),
                            options: Array.isArray(q.options) ? q.options.map(String) : ['True', 'False'],
                            correct_index: Number(q.correct_index || 0),
                            explanation: String(q.explanation || '').trim()
                          }))
                        : []
                    };
                  })
                : []
            };
          })
        : [];

      const totalSeconds = modules
        .flatMap((m) => m.lessons)
        .reduce((acc, l) => acc + Number(l.duration_seconds || 0), 0);

      const newCourseObj = {
        id: courseId,
        legacy_slug: inputCourse.legacy_slug || null,
        author_id: userId,
        church_id: inputCourse.church_id || null,
        instructor_name: String(inputCourse.instructor_name || userName || 'Pastor & Instructor').trim(),
        instructor_role: String(inputCourse.instructor_role || 'Course Instructor').trim(),
        instructor_avatar: inputCourse.instructor_avatar || null,
        title: String(inputCourse.title).trim(),
        subtitle: String(inputCourse.subtitle || '').trim(),
        description: String(inputCourse.description || inputCourse.subtitle || '').trim(),
        cover_url:
          String(inputCourse.cover_url || '').trim() ||
          'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1000&q=80',
        category: String(inputCourse.category || 'Theology').trim(),
        level: ['Beginner', 'Intermediate', 'Advanced'].includes(inputCourse.level)
          ? inputCourse.level
          : 'Beginner',
        language: String(inputCourse.language || 'English').trim(),
        duration_minutes: Math.max(15, Math.round(totalSeconds / 60) || Number(inputCourse.duration_minutes || 60)),
        price_kes: Math.max(0, Math.round(Number(inputCourse.price_kes || 0))),
        status: ['draft', 'published', 'archived'].includes(inputCourse.status)
          ? inputCourse.status
          : 'published',
        accent: String(inputCourse.accent || '#f59e0b'),
        tags: Array.isArray(inputCourse.tags)
          ? inputCourse.tags.map(String).filter(Boolean)
          : String(inputCourse.tags || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        outcomes: Array.isArray(inputCourse.outcomes)
          ? inputCourse.outcomes.map(String).filter(Boolean)
          : [],
        rating_avg: isUpdate ? findCourseInMemory(courseId)?.rating_avg || 5.0 : 5.0,
        rating_count: isUpdate ? findCourseInMemory(courseId)?.rating_count || 1 : 1,
        enrolled_count: isUpdate ? findCourseInMemory(courseId)?.enrolled_count || 1 : 1,
        created_at: isUpdate ? findCourseInMemory(courseId)?.created_at : new Date().toISOString(),
        modules
      };

      if (isUpdate) {
        memoryStore.courses = memoryStore.courses.map((c) => (c.id === courseId ? newCourseObj : c));
      } else {
        memoryStore.courses = [newCourseObj, ...memoryStore.courses];
      }

      if (supabase) {
        try {
          const { data: dbCourse } = await supabase
            .from('courses')
            .upsert({
              id: /^[0-9a-f-]{36}$/i.test(courseId) ? courseId : undefined,
              author_id: existingCourse?.author_id || (/^[0-9a-f-]{36}$/i.test(userId) ? userId : null),
              instructor_name: newCourseObj.instructor_name,
              instructor_role: newCourseObj.instructor_role,
              title: newCourseObj.title,
              subtitle: newCourseObj.subtitle,
              description: newCourseObj.description,
              cover_url: newCourseObj.cover_url,
              category: newCourseObj.category,
              level: newCourseObj.level,
              language: newCourseObj.language,
              duration_minutes: newCourseObj.duration_minutes,
              price_kes: newCourseObj.price_kes,
              status: newCourseObj.status,
              accent: newCourseObj.accent,
              tags: newCourseObj.tags,
              outcomes: newCourseObj.outcomes,
              updated_at: new Date().toISOString()
            })
            .select('*')
            .maybeSingle();

          if (dbCourse?.id) {
            newCourseObj.id = dbCourse.id;
            await supabase.from('course_modules').delete().eq('course_id', dbCourse.id);
            for (const mod of modules) {
              const { data: savedMod } = await supabase
                .from('course_modules')
                .insert({
                  course_id: dbCourse.id,
                  position: mod.position,
                  title: mod.title
                })
                .select('*')
                .maybeSingle();

              if (savedMod?.id) {
                for (const les of mod.lessons) {
                  const { data: savedLes } = await supabase
                    .from('course_lessons')
                    .insert({
                      module_id: savedMod.id,
                      course_id: dbCourse.id,
                      position: les.position,
                      title: les.title,
                      kind: les.kind,
                      media_url: les.media_url,
                      body_md: les.body_md,
                      duration_seconds: les.duration_seconds,
                      is_preview: les.is_preview
                    })
                    .select('*')
                    .maybeSingle();

                  if (savedLes?.id && Array.isArray(les.quiz_questions) && les.quiz_questions.length > 0) {
                    await supabase.from('course_quiz_questions').insert(
                      les.quiz_questions.map((q, idx) => ({
                        lesson_id: savedLes.id,
                        position: idx + 1,
                        question: q.question,
                        options: q.options,
                        correct_index: q.correct_index,
                        explanation: q.explanation
                      }))
                    );
                  }
                }
              }
            }
          }
        } catch {}
      }

      const stats = computeCourseStatsForUser(newCourseObj, userId);
      return NextResponse.json({
        ok: true,
        course: { ...newCourseObj, ...stats, reviews: [] }
      });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to process course action.' },
      { status: 500 }
    );
  }
}
