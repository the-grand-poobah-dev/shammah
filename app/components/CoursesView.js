'use client';
import { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Clock,
  Award,
  Sparkles,
  ChevronRight,
  X,
  Share2,
  Heart,
  MessageCircle,
  Repeat,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import RepostModal from './RepostModal';

const COURSES_DATA = [
  {
    id: 'course-foundations',
    title: 'Foundations of Faith: The Pillars of New Covenant Believers',
    instructor: 'Pastor David Mwangi',
    role: 'church_admin',
    badge: 'pastor',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
    level: 'Foundational',
    duration: '4 Weeks · 8 Modules',
    enrolledCount: 142,
    progressPercent: 65,
    description: 'Master the core truths of salvation by grace, the authority of the believer, water baptism, the baptism in the Holy Spirit, and walking in continuous fellowship with God.',
    modules: [
      { id: 'm-1', title: 'Module 1: The Assurance of Eternal Salvation', duration: '24 min', completed: true },
      { id: 'm-2', title: 'Module 2: The Authority of the Believer in Christ', duration: '32 min', completed: true },
      { id: 'm-3', title: 'Module 3: Walking in Communion & Daily Prayer', duration: '28 min', completed: true },
      { id: 'm-4', title: 'Module 4: The Baptism and Gifts of the Holy Spirit', duration: '35 min', completed: false },
      { id: 'm-5', title: 'Module 5: Overcoming Temptation & the World', duration: '30 min', completed: false },
    ],
  },
  {
    id: 'course-intercession',
    title: 'Spiritual Warfare & Intercession: Guarding the City Gates',
    instructor: 'Sister Esther Wanjiku',
    role: 'member',
    badge: 'intercessor',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
    level: 'Intermediate',
    duration: '3 Weeks · 6 Modules',
    enrolledCount: 98,
    progressPercent: 30,
    description: 'Learn biblical protocols of spiritual warfare, binding and loosing, prayer vigils, praying scripture, and cultivating acute sensitivity to the Holy Spirit.',
    modules: [
      { id: 'm-w-1', title: 'Module 1: The Armor of God in Ephesians 6', duration: '26 min', completed: true },
      { id: 'm-w-2', title: 'Module 2: Strategic Prayer Watches & Dawn Prayers', duration: '29 min', completed: false },
      { id: 'm-w-3', title: 'Module 3: Fasting as Spiritual Breakthrough Weapon', duration: '33 min', completed: false },
    ],
  },
  {
    id: 'course-leadership',
    title: 'Kingdom Leadership: Servant Heart & Pastoral Wisdom',
    instructor: 'Bishop Sarah Ndung\'u',
    role: 'church_admin',
    badge: 'bishop',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    cover: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600',
    level: 'Advanced',
    duration: '6 Weeks · 12 Modules',
    enrolledCount: 76,
    progressPercent: 0,
    description: 'Essential leadership training for elders, deacons, cell group shepherds, and ministry coordinators. Conflict resolution, delegation, and mentoring emerging ministers.',
    modules: [
      { id: 'm-l-1', title: 'Module 1: The Heart of a Servant Shepherd', duration: '40 min', completed: false },
      { id: 'm-l-2', title: 'Module 2: Navigating Church Transitions & Unity', duration: '38 min', completed: false },
      { id: 'm-l-3', title: 'Module 3: Preaching & Teaching with Spiritual Power', duration: '45 min', completed: false },
    ],
  },
];

export default function CoursesView({ session, currentUser, openAuth }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState(COURSES_DATA);
  const [shareToast, setShareToast] = useState('');

  function handleEnroll(course) {
    if (!session) {
      if (openAuth) openAuth('signin');
      return;
    }
    setSelectedCourse(course);
  }

  function handleToggleModuleComplete(courseId, modId) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const nextMods = c.modules.map((m) => (m.id === modId ? { ...m, completed: !m.completed } : m));
        const done = nextMods.filter((m) => m.completed).length;
        const pct = Math.round((done / nextMods.length) * 100);
        const updated = { ...c, modules: nextMods, progressPercent: pct };
        if (selectedCourse?.id === courseId) setSelectedCourse(updated);
        return updated;
      })
    );
  }

  async function handleShareCourse(course) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(typeof window !== 'undefined' ? window.location.href : '');
    setShareToast('Course link copied to clipboard!');
    setTimeout(() => setShareToast(''), 2000);
  }

  return (
    <div className="section-feed-view courses-view-container">
      {/* Header Banner */}
      <div className="courses-header-banner">
        <div className="courses-header-content">
          <div className="courses-badge-tag">
            <GraduationCap size={16} />
            <span>Kingdom Discipleship Academy</span>
          </div>
          <h2 className="courses-main-title">Grow Deep in the Word of God</h2>
          <p className="courses-subtext">
            Self-paced discipleship courses taught by ordained pastors, elders, and ministry leaders. Learn doctrine, spiritual warfare, family, and leadership.
          </p>
        </div>
      </div>

      {shareToast && <div className="video-toast-pill">{shareToast}</div>}

      {/* Courses Cards Grid */}
      <div className="courses-grid-list">
        {courses.map((course) => {
          const isEnrolled = course.progressPercent > 0;
          return (
            <article key={course.id} className="post-card course-card">
              <div className="course-card-cover" style={{ backgroundImage: `url(${course.cover})` }}>
                <span className="course-level-chip">{course.level}</span>
                <span className="course-duration-chip">
                  <Clock size={11} /> {course.duration}
                </span>
              </div>

              <div className="course-card-body">
                <div className="course-instructor-row">
                  <Avatar name={course.instructor} src={course.avatar} className="avatar-xs" />
                  <div className="course-instructor-meta">
                    <span className="course-instructor-name">{course.instructor}</span>
                    <MemberBadge badgeId={course.badge} size="sm" />
                    <VerifiedBadge badge={course.badge} size={13} />
                  </div>
                </div>

                <h3 className="course-card-title">{course.title}</h3>
                <p className="course-card-desc">{course.description}</p>

                {/* Progress bar */}
                <div className="course-progress-section">
                  <div className="course-progress-header">
                    <span>{isEnrolled ? `${course.progressPercent}% Completed` : 'Not enrolled yet'}</span>
                    <span>{course.modules.filter((m) => m.completed).length} / {course.modules.length} modules</span>
                  </div>
                  <div className="course-progress-track">
                    <div className="course-progress-fill" style={{ width: `${course.progressPercent}%` }} />
                  </div>
                </div>

                <div className="course-actions-row">
                  <button
                    type="button"
                    className="course-enroll-btn"
                    onClick={() => handleEnroll(course)}
                  >
                    <BookOpen size={16} />
                    <span>{isEnrolled ? 'Continue Learning' : 'Start Course'}</span>
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    className="course-share-btn"
                    onClick={() => handleShareCourse(course)}
                    title="Share course"
                    aria-label="Share course"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Course Detail & Lesson Syllabus Modal */}
      {selectedCourse && (
        <div className="visibility-modal-backdrop" onClick={() => setSelectedCourse(null)} role="dialog" aria-modal="true">
          <div className="course-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="course-modal-header">
              <div className="course-modal-title">
                <GraduationCap size={20} className="course-modal-icon" />
                <h3>{selectedCourse.title}</h3>
              </div>
              <button
                type="button"
                className="course-modal-close"
                onClick={() => setSelectedCourse(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="course-modal-body">
              <div className="course-modal-instructor-info">
                <Avatar name={selectedCourse.instructor} src={selectedCourse.avatar} className="avatar-sm" />
                <div>
                  <strong>Instructor: {selectedCourse.instructor}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <MemberBadge badgeId={selectedCourse.badge} size="sm" />
                    <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{selectedCourse.duration}</span>
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '16px 0 10px', fontSize: 14 }}>Course Modules &amp; Lessons:</h4>

              <div className="course-modules-list">
                {selectedCourse.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className={`course-module-item${mod.completed ? ' completed' : ''}`}
                    onClick={() => handleToggleModuleComplete(selectedCourse.id, mod.id)}
                  >
                    <div className="module-item-left">
                      {mod.completed ? (
                        <CheckCircle size={18} className="module-check-icon active" />
                      ) : (
                        <PlayCircle size={18} className="module-check-icon" />
                      )}
                      <div className="module-text-wrap">
                        <span className="module-name">{mod.title}</span>
                        <span className="module-duration">{mod.duration} · Video &amp; Study Notes</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`module-toggle-btn${mod.completed ? ' done' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleModuleComplete(selectedCourse.id, mod.id);
                      }}
                    >
                      {mod.completed ? 'Completed ✓' : 'Mark Complete'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="course-modal-footer">
              <button
                type="button"
                className="signin-btn"
                onClick={() => setSelectedCourse(null)}
                style={{ width: '100%', padding: '10px 0' }}
              >
                Continue Studying
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
