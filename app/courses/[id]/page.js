'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CourseDetailView from '../../components/CourseDetailView';
import { getCourseDetail } from '../../lib/data/coursesApi';
import { supabase } from '../../../lib/supabaseClient';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

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
        if (active) setError(err?.message || 'Course not found.');
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
        <div className="lk-skeleton" style={{ height: 420, borderRadius: 18 }} />
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
      <CourseDetailView
        course={course}
        session={session}
        onBack={() => router.push('/?section=courses')}
        onStartLearning={(c, lessonId) =>
          router.push(`/courses/${c.id}/learn${lessonId ? `?lesson=${lessonId}` : ''}`)
        }
        onCourseUpdated={(updated) => setCourse(updated)}
      />
    </main>
  );
}
