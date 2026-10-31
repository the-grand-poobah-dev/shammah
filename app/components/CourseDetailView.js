'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Star,
  Users,
  Clock,
  BookOpen,
  PlayCircle,
  Headphones,
  FileText,
  HelpCircle,
  Download,
  CheckCircle2,
  Award,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Globe,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Send
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import MpesaPaymentModal from './MpesaPaymentModal';
import CourseCertificateModal from './CourseCertificateModal';
import {
  enrollInCourse,
  submitCourseReview,
  issueCourseCertificate,
  formatDurationMinutes,
  formatDurationSeconds
} from '../lib/data/coursesApi';
import { supabase } from '../../lib/supabaseClient';

function getLessonIcon(kind, size = 15) {
  switch (kind) {
    case 'video':
      return <PlayCircle size={size} />;
    case 'audio':
      return <Headphones size={size} />;
    case 'quiz':
      return <HelpCircle size={size} />;
    case 'download':
      return <Download size={size} />;
    case 'text':
    default:
      return <FileText size={size} />;
  }
}

export default function CourseDetailView({
  course: initialCourse,
  session = null,
  userProfile = null,
  onBack,
  onStartLearning,
  onCourseUpdated
}) {
  const [course, setCourse] = useState(initialCourse);
  const userId = session?.user?.id || userProfile?.id || 'guest-scholar';
  const userName =
    userProfile?.full_name ||
    userProfile?.name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Shammah Scholar';

  const [enrolling, setEnrolling] = useState(false);
  const [followingInstructor, setFollowingInstructor] = useState(false);
  const [openModuleIds, setOpenModuleIds] = useState(() => {
    const firstId = initialCourse?.modules?.[0]?.id || 'mod-0';
    return { [firstId]: true };
  });

  // Preview Lesson Modal
  const [previewLesson, setPreviewLesson] = useState(null);

  // Paid course M-Pesa Modal
  const [showMpesaModal, setShowMpesaModal] = useState(false);

  // Certificate Modal
  const [certificate, setCertificate] = useState(initialCourse?.certificate || null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Review Form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  const modules = useMemo(() => {
    if (Array.isArray(course?.modules) && course.modules.length > 0) {
      return course.modules;
    }
    return [
      {
        id: 'mod-0',
        title: 'Module 1: Core Curriculum',
        position: 1,
        lessons: Array.isArray(course?.lessons)
          ? course.lessons.map((l, idx) => ({
              id: l.id || `les-${idx}`,
              title: l.title,
              kind: l.kind || l.type || 'video',
              duration_seconds: l.duration_seconds || 600,
              is_preview: idx === 0
            }))
          : []
      }
    ];
  }, [course]);

  const totalLessons = useMemo(
    () => modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0),
    [modules]
  );

  const isFree = Number(course?.price_kes || 0) === 0;
  const isEnrolled = Boolean(course?.enrolled && (isFree || course?.paid));
  const progressPercent = Number(course?.progress_percent || 0);

  const handleToggleFollow = async () => {
    const next = !followingInstructor;
    setFollowingInstructor(next);
    if (course?.author_id && session?.user?.id) {
      try {
        if (next) {
          await supabase.from('follows').insert({
            follower_id: session.user.id,
            following_id: course.author_id
          });
        } else {
          await supabase
            .from('follows')
            .delete()
            .eq('follower_id', session.user.id)
            .eq('following_id', course.author_id);
        }
      } catch {}
    }
  };

  const handlePrimaryAction = async () => {
    if (isEnrolled) {
      onStartLearning?.(course, null);
      return;
    }
    if (!isFree) {
      setShowMpesaModal(true);
      return;
    }
    setEnrolling(true);
    try {
      const res = await enrollInCourse({
        courseId: course.id,
        userId,
        userName
      });
      const updated = {
        ...course,
        enrolled: true,
        paid: true,
        enrolled_count: Number(course.enrolled_count || 0) + 1
      };
      setCourse(updated);
      onCourseUpdated?.(updated);
      onStartLearning?.(updated, null);
    } catch {} finally {
      setEnrolling(false);
    }
  };

  const handleMpesaSuccess = async (paymentData) => {
    try {
      await enrollInCourse({
        courseId: course.id,
        userId,
        userName,
        mpesaReceipt: paymentData?.receiptCode || 'MPESA-PAID',
        amountPaidKes: course.price_kes
      });
      const updated = {
        ...course,
        enrolled: true,
        paid: true,
        enrolled_count: Number(course.enrolled_count || 0) + 1
      };
      setCourse(updated);
      onCourseUpdated?.(updated);
      setShowMpesaModal(false);
      onStartLearning?.(updated, null);
    } catch {}
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBody.trim() || submittingReview) return;
    setSubmittingReview(true);
    setReviewNotice('');
    try {
      const res = await submitCourseReview({
        courseId: course.id,
        userId,
        userName,
        rating: reviewRating,
        body: reviewBody.trim()
      });
      if (res?.review) {
        const updated = {
          ...course,
          rating_avg: res.rating_avg || course.rating_avg,
          rating_count: res.rating_count || (course.rating_count || 0) + 1,
          reviews: [res.review, ...(course.reviews || [])]
        };
        setCourse(updated);
        onCourseUpdated?.(updated);
        setReviewBody('');
        setReviewNotice('Thank you! Your review has been published.');
      }
    } catch {
      setReviewNotice('Could not submit review right now.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenCertificate = async () => {
    if (certificate) {
      setShowCertificateModal(true);
      return;
    }
    try {
      const cert = await issueCourseCertificate({
        courseId: course.id,
        userId,
        recipientName: userName
      });
      if (cert) {
        setCertificate(cert);
        setShowCertificateModal(true);
      }
    } catch {}
  };

  const accent = course?.accent || '#f59e0b';
  const outcomes =
    Array.isArray(course?.outcomes) && course.outcomes.length > 0
      ? course.outcomes
      : [
          `Build a strong biblical foundation in ${course?.title}`,
          'Apply practical spiritual habits and reflection in daily life',
          'Lead and encourage others in your church or small group',
          'Earn a verifiable Shammah Faith Academy Certificate of Completion'
        ];

  return (
    <div className="course-detail-shell" style={{ '--sec-color': accent }}>
      {/* Top Bar */}
      <div className="course-detail-topbar">
        <button type="button" className="course-btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Courses</span>
        </button>

        {progressPercent === 100 && (
          <button
            type="button"
            className="course-btn-certificate"
            onClick={handleOpenCertificate}
          >
            <Award size={15} />
            <span>View Certificate</span>
          </button>
        )}
      </div>

      {/* Hero Banner */}
      <div className="course-detail-hero">
        <div className="course-detail-hero-media">
          <img
            src={
              course?.cover_url ||
              course?.image ||
              'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1000&q=80'
            }
            alt={course?.title}
            className="course-detail-hero-img"
          />
          <div className="course-detail-hero-overlay" />
          <div className="course-detail-hero-badges">
            <span className="course-detail-chip is-accent">{course?.category || 'Theology'}</span>
            <span className="course-detail-chip">{course?.level || 'Beginner'}</span>
            <span className="course-detail-chip">
              <Globe size={12} /> {course?.language || 'English'}
            </span>
          </div>
        </div>

        <div className="course-detail-hero-body">
          <h1 className="course-detail-title">{course?.title}</h1>
          <p className="course-detail-subtitle">
            {course?.subtitle || course?.description}
          </p>

          <div className="course-detail-stats-row">
            <span className="course-detail-stat">
              <Star size={15} fill="#fbbf24" color="#fbbf24" />
              <strong>{course?.rating_avg || course?.rating || 4.9}</strong>
              <span>({course?.rating_count || 42} reviews)</span>
            </span>
            <span className="course-detail-stat">
              <Users size={15} />
              <strong>
                {Number(course?.enrolled_count || course?.students || 0).toLocaleString()}
              </strong>
              <span>scholars</span>
            </span>
            <span className="course-detail-stat">
              <Clock size={15} />
              <span>{formatDurationMinutes(course?.duration_minutes || 95)}</span>
            </span>
            <span className="course-detail-stat">
              <BookOpen size={15} />
              <span>{totalLessons} lessons</span>
            </span>
          </div>

          {/* Instructor Row + Follow */}
          <div className="course-detail-instructor-bar">
            <div className="course-detail-instructor-info">
              <div className="course-detail-instructor-avatar">
                {(course?.instructor_name || course?.instructor || 'P').charAt(0)}
              </div>
              <div>
                <div className="course-detail-instructor-name">
                  {course?.instructor_name || course?.instructor || 'Pastor David M.'}
                </div>
                <div className="course-detail-instructor-role">
                  {course?.instructor_role || course?.role || 'Senior Teaching Pastor'}
                </div>
              </div>
            </div>

            <button
              type="button"
              className={`course-btn-follow ${followingInstructor ? 'is-following' : ''}`}
              onClick={handleToggleFollow}
            >
              {followingInstructor ? <UserCheck size={14} /> : <UserPlus size={14} />}
              <span>{followingInstructor ? 'Following' : 'Follow Instructor'}</span>
            </button>
          </div>

          {/* Enrollment / Price Action Box */}
          <div className="course-detail-cta-bar">
            <div className="course-detail-price-box">
              {isFree ? (
                <span className="course-detail-price-free">Free Faith Course</span>
              ) : (
                <div>
                  <span className="course-detail-price-amount">
                    KES {Number(course.price_kes).toLocaleString()}
                  </span>
                  <span className="course-detail-price-note">
                    One-time M-Pesa enrollment • Lifetime access & certificate
                  </span>
                </div>
              )}
            </div>

            <div className="course-detail-cta-buttons">
              <button
                type="button"
                className="course-btn-primary course-btn-lg"
                onClick={handlePrimaryAction}
                disabled={enrolling}
              >
                <PlayCircle size={18} />
                <span>
                  {enrolling
                    ? 'Enrolling...'
                    : isEnrolled
                      ? progressPercent > 0
                        ? `Continue Learning (${progressPercent}%)`
                        : 'Start Course Now'
                      : isFree
                        ? 'Enroll for Free'
                        : `Enroll via M-Pesa (KES ${course.price_kes})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* What You'll Learn Outcomes */}
      <section className="course-detail-section">
        <h3 className="course-detail-section-title">
          <Sparkles size={17} /> What You&apos;ll Learn
        </h3>
        <div className="course-detail-outcomes-grid">
          {outcomes.map((item, idx) => (
            <div key={idx} className="course-detail-outcome-item">
              <CheckCircle2 size={16} className="course-detail-outcome-icon" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Curriculum Accordion */}
      <section className="course-detail-section">
        <div className="course-detail-section-head">
          <h3 className="course-detail-section-title">
            <BookOpen size={17} /> Course Curriculum
          </h3>
          <span className="course-detail-section-sub">
            {modules.length} modules • {totalLessons} lessons
          </span>
        </div>

        <div className="course-detail-accordion">
          {modules.map((mod, mIdx) => {
            const modKey = mod.id || `mod-${mIdx}`;
            const isOpen = Boolean(openModuleIds[modKey]);
            return (
              <div key={modKey} className="course-detail-module-card">
                <button
                  type="button"
                  className="course-detail-module-trigger"
                  onClick={() =>
                    setOpenModuleIds((prev) => ({ ...prev, [modKey]: !prev[modKey] }))
                  }
                >
                  <div>
                    <strong>{mod.title}</strong>
                    <span>{(mod.lessons || []).length} lessons</span>
                  </div>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {isOpen && (
                  <div className="course-detail-module-lessons">
                    {(mod.lessons || []).map((les, lIdx) => {
                      const isDone = Boolean(course?.lesson_progress?.[les.id]?.completed);
                      const canOpenDirectly = isEnrolled || les.is_preview;
                      return (
                        <div key={les.id || lIdx} className="course-detail-lesson-row">
                          <div className="course-detail-lesson-left">
                            <span className="course-detail-lesson-icon">
                              {isDone ? (
                                <CheckCircle2 size={16} className="text-emerald-400" />
                              ) : (
                                getLessonIcon(les.kind, 16)
                              )}
                            </span>
                            <div>
                              <div className="course-detail-lesson-title">{les.title}</div>
                              <div className="course-detail-lesson-meta">
                                <span className="uppercase">{les.kind || 'video'}</span>
                                <span>•</span>
                                <span>{formatDurationSeconds(les.duration_seconds || 600)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="course-detail-lesson-right">
                            {les.is_preview && !isEnrolled && (
                              <button
                                type="button"
                                className="course-btn-preview"
                                onClick={() => setPreviewLesson(les)}
                              >
                                <Eye size={13} />
                                <span>Preview</span>
                              </button>
                            )}
                            {isEnrolled ? (
                              <button
                                type="button"
                                className="course-btn-secondary course-btn-sm"
                                onClick={() => onStartLearning?.(course, les.id)}
                              >
                                <span>{isDone ? 'Review' : 'Start'}</span>
                              </button>
                            ) : !les.is_preview ? (
                              <span className="course-detail-locked" title="Enroll to unlock">
                                <Lock size={14} />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Reviews & Ratings */}
      <section className="course-detail-section">
        <div className="course-detail-section-head">
          <h3 className="course-detail-section-title">
            <Star size={17} /> Student Reviews ({(course?.reviews || []).length})
          </h3>
        </div>

        <form onSubmit={handleSubmitReview} className="course-detail-review-form">
          <div className="course-detail-review-stars-picker">
            <span>Your Rating:</span>
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setReviewRating(num)}
                className="course-star-btn"
                aria-label={`Rate ${num} stars`}
              >
                <Star
                  size={18}
                  fill={num <= reviewRating ? '#fbbf24' : 'transparent'}
                  color="#fbbf24"
                />
              </button>
            ))}
          </div>
          <div className="course-detail-review-input-row">
            <input
              type="text"
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="Share how this course blessed or equipped you..."
              className="course-detail-review-input"
            />
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={submittingReview || !reviewBody.trim()}
              className="course-btn-primary"
            >
              <Send size={14} />
              <span>Post Review</span>
            </button>
          </div>
          {reviewNotice && <p className="course-detail-review-notice">{reviewNotice}</p>}
        </form>

        <div className="course-detail-reviews-list">
          {(course?.reviews || []).length === 0 ? (
            <p className="course-detail-empty-reviews">
              Be the first scholar to review this course!
            </p>
          ) : (
            (course.reviews || []).map((rev) => (
              <div key={rev.id} className="course-detail-review-card">
                <div className="course-detail-review-top">
                  <strong>{rev.reviewer_name || 'Shammah Scholar'}</strong>
                  <div className="course-detail-review-stars">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} size={13} fill="#fbbf24" color="#fbbf24" />
                    ))}
                  </div>
                </div>
                <p>{rev.body}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Free Preview Lesson Modal */}
      <PopupSheet
        isOpen={Boolean(previewLesson)}
        onClose={() => setPreviewLesson(null)}
        title={previewLesson ? `Free Preview: ${previewLesson.title}` : 'Lesson Preview'}
        maxWidth="640px"
      >
        {previewLesson && (
          <div className="course-preview-modal-body">
            {previewLesson.kind === 'video' ? (
              <video
                src={
                  previewLesson.media_url ||
                  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                }
                controls
                autoPlay
                playsInline
                className="course-learn-video-el"
              />
            ) : (
              <div className="course-preview-text">
                <p>{previewLesson.body_md || course.description}</p>
              </div>
            )}
            <div className="course-preview-cta">
              <button
                type="button"
                className="course-btn-primary"
                onClick={() => {
                  setPreviewLesson(null);
                  handlePrimaryAction();
                }}
              >
                <span>
                  {isFree
                    ? 'Enroll Free to Unlock Full Course'
                    : `Enroll Now (KES ${course.price_kes})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </PopupSheet>

      {/* M-Pesa Payment Modal for Paid Courses */}
      <MpesaPaymentModal
        isOpen={showMpesaModal}
        onClose={() => setShowMpesaModal(false)}
        project={{
          id: `course:${course?.id}`,
          title: course?.title,
          organizer: course?.instructor_name || course?.instructor || 'Shammah Academy'
        }}
        initialAmount={course?.price_kes || 500}
        tierLabel={`Course Enrollment: ${course?.title}`}
        session={session}
        onPaymentSuccess={handleMpesaSuccess}
      />

      {/* Certificate Modal */}
      <CourseCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        certificate={certificate}
        course={course}
        recipientName={userName}
      />
    </div>
  );
}
