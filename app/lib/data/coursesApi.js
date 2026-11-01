import { supabase } from '../../../lib/supabaseClient';

const LEGACY_COMPLETED_KEY = 'shammah_completed_courses_v1';

// Compatibility shim for components that import COURSES_CATALOG directly (e.g. UserProfileView.js)
// Compatibility export only. Real catalogue data comes from /api/courses.
export const COURSES_CATALOG = [];

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {}
  return headers;
}

export function formatDurationMinutes(mins) {
  const m = Math.max(1, Math.round(Number(mins || 0)));
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  if (hrs > 0 && rem > 0) return `${hrs}h ${rem}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${rem}m`;
}

export function formatDurationSeconds(secs) {
  const s = Math.max(0, Math.round(Number(secs || 0)));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export async function listCourses(userId = null) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/courses?action=list', { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load courses.');
  return data.courses || [];
}

export async function getCourseDetail(courseId, userId = null) {
  const headers = await getAuthHeaders();
  const qs = `?action=detail&id=${encodeURIComponent(courseId)}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`;
  const res = await fetch(`/api/courses${qs}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load course details.');
  return data.course;
}

export async function enrollInCourse({ courseId, userId, userName, mpesaReceipt = null, amountPaidKes = 0 }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'enroll',
      courseId,
      userId,
      userName,
      mpesaReceipt,
      amountPaidKes
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not enroll in course.');
  return data;
}

export async function completeCourseLesson({
  courseId,
  lessonId,
  userId,
  userName,
  positionSeconds = 0,
  quizScore = null,
  personalNotes
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'complete_lesson',
      courseId,
      lessonId,
      userId,
      userName,
      positionSeconds,
      quizScore,
      personalNotes
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not mark lesson complete.');
  return data;
}

export async function saveLessonProgress({
  courseId,
  lessonId,
  userId,
  positionSeconds,
  personalNotes,
  quizScore
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'save_lesson_progress',
      courseId,
      lessonId,
      userId,
      positionSeconds,
      personalNotes,
      quizScore
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not save lesson progress.');
  return data;
}

export async function submitCourseReview({ courseId, userId, userName, rating, body }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'submit_review',
      courseId,
      userId,
      userName,
      rating,
      body
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not submit review.');
  return data;
}

export async function issueCourseCertificate({ courseId, userId, recipientName }) {
  const headers = await getAuthHeaders();
  try {
    await supabase.rpc('issue_certificate', {
      p_course_id: courseId,
      p_recipient_name: recipientName
    });
  } catch {}
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'issue_certificate',
      courseId,
      userId,
      recipientName
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not issue certificate.');
  return data.certificate;
}

export async function verifyCertificateCode(code) {
  const res = await fetch(`/api/courses?action=verify_certificate&code=${encodeURIComponent(code)}`, {
    cache: 'no-store'
  });
  const data = await res.json();
  return data;
}

export async function saveCourse({ course, userId, userName }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/courses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'save_course',
      course,
      userId,
      userName
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not save course.');
  return data.course;
}

export async function getInstructorDashboard(userId = null) {
  const headers = await getAuthHeaders();
  const qs = `?action=instructor_dashboard${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`;
  const res = await fetch(`/api/courses${qs}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load instructor dashboard.');
  return data;
}

export async function suggestCourseOutline({ title, subtitle, description, category, level }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/gemini/course-outline', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, subtitle, description, category, level })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not generate outline.');
  return data;
}

/**
 * One-time migration of legacy localStorage key `shammah_completed_courses_v1`
 * into Supabase `course_enrollments`, `lesson_progress`, and `course_certificates`,
 * then removes the localStorage key so Supabase is the sole source of truth.
 */
export async function migrateLegacyCourseProgress(userId, userName = 'Shammah Scholar') {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_COMPLETED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.removeItem(LEGACY_COMPLETED_KEY);
      return null;
    }

    const headers = await getAuthHeaders();
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'migrate_legacy_progress',
        userName,
        completedSlugs: parsed.map(String)
      })
    });
    const data = await res.json();
    // Keep the legacy copy unless the server confirms that records were actually migrated.
    if (res.ok && Array.isArray(data.migrated_course_ids) && data.migrated_course_ids.length > 0) {
      window.localStorage.removeItem(LEGACY_COMPLETED_KEY);
    }
    return data;
  } catch {
    return null;
  }
}
