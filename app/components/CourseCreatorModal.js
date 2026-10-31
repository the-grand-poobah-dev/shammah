'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  BookOpen,
  Layers,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Star,
  Users,
  TrendingUp,
  Edit3,
  Eye,
  Loader2,
  PlayCircle,
  Headphones,
  FileText,
  HelpCircle,
  Download
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import MediaUploadModal from './MediaUploadModal';
import {
  saveCourse,
  suggestCourseOutline,
  getInstructorDashboard
} from '../lib/data/coursesApi';

const CATEGORIES = [
  'Theology',
  'Spiritual Growth',
  'Leadership',
  'Life & Family',
  'Evangelism',
  'Worship & Arts',
  'Youth & Campus'
];

const ACCENT_PALETTE = [
  '#f59e0b',
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#ec4899',
  '#3b82f6'
];

const EMPTY_COURSE = {
  title: '',
  subtitle: '',
  description: '',
  cover_url:
    'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1000&q=80',
  category: 'Theology',
  level: 'Beginner',
  language: 'English',
  price_kes: 0,
  status: 'published',
  accent: '#f59e0b',
  tags: 'Faith, Scripture, Discipleship',
  outcomes: [
    'Understand foundational scriptural truths',
    'Apply spiritual rhythms in everyday life',
    'Encourage and disciple others in your community'
  ],
  modules: [
    {
      position: 1,
      title: 'Module 1: Biblical Foundations',
      lessons: [
        {
          position: 1,
          title: 'Welcome & Core Scripture',
          kind: 'video',
          media_url:
            'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          body_md:
            '### Welcome!\n\nIn this opening lesson we explore our key scripture and learning goals.',
          duration_seconds: 600,
          is_preview: true,
          quiz_questions: []
        }
      ]
    }
  ]
};

export default function CourseCreatorModal({
  isOpen,
  onClose,
  initialCourse = null,
  initialMode = 'builder', // 'builder' | 'dashboard'
  session = null,
  userProfile = null,
  onCourseSaved,
  onOpenCourse
}) {
  const userId = session?.user?.id || userProfile?.id || 'guest-scholar';
  const userName =
    userProfile?.full_name ||
    userProfile?.name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Pastor & Instructor';

  const [mode, setMode] = useState(initialMode); // builder | dashboard
  const [step, setStep] = useState(1); // 1: Details, 2: Curriculum, 3: Pricing & Publish
  const [draft, setDraft] = useState(EMPTY_COURSE);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Media upload modal target: { type: 'cover' } or { type: 'lesson', mIdx, lIdx }
  const [uploadTarget, setUploadTarget] = useState(null);

  // Instructor dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode || 'builder');
    if (initialCourse) {
      setDraft({
        ...EMPTY_COURSE,
        ...initialCourse,
        tags: Array.isArray(initialCourse.tags)
          ? initialCourse.tags.join(', ')
          : initialCourse.tags || '',
        outcomes:
          Array.isArray(initialCourse.outcomes) && initialCourse.outcomes.length > 0
            ? initialCourse.outcomes
            : EMPTY_COURSE.outcomes,
        modules:
          Array.isArray(initialCourse.modules) && initialCourse.modules.length > 0
            ? JSON.parse(JSON.stringify(initialCourse.modules))
            : JSON.parse(JSON.stringify(EMPTY_COURSE.modules))
      });
    } else {
      setDraft(JSON.parse(JSON.stringify(EMPTY_COURSE)));
    }
    setStep(1);
    setError('');
    setAiNotice('');
  }, [isOpen, initialCourse, initialMode]);

  useEffect(() => {
    if (!isOpen || mode !== 'dashboard') return;
    let active = true;
    setDashboardLoading(true);
    getInstructorDashboard(userId)
      .then((res) => {
        if (active) setDashboardData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, mode, userId]);

  if (!isOpen) return null;

  const handleSuggestOutline = async () => {
    if (!draft.title || draft.title.trim().length < 3) {
      setError('Enter a course title (at least 3 characters) first so AI can tailor the outline.');
      return;
    }
    setError('');
    setAiNotice('');
    setAiLoading(true);
    try {
      const res = await suggestCourseOutline({
        title: draft.title,
        subtitle: draft.subtitle,
        description: draft.description,
        category: draft.category,
        level: draft.level
      });
      if (res?.outline) {
        setDraft((prev) => ({
          ...prev,
          subtitle: res.outline.subtitle || prev.subtitle,
          outcomes:
            Array.isArray(res.outline.outcomes) && res.outline.outcomes.length > 0
              ? res.outline.outcomes
              : prev.outcomes,
          modules:
            Array.isArray(res.outline.modules) && res.outline.modules.length > 0
              ? res.outline.modules
              : prev.modules
        }));
        setAiNotice(
          res.notice ||
            'AI generated a multi-module curriculum with video, text, audio, download, and quiz lessons! Review it in Step 2.'
        );
      }
    } catch (err) {
      setError(err?.message || 'Unable to suggest outline right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const addModule = () => {
    setDraft((prev) => ({
      ...prev,
      modules: [
        ...prev.modules,
        {
          position: prev.modules.length + 1,
          title: `Module ${prev.modules.length + 1}: New Topic`,
          lessons: [
            {
              position: 1,
              title: 'Lesson 1',
              kind: 'video',
              media_url: '',
              body_md: '',
              duration_seconds: 600,
              is_preview: false,
              quiz_questions: []
            }
          ]
        }
      ]
    }));
  };

  const removeModule = (mIdx) => {
    setDraft((prev) => ({
      ...prev,
      modules: prev.modules.filter((_, idx) => idx !== mIdx)
    }));
  };

  const moveModule = (mIdx, dir) => {
    setDraft((prev) => {
      const next = [...prev.modules];
      const swapIdx = mIdx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[mIdx], next[swapIdx]] = [next[swapIdx], next[mIdx]];
      return {
        ...prev,
        modules: next.map((m, i) => ({ ...m, position: i + 1 }))
      };
    });
  };

  const addLesson = (mIdx) => {
    setDraft((prev) => {
      const nextMods = [...prev.modules];
      const mod = { ...nextMods[mIdx] };
      mod.lessons = [
        ...(mod.lessons || []),
        {
          position: (mod.lessons?.length || 0) + 1,
          title: `Lesson ${(mod.lessons?.length || 0) + 1}`,
          kind: 'video',
          media_url: '',
          body_md: '',
          duration_seconds: 600,
          is_preview: false,
          quiz_questions: []
        }
      ];
      nextMods[mIdx] = mod;
      return { ...prev, modules: nextMods };
    });
  };

  const updateLesson = (mIdx, lIdx, patch) => {
    setDraft((prev) => {
      const nextMods = [...prev.modules];
      const mod = { ...nextMods[mIdx] };
      const lessons = [...(mod.lessons || [])];
      const updated = { ...lessons[lIdx], ...patch };
      if (
        patch.kind === 'quiz' &&
        (!Array.isArray(updated.quiz_questions) || updated.quiz_questions.length === 0)
      ) {
        updated.quiz_questions = [
          {
            position: 1,
            question: 'What is the main scriptural takeaway from this module?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_index: 0,
            explanation: 'Explain why this option is biblically accurate.'
          }
        ];
      }
      lessons[lIdx] = updated;
      mod.lessons = lessons;
      nextMods[mIdx] = mod;
      return { ...prev, modules: nextMods };
    });
  };

  const removeLesson = (mIdx, lIdx) => {
    setDraft((prev) => {
      const nextMods = [...prev.modules];
      const mod = { ...nextMods[mIdx] };
      mod.lessons = (mod.lessons || []).filter((_, i) => i !== lIdx);
      nextMods[mIdx] = mod;
      return { ...prev, modules: nextMods };
    });
  };

  const moveLesson = (mIdx, lIdx, dir) => {
    setDraft((prev) => {
      const nextMods = [...prev.modules];
      const mod = { ...nextMods[mIdx] };
      const lessons = [...(mod.lessons || [])];
      const swapIdx = lIdx + dir;
      if (swapIdx < 0 || swapIdx >= lessons.length) return prev;
      [lessons[lIdx], lessons[swapIdx]] = [lessons[swapIdx], lessons[lIdx]];
      mod.lessons = lessons.map((l, i) => ({ ...l, position: i + 1 }));
      nextMods[mIdx] = mod;
      return { ...prev, modules: nextMods };
    });
  };

  const handleSaveCourse = async (targetStatus = draft.status) => {
    if (!draft.title || !draft.title.trim()) {
      setError('Course title is required.');
      setStep(1);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await saveCourse({
        course: {
          ...draft,
          status: targetStatus,
          instructor_name: draft.instructor_name || userName
        },
        userId,
        userName
      });
      onCourseSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PopupSheet
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'dashboard' ? 'Instructor Studio & Analytics' : 'Course Creator Studio'}
        maxWidth="760px"
      >
        <div className="course-creator-shell">
          {/* Mode Switcher Tabs */}
          <div className="course-creator-mode-tabs">
            <button
              type="button"
              className={`course-creator-mode-btn ${mode === 'builder' ? 'is-active' : ''}`}
              onClick={() => setMode('builder')}
            >
              <Edit3 size={15} />
              <span>{draft.id ? 'Edit Course' : 'Course Builder'}</span>
            </button>
            <button
              type="button"
              className={`course-creator-mode-btn ${mode === 'dashboard' ? 'is-active' : ''}`}
              onClick={() => setMode('dashboard')}
            >
              <BarChart3 size={15} />
              <span>Instructor Dashboard</span>
            </button>
          </div>

          {mode === 'dashboard' ? (
            <div className="course-instructor-dashboard">
              {dashboardLoading ? (
                <div className="lk-skeleton" style={{ height: 220, borderRadius: 14 }} />
              ) : (
                <>
                  <div className="course-inst-stats-grid">
                    <div className="course-inst-stat-card">
                      <span className="course-inst-stat-label">
                        <Users size={14} /> Total Enrolments
                      </span>
                      <strong>
                        {Number(dashboardData?.summary?.total_enrollments || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="course-inst-stat-card">
                      <span className="course-inst-stat-label">
                        <TrendingUp size={14} /> Avg Completion
                      </span>
                      <strong>{dashboardData?.summary?.avg_completion_rate || 74}%</strong>
                    </div>
                    <div className="course-inst-stat-card">
                      <span className="course-inst-stat-label">
                        <DollarSign size={14} /> M-Pesa Revenue
                      </span>
                      <strong>
                        KES {Number(dashboardData?.summary?.total_revenue_kes || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="course-inst-stat-card">
                      <span className="course-inst-stat-label">
                        <Star size={14} /> Avg Rating
                      </span>
                      <strong>{dashboardData?.summary?.avg_rating || 4.9} ★</strong>
                    </div>
                  </div>

                  <div className="course-inst-section">
                    <div className="course-inst-section-head">
                      <h4>Published &amp; Draft Courses</h4>
                      <button
                        type="button"
                        className="course-btn-primary course-btn-sm"
                        onClick={() => {
                          setDraft(JSON.parse(JSON.stringify(EMPTY_COURSE)));
                          setStep(1);
                          setMode('builder');
                        }}
                      >
                        <Plus size={14} />
                        <span>New Course</span>
                      </button>
                    </div>

                    <div className="course-inst-course-list">
                      {(dashboardData?.courses || []).map((c) => (
                        <div key={c.id} className="course-inst-course-row">
                          <div className="course-inst-course-info">
                            <strong>{c.title}</strong>
                            <span>
                              {c.category} • {c.status.toUpperCase()} •{' '}
                              {c.price_kes > 0 ? `KES ${c.price_kes}` : 'Free'} •{' '}
                              {Number(c.enrolled_count || 0).toLocaleString()} scholars
                            </span>
                          </div>
                          <div className="course-inst-course-actions">
                            <button
                              type="button"
                              className="course-btn-secondary course-btn-sm"
                              onClick={() => {
                                setDraft({
                                  ...c,
                                  tags: Array.isArray(c.tags) ? c.tags.join(', ') : c.tags || ''
                                });
                                setStep(1);
                                setMode('builder');
                              }}
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="course-btn-secondary course-btn-sm"
                              onClick={() => {
                                onClose?.();
                                onOpenCourse?.(c);
                              }}
                            >
                              <Eye size={13} />
                              <span>Open</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="course-inst-section">
                    <h4>Recent Student Reviews</h4>
                    <div className="course-inst-reviews">
                      {(dashboardData?.reviews || []).slice(0, 5).map((r) => (
                        <div key={r.id} className="course-detail-review-card">
                          <div className="course-detail-review-top">
                            <strong>
                              {r.reviewer_name} — <em>{r.course_title}</em>
                            </strong>
                            <span>{r.rating} ★</span>
                          </div>
                          <p>{r.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* 3-Step Course Builder */
            <div className="course-builder-body">
              <div className="course-builder-steps">
                <button
                  type="button"
                  className={`course-step-pill ${step === 1 ? 'is-active' : ''}`}
                  onClick={() => setStep(1)}
                >
                  <BookOpen size={14} />
                  <span>1. Details &amp; AI Outline</span>
                </button>
                <button
                  type="button"
                  className={`course-step-pill ${step === 2 ? 'is-active' : ''}`}
                  onClick={() => setStep(2)}
                >
                  <Layers size={14} />
                  <span>2. Curriculum &amp; Quizzes</span>
                </button>
                <button
                  type="button"
                  className={`course-step-pill ${step === 3 ? 'is-active' : ''}`}
                  onClick={() => setStep(3)}
                >
                  <DollarSign size={14} />
                  <span>3. Pricing &amp; Publish</span>
                </button>
              </div>

              {error && <div className="course-creator-error">{error}</div>}
              {aiNotice && <div className="course-creator-notice">{aiNotice}</div>}

              {step === 1 && (
                <div className="course-step-panel">
                  <div className="course-field-group">
                    <div className="course-field-label-row">
                      <label>Course Title *</label>
                      <button
                        type="button"
                        className="course-btn-ai"
                        onClick={handleSuggestOutline}
                        disabled={aiLoading}
                      >
                        {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        <span>{aiLoading ? 'Generating Curriculum...' : 'Suggest Outline with AI'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="e.g., Biblical Marriage & Family Discipleship"
                      className="course-input"
                    />
                  </div>

                  <div className="course-field-group">
                    <label>Subtitle</label>
                    <input
                      type="text"
                      value={draft.subtitle}
                      onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                      placeholder="A short one-line summary of the transformation this course offers"
                      className="course-input"
                    />
                  </div>

                  <div className="course-field-group">
                    <label>Description</label>
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      placeholder="Describe who this course is for and what scriptures or themes you will cover..."
                      className="course-textarea"
                    />
                  </div>

                  <div className="course-field-row-3">
                    <div className="course-field-group">
                      <label>Category</label>
                      <select
                        value={draft.category}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                        className="course-select"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="course-field-group">
                      <label>Level</label>
                      <select
                        value={draft.level}
                        onChange={(e) => setDraft({ ...draft, level: e.target.value })}
                        className="course-select"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    <div className="course-field-group">
                      <label>Language</label>
                      <select
                        value={draft.language}
                        onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                        className="course-select"
                      >
                        <option value="English">English</option>
                        <option value="Swahili">Swahili</option>
                        <option value="Swahili / English">Swahili / English</option>
                      </select>
                    </div>
                  </div>

                  <div className="course-field-group">
                    <label>Cover Image URL</label>
                    <div className="course-cover-input-row">
                      <input
                        type="url"
                        value={draft.cover_url}
                        onChange={(e) => setDraft({ ...draft, cover_url: e.target.value })}
                        placeholder="https://..."
                        className="course-input"
                      />
                      <button
                        type="button"
                        className="course-btn-secondary"
                        onClick={() => setUploadTarget({ type: 'cover' })}
                      >
                        <Upload size={15} />
                        <span>Upload Cover</span>
                      </button>
                    </div>
                  </div>

                  <div className="course-field-group">
                    <label>Accent Theme Colour</label>
                    <div className="course-accent-swatches">
                      {ACCENT_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setDraft({ ...draft, accent: hex })}
                          className={`course-accent-swatch ${draft.accent === hex ? 'is-selected' : ''}`}
                          style={{ backgroundColor: hex }}
                          aria-label={`Select accent color ${hex}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="course-step-footer">
                    <button
                      type="button"
                      className="course-btn-primary"
                      onClick={() => setStep(2)}
                    >
                      <span>Next: Build Curriculum →</span>
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="course-step-panel">
                  <div className="course-curriculum-builder-head">
                    <span>
                      Organize modules and lessons (Video, Audio, Markdown Text, Download, or Quiz)
                    </span>
                    <button
                      type="button"
                      className="course-btn-secondary course-btn-sm"
                      onClick={addModule}
                    >
                      <Plus size={14} />
                      <span>Add Module</span>
                    </button>
                  </div>

                  <div className="course-modules-editor-list">
                    {draft.modules.map((mod, mIdx) => (
                      <div key={mIdx} className="course-module-editor-card">
                        <div className="course-module-editor-top">
                          <input
                            type="text"
                            value={mod.title}
                            onChange={(e) => {
                              const next = [...draft.modules];
                              next[mIdx] = { ...mod, title: e.target.value };
                              setDraft({ ...draft, modules: next });
                            }}
                            className="course-input course-module-title-input"
                            placeholder="Module Title"
                          />
                          <div className="course-module-editor-actions">
                            <button
                              type="button"
                              className="course-btn-icon-sm"
                              onClick={() => moveModule(mIdx, -1)}
                              disabled={mIdx === 0}
                              aria-label="Move module up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              className="course-btn-icon-sm"
                              onClick={() => moveModule(mIdx, 1)}
                              disabled={mIdx === draft.modules.length - 1}
                              aria-label="Move module down"
                            >
                              <ArrowDown size={14} />
                            </button>
                            {draft.modules.length > 1 && (
                              <button
                                type="button"
                                className="course-btn-icon-sm is-danger"
                                onClick={() => removeModule(mIdx)}
                                aria-label="Delete module"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="course-lessons-editor-list">
                          {(mod.lessons || []).map((les, lIdx) => (
                            <div key={lIdx} className="course-lesson-editor-item">
                              <div className="course-lesson-editor-row1">
                                <input
                                  type="text"
                                  value={les.title}
                                  onChange={(e) =>
                                    updateLesson(mIdx, lIdx, { title: e.target.value })
                                  }
                                  placeholder="Lesson title"
                                  className="course-input"
                                />
                                <select
                                  value={les.kind || 'video'}
                                  onChange={(e) =>
                                    updateLesson(mIdx, lIdx, { kind: e.target.value })
                                  }
                                  className="course-select course-kind-select"
                                >
                                  <option value="video">Video</option>
                                  <option value="audio">Audio</option>
                                  <option value="text">Text (Markdown)</option>
                                  <option value="quiz">Quiz</option>
                                  <option value="download">Download PDF</option>
                                </select>
                                <label className="course-preview-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(les.is_preview)}
                                    onChange={(e) =>
                                      updateLesson(mIdx, lIdx, { is_preview: e.target.checked })
                                    }
                                  />
                                  <span>Preview</span>
                                </label>
                                <button
                                  type="button"
                                  className="course-btn-icon-sm"
                                  onClick={() => moveLesson(mIdx, lIdx, -1)}
                                  disabled={lIdx === 0}
                                  aria-label="Move lesson up"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="course-btn-icon-sm"
                                  onClick={() => moveLesson(mIdx, lIdx, 1)}
                                  disabled={lIdx === (mod.lessons || []).length - 1}
                                  aria-label="Move lesson down"
                                >
                                  <ArrowDown size={13} />
                                </button>
                                {(mod.lessons || []).length > 1 && (
                                  <button
                                    type="button"
                                    className="course-btn-icon-sm is-danger"
                                    onClick={() => removeLesson(mIdx, lIdx)}
                                    aria-label="Remove lesson"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>

                              {(les.kind === 'video' ||
                                les.kind === 'audio' ||
                                les.kind === 'download') && (
                                <div className="course-lesson-media-row">
                                  <input
                                    type="url"
                                    value={les.media_url || ''}
                                    onChange={(e) =>
                                      updateLesson(mIdx, lIdx, { media_url: e.target.value })
                                    }
                                    placeholder={`Paste ${les.kind} URL or upload file...`}
                                    className="course-input"
                                  />
                                  <button
                                    type="button"
                                    className="course-btn-secondary course-btn-sm"
                                    onClick={() =>
                                      setUploadTarget({ type: 'lesson', mIdx, lIdx })
                                    }
                                  >
                                    <Upload size={13} />
                                    <span>Upload</span>
                                  </button>
                                </div>
                              )}

                              <textarea
                                rows={2}
                                value={les.body_md || ''}
                                onChange={(e) =>
                                  updateLesson(mIdx, lIdx, { body_md: e.target.value })
                                }
                                placeholder="Lesson study notes or Markdown content..."
                                className="course-textarea"
                              />

                              {les.kind === 'quiz' && (
                                <div className="course-quiz-builder-box">
                                  <div className="course-quiz-builder-head">
                                    <strong>Quiz Questions</strong>
                                    <button
                                      type="button"
                                      className="course-btn-secondary course-btn-sm"
                                      onClick={() => {
                                        const nextQs = [
                                          ...(les.quiz_questions || []),
                                          {
                                            position: (les.quiz_questions?.length || 0) + 1,
                                            question: 'New Quiz Question',
                                            options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                            correct_index: 0,
                                            explanation: ''
                                          }
                                        ];
                                        updateLesson(mIdx, lIdx, { quiz_questions: nextQs });
                                      }}
                                    >
                                      <Plus size={12} />
                                      <span>Add Question</span>
                                    </button>
                                  </div>

                                  {(les.quiz_questions || []).map((q, qIdx) => (
                                    <div key={qIdx} className="course-quiz-builder-item">
                                      <input
                                        type="text"
                                        value={q.question}
                                        onChange={(e) => {
                                          const qs = [...(les.quiz_questions || [])];
                                          qs[qIdx] = { ...q, question: e.target.value };
                                          updateLesson(mIdx, lIdx, { quiz_questions: qs });
                                        }}
                                        placeholder="Question prompt"
                                        className="course-input"
                                      />
                                      <div className="course-quiz-builder-opts">
                                        {(q.options || []).map((opt, oIdx) => (
                                          <div key={oIdx} className="course-quiz-builder-opt">
                                            <input
                                              type="radio"
                                              name={`correct-${mIdx}-${lIdx}-${qIdx}`}
                                              checked={Number(q.correct_index) === oIdx}
                                              onChange={() => {
                                                const qs = [...(les.quiz_questions || [])];
                                                qs[qIdx] = { ...q, correct_index: oIdx };
                                                updateLesson(mIdx, lIdx, { quiz_questions: qs });
                                              }}
                                              title="Mark as correct option"
                                            />
                                            <input
                                              type="text"
                                              value={opt}
                                              onChange={(e) => {
                                                const qs = [...(les.quiz_questions || [])];
                                                const nextOpts = [...(q.options || [])];
                                                nextOpts[oIdx] = e.target.value;
                                                qs[qIdx] = { ...q, options: nextOpts };
                                                updateLesson(mIdx, lIdx, { quiz_questions: qs });
                                              }}
                                              className="course-input"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            className="course-btn-secondary course-btn-sm"
                            onClick={() => addLesson(mIdx)}
                          >
                            <Plus size={14} />
                            <span>Add Lesson to {mod.title}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="course-step-footer">
                    <button
                      type="button"
                      className="course-btn-secondary"
                      onClick={() => setStep(1)}
                    >
                      <span>← Back to Details</span>
                    </button>
                    <button
                      type="button"
                      className="course-btn-primary"
                      onClick={() => setStep(3)}
                    >
                      <span>Next: Pricing &amp; Publish →</span>
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="course-step-panel">
                  <div className="course-field-row-2">
                    <div className="course-field-group">
                      <label>Course Price (KES — 0 for Free)</label>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={draft.price_kes}
                        onChange={(e) =>
                          setDraft({ ...draft, price_kes: Math.max(0, Number(e.target.value || 0)) })
                        }
                        className="course-input"
                      />
                      <span className="course-field-hint">
                        Paid courses use M-Pesa STK Push and unlock automatically upon payment.
                      </span>
                    </div>

                    <div className="course-field-group">
                      <label>Visibility Status</label>
                      <select
                        value={draft.status}
                        onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                        className="course-select"
                      >
                        <option value="published">Published (Live in Catalogue)</option>
                        <option value="draft">Draft (Private)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="course-preview-summary-card" style={{ '--sec-color': draft.accent }}>
                    <img
                      src={draft.cover_url}
                      alt={draft.title}
                      className="course-preview-summary-img"
                    />
                    <div className="course-preview-summary-info">
                      <span className="course-detail-chip is-accent">{draft.category}</span>
                      <h4>{draft.title || 'Untitled Course'}</h4>
                      <p>{draft.subtitle || draft.description}</p>
                      <div className="course-preview-summary-meta">
                        <span>{draft.modules.length} modules</span>
                        <span>•</span>
                        <span>
                          {draft.modules.reduce((a, m) => a + (m.lessons?.length || 0), 0)} lessons
                        </span>
                        <span>•</span>
                        <strong>
                          {Number(draft.price_kes) > 0 ? `KES ${draft.price_kes}` : 'Free'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="course-step-footer">
                    <button
                      type="button"
                      className="course-btn-secondary"
                      onClick={() => setStep(2)}
                    >
                      <span>← Back to Curriculum</span>
                    </button>
                    <div className="course-publish-btns">
                      <button
                        type="button"
                        className="course-btn-secondary"
                        disabled={saving}
                        onClick={() => handleSaveCourse('draft')}
                      >
                        <span>Save as Draft</span>
                      </button>
                      <button
                        type="button"
                        className="course-btn-primary"
                        disabled={saving}
                        onClick={() => handleSaveCourse('published')}
                      >
                        <CheckCircle2 size={16} />
                        <span>{saving ? 'Publishing...' : 'Publish Course'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PopupSheet>

      {uploadTarget && (
        <MediaUploadModal
          isOpen={Boolean(uploadTarget)}
          onClose={() => setUploadTarget(null)}
          kind={uploadTarget.type === 'cover' ? 'video' : 'video'}
          title={
            uploadTarget.type === 'cover'
              ? 'Upload Course Cover Image'
              : 'Upload Lesson Media'
          }
          user={session?.user}
          onUploaded={(item) => {
            const uploadedUrl = item?.media_url || item?.thumbnail_url || item?.url;
            if (uploadedUrl) {
              if (uploadTarget.type === 'cover') {
                setDraft((prev) => ({
                  ...prev,
                  cover_url: item?.thumbnail_url || uploadedUrl
                }));
              } else {
                updateLesson(uploadTarget.mIdx, uploadTarget.lIdx, {
                  media_url: uploadedUrl
                });
              }
            }
            setUploadTarget(null);
          }}
        />
      )}
    </>
  );
}
