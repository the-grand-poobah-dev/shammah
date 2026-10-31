'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import CourseLearnPlayer from '../../../components/CourseLearnPlayer';
import { getCourseDetail } from '../../../lib/data/coursesApi';
import { supabase } from '../../../../lib/supabaseClient';

function CourseLearnPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const initialLessonId = searchParams?.get('lesson') || null;

  const [course, setCourse] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      try {
        const { data: sessData } = await supabase.auth.getSession();
        const sess = sessData?.session || null;
        if (active) setSession(sess);
        const detail = await getCourseDetail(courseId, sess?.user?.id || null);
        if (active) setCourse(detail);
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load learning player.');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (courseId) init();
    return () => {
      active = false;
    };
  }, [courseId]);

  if (loading) {
    return (
      <main className="courses-route-container">
        <div className="lk-skeleton" style={{ height: 520, borderRadius: 18 }} />
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="courses-route-container">
        <div className="course-verify-card course-verify-invalid">
          <h2>{error || 'Course not found'}</h2>
          <button
            type="button"
            className="course-btn-primary"
            onClick={() => router.push('/?section=courses')}
          >
            Back to Courses Catalogue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="courses-route-container">
      <CourseLearnPlayer
        course={course}
        initialLessonId={initialLessonId}
        session={session}
        onBack={() => router.push(`/courses/${course.id}`)}
        onCourseUpdated={(res) => {
          setCourse((prev) => ({
            ...prev,
            ...res
          }));
        }}
      />
    </main>
  );
}

export default function CourseLearnPage() {
  return (
    <Suspense
      fallback={
        <main className="courses-route-container">
          <div className="lk-skeleton" style={{ height: 520, borderRadius: 18 }} />
        </main>
      }
    >
      <CourseLearnPageInner />
    </Suspense>
  );
}
