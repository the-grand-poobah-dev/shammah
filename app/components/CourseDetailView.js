'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Loader2, Phone } from 'lucide-react';
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
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentCheckoutId, setPaymentCheckoutId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentError, setPaymentError] = useState('');

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

  const handleStartCoursePayment = async (event) => {
    event.preventDefault();
    setPaymentError('');
    setPaymentStatus('sending');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Please sign in before purchasing this course.');
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: course.id, phone: paymentPhone.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not initiate M-Pesa payment.');
      if (!result.checkoutRequestId) throw new Error('M-Pesa did not return a checkout reference.');
      setPaymentCheckoutId(result.checkoutRequestId);
      setPaymentStatus('pending');
    } catch (error) {
      setPaymentStatus('failed');
      setPaymentError(error?.message || 'Could not initiate payment.');
    }
  };

  useEffect(() => {
    if (!showMpesaModal || !paymentCheckoutId || !['pending', 'processing'].includes(paymentStatus)) return undefined;
    let cancelled = false;
    let timer;
    let attempts = 0;
    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('Please sign in again to check payment status.');
        const response = await fetch(`/api/mpesa/course-status?checkoutRequestId=${encodeURIComponent(paymentCheckoutId)}`, {
          headers: { Authorization: `Bearer ${token} ` },
          cache: 'no-store'
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not check payment status.');
        if (cancelled) return;
        if (result.status === 'completed') {
          try {
            await enrollInCourse({ courseId: course.id, userId, userName });
            const updated = { ...course, enrolled: true, paid: true };
            setCourse(updated);
            onCourseUpdated?.(updated);
            setPaymentStatus('success');
            setShowMpesaModal(false);
            onStartLearning?.(updated, null);
          } catch (error) {
            setPaymentStatus('processing');
            setPaymentError(error?.message || 'Payment confirmed; refreshing enrollment failed. Please reopen the course.');
          }
          return;
        }
        if (result.status === 'failed') {
          setPaymentStatus('failed');
          setPaymentError('M-Pesa did not confirm the payment. You can try again.');
          return;
        }
      } catch (error) {
        if (attempts >= 60) {
          setPaymentStatus('processing');
          setPaymentError(error?.message || 'Payment is still processing. Check the course again shortly.');
          return;
        }
      }
      if (!cancelled && attempts < 60) timer = setTimeout(poll, 3000);
      else if (!cancelled) {
        setPaymentStatus('processing');
        setPaymentError('Payment is still pending. Check the course again shortly.');
      }
    };
    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [showMpesaModal, paymentCheckoutId, paymentStatus, course, userId, userName, onCourseUpdated, onStartLearning]);

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
        let refreshed = null;
        if (res.rating_avg == null || res.rating_count == null) {
          try { refreshed = await getCourseDetail(course.id, userId); } catch {}
        }
        const existingReviewIndex = (course.reviews || []).findIndex((review) => review.user_id === res.review.user_id);
        const currentReviews = [...(course.reviews || [])];
        if (existingReviewIndex >= 0) currentReviews.splice(existingReviewIndex, 1);
        const updated = {
          ...course,
          ...(refreshed || {}),
          rating_avg: res.rating_avg ?? refreshed?.rating_avg ?? course.rating_avg ?? 0,
          rating_count: res.rating_count ?? refreshed?.rating_count ?? course.rating_count ?? 0,
          reviews: [res.review, ...currentReviews]
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
              <strong>{Number(course?.rating_avg ?? course?.rating ?? 0).toFixed(2)}</strong>
              <span>({Number(course?.rating_count ?? 0).toLocaleString()} reviews)</span>
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
      {showMpesaModal && (
        <div className="author-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="course-payment-heading" onClick={() => setShowMpesaModal(false)}>
          <div className="inst-profile-modal-card" style={{ maxWidth: 460 }} onClick={(event) => event.stopPropagation()}>
            <div className="inst-modal-header">
              <div>
                <h3 id="course-payment-heading" className="text-base font-bold">Course payment</h3>
                <p className="text-xs text-gray-400">{course?.title}</p>
              </div>
              <button type="button" className="inst-modal-close" onClick={() => setShowMpesaModal(false)} aria-label="Close payment dialog">×</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xl font-bold">KES {Number(course?.price_kes || 0).toLocaleString()}</p>
              {['idle', 'sending', 'failed'].includes(paymentStatus) ? (
                <form onSubmit={handleStartCoursePayment} className="space-y-3">
                  <label htmlFor="course-payment-phone" className="block text-sm">Safaricom M-Pesa phone number</label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/20 p-3">
                    <Phone size={16} aria-hidden="true" />
                    <input id="course-payment-phone" type="tel" required value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} placeholder="0712 345 678" className="w-full bg-transparent outline-none" />
                  </div>
                  {paymentError && <p role="alert" className="text-sm text-rose-400">{paymentError}</p>}
                  <button type="submit" disabled={paymentStatus === 'sending'} className="w-full rounded-xl bg-emerald-500 p-3 font-bold text-black">
                    {paymentStatus === 'sending' ? 'Sending prompt…' : 'Send M-Pesa prompt'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 text-center">
                  <Loader2 size={28} className="mx-auto animate-spin" />
                  <p>{paymentStatus === 'success' ? 'Payment confirmed.' : 'Waiting for Safaricom confirmation…'}</p>
                  {paymentError && <p role="status" className="text-sm text-amber-300">{paymentError}</p>}
                  <button type="button" onClick={() => setShowMpesaModal(false)} className="rounded-xl border border-white/20 px-4 py-2">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
