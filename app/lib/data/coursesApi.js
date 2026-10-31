import { supabase } from '../../../lib/supabaseClient';

const LEGACY_COMPLETED_KEY = 'shammah_completed_courses_v1';

// Compatibility shim for components that import COURSES_CATALOG directly (e.g. UserProfileView.js)
export const COURSES_CATALOG = [
  {
    id: 'c1',
    uuid: 'c0000000-0000-4000-a000-000000000001',
    title: 'Foundations of Faith',
    instructor: 'Pastor David M.',
    role: 'Senior Teaching Pastor',
    category: 'Theology',
    level: 'Beginner',
    duration: '2h 15m',
    duration_minutes: 135,
    price_kes: 0,
    lessonsCount: 5,
    rating: 4.9,
    students: 1240,
    accent: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80',
    description:
      'Understanding the core tenets of Christianity, salvation, grace, and the power of the Cross.',
    lessons: [
      { id: '10000000-0000-4000-c000-000000001001', title: '1. The Meaning of Grace', duration: '15:00', type: 'video' },
      { id: '10000000-0000-4000-c000-000000001002', title: '2. Walking by Faith, Not by Sight', duration: '20:00', type: 'text' },
      { id: '10000000-0000-4000-c000-000000001003', title: '3. Who is the Holy Spirit?', duration: '25:00', type: 'audio' },
      { id: '10000000-0000-4000-c000-000000001004', title: '4. How to Read the Bible (SOAP Study Guide)', duration: '18:00', type: 'download' },
      { id: '10000000-0000-4000-c000-000000001005', title: '5. Foundations of Faith Mastery Quiz', duration: '10:00', type: 'quiz' }
    ]
  },
  {
    id: 'c2',
    uuid: 'c0000000-0000-4000-a000-000000000002',
    title: 'The Power of Prayer & Fasting',
    instructor: 'Minister Sarah K.',
    role: 'Prayer Ministry Director',
    category: 'Spiritual Growth',
    level: 'Intermediate',
    duration: '1h 45m',
    duration_minutes: 105,
    price_kes: 0,
    lessonsCount: 3,
    rating: 4.8,
    students: 890,
    accent: '#06b6d4',
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=80',
    description:
      'Unlocking spiritual breakthroughs through intentional prayer, intercession, and biblical fasting.',
    lessons: [
      { id: '10000000-0000-4000-c000-000000002001', title: '1. The Lord’s Prayer Blueprint', duration: '22:00', type: 'video' },
      { id: '10000000-0000-4000-c000-000000002002', title: '2. Biblical Fasting Explained', duration: '30:00', type: 'text' },
      { id: '10000000-0000-4000-c000-000000002003', title: '3. Hearing God’s Voice in Stillness', duration: '28:00', type: 'audio' }
    ]
  },
  {
    id: 'c3',
    uuid: 'c0000000-0000-4000-a000-000000000003',
    title: 'Servant Leadership in Ministry',
    instructor: 'Bishop John O.',
    role: 'Apostolic Overseer',
    category: 'Leadership',
    level: 'Advanced',
    duration: '3h 00m',
    duration_minutes: 180,
    price_kes: 500,
    lessonsCount: 3,
    rating: 4.9,
    students: 650,
    accent: '#8b5cf6',
    image: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=800&q=80',
    description:
      'How to lead like Jesus in your local church, workplace, and community with humility and vision.',
    lessons: [
      { id: '10000000-0000-4000-c000-000000003001', title: '1. Jesus as the Ultimate Servant Leader', duration: '25:00', type: 'video' },
      { id: '10000000-0000-4000-c000-000000003002', title: '2. Building & Empowering Ministry Teams', duration: '30:00', type: 'text' },
      { id: '10000000-0000-4000-c000-000000003003', title: '3. Peacemaking & Restorative Conversations', duration: '15:00', type: 'quiz' }
    ]
  },
  {
    id: 'c4',
    uuid: 'c0000000-0000-4000-a000-000000000004',
    title: 'Biblical Financial Stewardship',
    instructor: 'Dr. Grace W.',
    role: 'Biblical Counselor & Author',
    category: 'Life & Family',
    level: 'Beginner',
    duration: '1h 40m',
    duration_minutes: 100,
    price_kes: 350,
    lessonsCount: 2,
    rating: 4.7,
    students: 520,
    accent: '#10b981',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
    description:
      'Managing your resources, generosity, budgeting, and wealth creation according to Kingdom principles.',
    lessons: [
      { id: '10000000-0000-4000-c000-000000004001', title: '1. Ownership vs. Stewardship', duration: '20:00', type: 'video' },
      { id: '10000000-0000-4000-c000-000000004002', title: '2. Kingdom Household Budget Template', duration: '25:00', type: 'download' }
    ]
  },
  {
    id: 'c5',
    uuid: 'c0000000-0000-4000-a000-000000000005',
    title: 'Sharing Your Faith in the Digital Age',
    instructor: 'Ev. Samuel T.',
    role: 'Missionary & Evangelist',
    category: 'Evangelism',
    level: 'Beginner',
    duration: '1h 35m',
    duration_minutes: 95,
    price_kes: 0,
    lessonsCount: 2,
    rating: 4.9,
    students: 780,
    accent: '#ec4899',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
    description:
      'Practical ways to share the Gospel authentically with friends, coworkers, and online communities.',
    lessons: [
      { id: '10000000-0000-4000-c000-000000005001', title: '1. The Power of Your Personal Testimony', duration: '18:00', type: 'video' },
      { id: '10000000-0000-4000-c000-000000005002', title: '2. Answering Tough Questions with Grace', duration: '25:00', type: 'text' }
    ]
  }
];

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
  const qs = userId ? `?action=list&userId=${encodeURIComponent(userId)}` : '?action=list';
  const res = await fetch(`/api/courses${qs}`, { headers, cache: 'no-store' });
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
  // Try Supabase RPC first if signed in and free
  if (!mpesaReceipt && userId) {
    try {
      await supabase.rpc('enroll', { p_course_id: courseId });
    } catch {}
  }
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
  try {
    await supabase.rpc('complete_lesson', {
      p_lesson_id: lessonId,
      p_position_seconds: positionSeconds,
      p_quiz_score: quizScore
    });
  } catch {}

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
    try {
      await supabase.rpc('migrate_legacy_completed_courses', {
        p_legacy_slugs: parsed.map(String),
        p_recipient_name: userName
      });
    } catch {}

    const res = await fetch('/api/courses', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'migrate_legacy_progress',
        userId,
        userName,
        completedSlugs: parsed.map(String)
      })
    });
    const data = await res.json();
    window.localStorage.removeItem(LEGACY_COMPLETED_KEY);
    return data;
  } catch {
    return null;
  }
}
