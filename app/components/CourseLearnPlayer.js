'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Markdown from 'react-markdown';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Headphones,
  HelpCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  BookOpen,
  MessageSquare,
  StickyNote,
  Award,
  Sparkles,
  Check,
  Volume2,
  ExternalLink,
  Clock,
  Keyboard
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import CommentThread from './CommentThread';
import CourseCertificateModal from './CourseCertificateModal';
import {
  completeCourseLesson,
  saveLessonProgress,
  issueCourseCertificate,
  formatDurationSeconds
} from '../lib/data/coursesApi';
import { playSound } from '../lib/soundEffects';

function getLessonKindIcon(kind, size = 16) {
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

export default function CourseLearnPlayer({
  course,
  initialLessonId = null,
  session = null,
  userProfile = null,
  onBack,
  onCourseUpdated
}) {
  const userId = session?.user?.id || userProfile?.id || 'guest-scholar';
  const userName =
    userProfile?.full_name ||
    userProfile?.name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Shammah Scholar';

  const modules = useMemo(() => {
    if (Array.isArray(course?.modules) && course.modules.length > 0) {
      return course.modules;
    }
    return [
      {
        id: 'mod-default',
        title: 'Course Curriculum',
        position: 1,
        lessons: Array.isArray(course?.lessons)
          ? course.lessons.map((l, idx) => ({
              id: l.id || `les-${idx}`,
              title: l.title,
              kind: l.kind || l.type || 'video',
              duration_seconds: l.duration_seconds || 600,
              body_md: l.body_md || l.description || '',
              media_url: l.media_url || '',
              quiz_questions: l.quiz_questions || []
            }))
          : []
      }
    ];
  }, [course]);

  const flatLessons = useMemo(
    () =>
      modules.flatMap((mod, mIdx) =>
        (mod.lessons || []).map((les, lIdx) => ({
          ...les,
          moduleTitle: mod.title,
          moduleIndex: mIdx + 1,
          lessonNumber: lIdx + 1
        }))
      ),
    [modules]
  );

  const [lessonProgressMap, setLessonProgressMap] = useState(() => ({
    ...(course?.lesson_progress || {})
  }));

  const [activeLessonId, setActiveLessonId] = useState(() => {
    if (initialLessonId && flatLessons.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    // Resume first incomplete lesson
    const firstIncomplete = flatLessons.find(
      (l) => !course?.lesson_progress?.[l.id]?.completed
    );
    return firstIncomplete?.id || flatLessons[0]?.id || null;
  });

  const currentIndex = useMemo(
    () => Math.max(0, flatLessons.findIndex((l) => l.id === activeLessonId)),
    [flatLessons, activeLessonId]
  );
  const currentLesson = flatLessons[currentIndex] || flatLessons[0] || null;

  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('overview'); // overview | notes | qa
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  // Certificate state
  const [certificate, setCertificate] = useState(course?.certificate || null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const mediaRef = useRef(null);
  const textReaderRef = useRef(null);
  const lastSavedPosRef = useRef(0);

  // Sync notes & quiz state when switching lessons
  useEffect(() => {
    if (!currentLesson) return;
    const saved = lessonProgressMap[currentLesson.id];
    setNotesText(saved?.personal_notes || '');
    setNotesSavedAt(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(saved?.quiz_score ?? null);
    setReadingProgress(saved?.completed ? 100 : 25);
    lastSavedPosRef.current = Number(saved?.last_position_seconds || 0);
  }, [currentLesson?.id]);

  // Restore media playback resume position
  const handleLoadedMetadata = useCallback(() => {
    const el = mediaRef.current;
    if (!el || !currentLesson) return;
    const savedPos = Number(lessonProgressMap[currentLesson.id]?.last_position_seconds || 0);
    if (savedPos > 3 && savedPos < (el.duration || Infinity) - 5) {
      try {
        el.currentTime = savedPos;
      } catch {}
    }
  }, [currentLesson, lessonProgressMap]);

  // Save media resume position periodically
  const handleTimeUpdate = useCallback(() => {
    const el = mediaRef.current;
    if (!el || !currentLesson) return;
    const pos = Math.floor(el.currentTime || 0);
    if (Math.abs(pos - lastSavedPosRef.current) >= 10) {
      lastSavedPosRef.current = pos;
      setLessonProgressMap((prev) => ({
        ...prev,
        [currentLesson.id]: {
          ...(prev[currentLesson.id] || {}),
          last_position_seconds: pos
        }
      }));
      saveLessonProgress({
        courseId: course.id,
        lessonId: currentLesson.id,
        userId,
        positionSeconds: pos
      }).catch(() => {});
    }
  }, [course?.id, currentLesson, userId]);

  const completedCount = useMemo(
    () =>
      flatLessons.filter((l) => Boolean(lessonProgressMap[l.id]?.completed)).length,
    [flatLessons, lessonProgressMap]
  );
  const progressPercent = useMemo(
    () =>
      flatLessons.length > 0
        ? Math.round((completedCount / flatLessons.length) * 100)
        : 0,
    [completedCount, flatLessons.length]
  );

  const isCurrentCompleted = Boolean(
    currentLesson && lessonProgressMap[currentLesson.id]?.completed
  );

  const handleMarkComplete = useCallback(
    async (overrideQuizScore = null) => {
      if (!currentLesson || completing) return;
      setCompleting(true);
      const pos = Math.floor(mediaRef.current?.currentTime || lastSavedPosRef.current || 0);
      const finalScore = overrideQuizScore !== null ? overrideQuizScore : quizScore;

      // Optimistic update
      setLessonProgressMap((prev) => ({
        ...prev,
        [currentLesson.id]: {
          ...(prev[currentLesson.id] || {}),
          lesson_id: currentLesson.id,
          completed: true,
          last_position_seconds: pos,
          quiz_score: finalScore,
          personal_notes: notesText
        }
      }));

      try {
        playSound?.('confirm');
      } catch {}

      try {
        const res = await completeCourseLesson({
          courseId: course.id,
          lessonId: currentLesson.id,
          userId,
          userName,
          positionSeconds: pos,
          quizScore: finalScore,
          personalNotes: notesText
        });
        if (res?.certificate) {
          setCertificate(res.certificate);
          setShowCertificateModal(true);
        }
        onCourseUpdated?.(res);
      } catch {} finally {
        setCompleting(false);
      }
    },
    [
      completing,
      course?.id,
      currentLesson,
      notesText,
      onCourseUpdated,
      quizScore,
      userId,
      userName
    ]
  );

  const handleSaveNotes = async () => {
    if (!currentLesson) return;
    setNotesSaving(true);
    setLessonProgressMap((prev) => ({
      ...prev,
      [currentLesson.id]: {
        ...(prev[currentLesson.id] || {}),
        personal_notes: notesText
      }
    }));
    try {
      await saveLessonProgress({
        courseId: course.id,
        lessonId: currentLesson.id,
        userId,
        personalNotes: notesText
      });
      setNotesSavedAt(new Date());
    } catch {} finally {
      setNotesSaving(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (!currentLesson) return;
    const questions = currentLesson.quiz_questions || [];
    if (questions.length === 0) {
      handleMarkComplete(100);
      return;
    }
    let correct = 0;
    questions.forEach((q, idx) => {
      const qKey = q.id || idx;
      if (Number(quizAnswers[qKey]) === Number(q.correct_index)) {
        correct += 1;
      }
    });
    const score = Math.round((correct / questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    handleMarkComplete(score);
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

  const goPrevLesson = useCallback(() => {
    if (currentIndex > 0) {
      setActiveLessonId(flatLessons[currentIndex - 1].id);
    }
  }, [currentIndex, flatLessons]);

  const goNextLesson = useCallback(() => {
    if (currentIndex < flatLessons.length - 1) {
      setActiveLessonId(flatLessons[currentIndex + 1].id);
    }
  }, [currentIndex, flatLessons]);

  // Keyboard shortcuts: ArrowLeft (prev), ArrowRight (next), m (mark complete)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevLesson();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNextLesson();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleMarkComplete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrevLesson, goNextLesson, handleMarkComplete]);

  const renderCurriculumList = (onSelectClose = false) => (
    <div className="course-learn-curriculum-list">
      {modules.map((mod, mIdx) => (
        <div key={mod.id || mIdx} className="course-learn-module-group">
          <div className="course-learn-module-header">
            <span className="course-learn-module-title">{mod.title}</span>
            <span className="course-learn-module-count">
              {(mod.lessons || []).length} lessons
            </span>
          </div>
          <div className="course-learn-module-lessons">
            {(mod.lessons || []).map((les, lIdx) => {
              const isSelected = currentLesson?.id === les.id;
              const isDone = Boolean(lessonProgressMap[les.id]?.completed);
              return (
                <button
                  key={les.id || lIdx}
                  type="button"
                  onClick={() => {
                    setActiveLessonId(les.id);
                    if (onSelectClose) setMobileCurriculumOpen(false);
                  }}
                  className={`course-learn-lesson-btn ${isSelected ? 'is-active' : ''} ${
                    isDone ? 'is-completed' : ''
                  }`}
                >
                  <span className="course-learn-lesson-status">
                    {isDone ? (
                      <CheckCircle2 size={17} className="text-emerald-400" />
                    ) : (
                      <Circle size={17} />
                    )}
                  </span>
                  <div className="course-learn-lesson-info">
                    <span className="course-learn-lesson-name">{les.title}</span>
                    <span className="course-learn-lesson-meta">
                      {getLessonKindIcon(les.kind, 12)}
                      <span>{les.kind || 'video'}</span>
                      <span>•</span>
                      <span>{formatDurationSeconds(les.duration_seconds || 600)}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const accent = course?.accent || '#f59e0b';

  return (
    <div className="course-learn-shell" style={{ '--sec-color': accent }}>
      {/* Top Bar */}
      <header className="course-learn-topbar">
        <div className="course-learn-topbar-left">
          <button
            type="button"
            className="course-btn-icon"
            onClick={onBack}
            aria-label="Back to Course Overview"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="course-learn-topbar-titles">
            <span className="course-learn-topbar-eyebrow">{course?.category || 'Course'}</span>
            <h2 className="course-learn-topbar-title">{course?.title}</h2>
          </div>
        </div>

        <div className="course-learn-topbar-right">
          <div className="course-learn-progress-pill">
            <div className="course-learn-progress-bar">
              <div
                className="course-learn-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>
              {completedCount}/{flatLessons.length} ({progressPercent}%)
            </span>
          </div>

          {progressPercent === 100 && (
            <button
              type="button"
              className="course-btn-certificate"
              onClick={handleOpenCertificate}
            >
              <Award size={15} />
              <span>Certificate</span>
            </button>
          )}

          <button
            type="button"
            className="course-btn-secondary course-learn-mobile-drawer-btn"
            onClick={() => setMobileCurriculumOpen(true)}
            aria-label="Open Course Curriculum"
          >
            <ListChecks size={16} />
            <span>Syllabus</span>
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <div className="course-learn-grid">
        {/* Left Sidebar Curriculum (Desktop/Tablet) */}
        <aside className="course-learn-sidebar">
          <div className="course-learn-sidebar-head">
            <h3>Course Curriculum</h3>
            <span>
              {completedCount} of {flatLessons.length} completed
            </span>
          </div>
          {renderCurriculumList(false)}
        </aside>

        {/* Main Viewport Stage */}
        <section className="course-learn-main">
          {currentLesson ? (
            <>
              {/* Stage Area — adapts cleanly to any screen without cropping */}
              <div className="course-learn-stage-card">
                {currentLesson.kind === 'video' && (
                  <div className="course-learn-video-wrap">
                    <video
                      key={currentLesson.id}
                      ref={mediaRef}
                      src={
                        currentLesson.media_url ||
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                      }
                      poster={course?.cover_url || course?.image}
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => handleMarkComplete()}
                      className="course-learn-video-el"
                    />
                  </div>
                )}

                {currentLesson.kind === 'audio' && (
                  <div className="course-learn-audio-stage">
                    <div className="course-learn-audio-visual">
                      <div className="course-learn-audio-icon-ring">
                        <Volume2 size={36} />
                      </div>
                      <div>
                        <span className="course-learn-stage-badge">Audio Teaching</span>
                        <h3>{currentLesson.title}</h3>
                        <p>{course?.instructor_name || course?.instructor}</p>
                      </div>
                    </div>
                    <audio
                      key={currentLesson.id}
                      ref={mediaRef}
                      src={
                        currentLesson.media_url ||
                        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
                      }
                      controls
                      preload="metadata"
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => handleMarkComplete()}
                      className="course-learn-audio-el"
                    />
                  </div>
                )}

                {currentLesson.kind === 'text' && (
                  <div
                    ref={textReaderRef}
                    className="course-learn-text-stage"
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const maxScroll = el.scrollHeight - el.clientHeight;
                      if (maxScroll > 10) {
                        setReadingProgress(
                          Math.min(100, Math.max(15, Math.round((el.scrollTop / maxScroll) * 100)))
                        );
                      } else {
                        setReadingProgress(100);
                      }
                    }}
                  >
                    <div className="course-learn-reading-bar">
                      <span>Reading Progress</span>
                      <div className="course-learn-reading-track">
                        <div
                          className="course-learn-reading-fill"
                          style={{ width: `${readingProgress}%` }}
                        />
                      </div>
                      <span>{readingProgress}%</span>
                    </div>
                    <div className="markdown-body course-learn-markdown">
                      <Markdown>
                        {currentLesson.body_md ||
                          `### ${currentLesson.title}\n\nReflect on the scriptures in this module and record your key takeaways in the notes tab below.`}
                      </Markdown>
                    </div>
                  </div>
                )}

                {currentLesson.kind === 'download' && (
                  <div className="course-learn-download-stage">
                    <div className="course-learn-download-card">
                      <div className="course-learn-download-icon">
                        <Download size={32} />
                      </div>
                      <div className="course-learn-download-info">
                        <span className="course-learn-stage-badge">Downloadable Resource</span>
                        <h3>{currentLesson.title}</h3>
                        <p>
                           Save this study workbook or worksheet to your device for offline reflection and small-group discussion.
                        </p>
                        <div className="course-learn-download-actions">
                          <a
                            href={
                              currentLesson.media_url ||
                              'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="course-btn-primary"
                            onClick={() => {
                              if (!isCurrentCompleted) handleMarkComplete();
                            }}
                          >
                            <Download size={16} />
                            <span>Download Study PDF</span>
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    </div>
                    {currentLesson.body_md && (
                      <div className="markdown-body course-learn-markdown">
                        <Markdown>{currentLesson.body_md}</Markdown>
                      </div>
                    )}
                  </div>
                )}

                {currentLesson.kind === 'quiz' && (
                  <div className="course-learn-quiz-stage">
                    <div className="course-learn-quiz-header">
                      <div>
                        <span className="course-learn-stage-badge">
                          <Sparkles size={13} /> Knowledge Check
                        </span>
                        <h3>{currentLesson.title}</h3>
                      </div>
                      {quizScore !== null && (
                        <div className="course-learn-quiz-score-badge">
                          Score: <strong>{quizScore}%</strong>
                        </div>
                      )}
                    </div>

                    {(currentLesson.quiz_questions || []).length === 0 ? (
                      <p className="course-learn-quiz-empty">
                        Click &ldquo;Mark Complete&rdquo; below once you have reviewed the module concepts.
                      </p>
                    ) : (
                      <div className="course-learn-quiz-questions">
                        {(currentLesson.quiz_questions || []).map((q, qIdx) => {
                          const qKey = q.id || qIdx;
                          const selectedOpt = quizAnswers[qKey];
                          const options = Array.isArray(q.options) ? q.options : [];
                          return (
                            <div key={qKey} className="course-learn-quiz-qcard">
                              <p className="course-learn-quiz-qtitle">
                                {qIdx + 1}. {q.question}
                              </p>
                              <div className="course-learn-quiz-options">
                                {options.map((opt, oIdx) => {
                                  const isSelected = selectedOpt === oIdx;
                                  const isCorrect = Number(q.correct_index) === oIdx;
                                  let stateClass = '';
                                  if (quizSubmitted) {
                                    if (isCorrect) stateClass = 'is-correct';
                                    else if (isSelected && !isCorrect) stateClass = 'is-wrong';
                                  } else if (isSelected) {
                                    stateClass = 'is-selected';
                                  }
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      disabled={quizSubmitted}
                                      onClick={() =>
                                        setQuizAnswers((prev) => ({ ...prev, [qKey]: oIdx }))
                                      }
                                      className={`course-learn-quiz-opt ${stateClass}`}
                                    >
                                      <span className="course-learn-quiz-opt-letter">
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span className="course-learn-quiz-opt-text">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {quizSubmitted && q.explanation && (
                                <div className="course-learn-quiz-explanation">
                                  <strong>Explanation:</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="course-learn-quiz-footer">
                          {!quizSubmitted ? (
                            <button
                              type="button"
                              className="course-btn-primary"
                              onClick={handleSubmitQuiz}
                            >
                              <CheckCircle2 size={16} />
                              <span>Submit Answers & Complete Lesson</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="course-btn-secondary"
                              onClick={() => {
                                setQuizSubmitted(false);
                                setQuizAnswers({});
                              }}
                            >
                              Retry Quiz
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lesson Controls Bar */}
              <div className="course-learn-controls-bar">
                <div className="course-learn-lesson-headline">
                  <span className="course-learn-module-tag">{currentLesson.moduleTitle}</span>
                  <h1>{currentLesson.title}</h1>
                </div>

                <div className="course-learn-nav-buttons">
                  <button
                    type="button"
                    className="course-btn-secondary"
                    disabled={currentIndex <= 0}
                    onClick={goPrevLesson}
                    aria-label="Previous Lesson"
                  >
                    <ChevronLeft size={16} />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    className={`course-btn-complete ${isCurrentCompleted ? 'is-done' : ''}`}
                    onClick={() => handleMarkComplete()}
                    disabled={completing}
                  >
                    <CheckCircle2 size={16} />
                    <span>{isCurrentCompleted ? 'Completed' : 'Mark Complete'}</span>
                  </button>

                  <button
                    type="button"
                    className="course-btn-primary"
                    disabled={currentIndex >= flatLessons.length - 1}
                    onClick={goNextLesson}
                    aria-label="Next Lesson"
                  >
                    <span>Next Lesson</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs: Lesson Notes, Personal Notes, Q&A Discussion */}
              <div className="course-learn-tabs-card">
                <div className="course-learn-tabs-header">
                  <button
                    type="button"
                    className={`course-learn-tab-btn ${activeBottomTab === 'overview' ? 'is-active' : ''}`}
                    onClick={() => setActiveBottomTab('overview')}
                  >
                    <BookOpen size={15} />
                    <span>Lesson Guide</span>
                  </button>
                  <button
                    type="button"
                    className={`course-learn-tab-btn ${activeBottomTab === 'notes' ? 'is-active' : ''}`}
                    onClick={() => setActiveBottomTab('notes')}
                  >
                    <StickyNote size={15} />
                    <span>My Notes</span>
                  </button>
                  <button
                    type="button"
                    className={`course-learn-tab-btn ${activeBottomTab === 'qa' ? 'is-active' : ''}`}
                    onClick={() => setActiveBottomTab('qa')}
                  >
                    <MessageSquare size={15} />
                    <span>Lesson Q&amp;A</span>
                  </button>

                  <span className="course-learn-shortcut-hint">
                    <Keyboard size={13} /> Shortcuts: ← Prev · → Next · M Complete
                  </span>
                </div>

                <div className="course-learn-tab-content">
                  {activeBottomTab === 'overview' && (
                    <div className="markdown-body course-learn-markdown">
                      <Markdown>
                        {currentLesson.body_md ||
                          `### ${currentLesson.title}\n\nTake time to reflect on the scriptures shared in this lesson and discuss how they apply to your daily walk in the Lesson Q&A tab.`}
                      </Markdown>
                    </div>
                  )}

                  {activeBottomTab === 'notes' && (
                    <div className="course-learn-notes-box">
                      <div className="course-learn-notes-head">
                        <span>
                          Private study notes for <strong>{currentLesson.title}</strong> (synced to your account)
                        </span>
                        {notesSavedAt && (
                          <span className="course-learn-notes-saved">
                            <Check size={13} /> Saved
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={5}
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Write down scriptures, prayer points, or personal reflections from this lesson..."
                        className="course-learn-notes-textarea"
                      />
                      <div className="course-learn-notes-actions">
                        <button
                          type="button"
                          className="course-btn-primary"
                          onClick={handleSaveNotes}
                          disabled={notesSaving}
                        >
                          <Check size={15} />
                          <span>{notesSaving ? 'Saving...' : 'Save Notes'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeBottomTab === 'qa' && (
                    <div className="course-learn-qa-wrap">
                      <CommentThread
                        mediaId={currentLesson.id}
                        session={session}
                        postAuthorName={course?.instructor_name || course?.instructor}
                        profile={userProfile}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="course-learn-empty">No lessons found for this course.</div>
          )}
        </section>
      </div>

      {/* Mobile Curriculum Drawer via PopupSheet */}
      <PopupSheet
        isOpen={mobileCurriculumOpen}
        onClose={() => setMobileCurriculumOpen(false)}
        title="Course Syllabus"
        maxWidth="480px"
      >
        <div style={{ padding: '8px 0' }}>{renderCurriculumList(true)}</div>
      </PopupSheet>

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
