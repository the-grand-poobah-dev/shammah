'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  PlayCircle,
  Award,
  Clock,
  Star,
  Users,
  Search,
  Sparkles,
  Plus,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Compass,
  Flame,
  ShieldCheck,
  Lock
} from 'lucide-react';
import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  FilterChips,
  SortMenu,
  StatStrip,
  ProgressBar,
  SkeletonGrid
} from './layoutkit';
import CourseDetailView from './CourseDetailView';
import CourseLearnPlayer from './CourseLearnPlayer';
import CourseCertificateModal from './CourseCertificateModal';
import CourseCreatorModal from './CourseCreatorModal';
import {
  COURSES_CATALOG,
  listCourses,
  migrateLegacyCourseProgress,
  issueCourseCertificate,
  formatDurationMinutes
} from '../lib/data/coursesApi';

export { COURSES_CATALOG };

const CATEGORY_TILES = [
  { id: 'Theology', label: 'Theology & Doctrine', accent: '#f59e0b', desc: 'Grace, Scripture & Christology' },
  { id: 'Spiritual Growth', label: 'Prayer & Spiritual Growth', accent: '#06b6d4', desc: 'Fasting, devotion & stillness' },
  { id: 'Leadership', label: 'Servant Leadership', accent: '#8b5cf6', desc: 'Ministry teams & pastoral care' },
  { id: 'Life & Family', label: 'Stewardship & Family', accent: '#10b981', desc: 'Kingdom finance & marriage' },
  { id: 'Evangelism', label: 'Digital Evangelism', accent: '#ec4899', desc: 'Sharing Jesus online & offline' }
];

function ProgressRing({ percent = 0, size = 44, stroke = 4, color = '#f59e0b' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percent || 0)));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="course-progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="course-progress-ring-label">{clamped}%</span>
    </div>
  );
}

export default function CoursesView({ session = null, userProfile = null }) {
  const userId = session?.user?.id || userProfile?.id || 'guest-scholar';
  const userName =
    userProfile?.full_name ||
    userProfile?.name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Shammah Scholar';

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigation sub-views: 'catalogue' | 'detail' | 'learn'
  const [viewMode, setViewMode] = useState('catalogue');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [initialLessonId, setInitialLessonId] = useState(null);

  // Filters & Search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePriceFilter, setActivePriceFilter] = useState('all'); // all | free | paid
  const [activeLevel, setActiveLevel] = useState('all'); // all | Beginner | Intermediate | Advanced
  const [activeDuration, setActiveDuration] = useState('all'); // all | short (<120m) | deep (>=120m)
  const [activeLanguage, setActiveLanguage] = useState('all');
  const [sortBy, setSortBy] = useState('popular'); // popular | newest | rating | price_asc
  const [browseLayout, setBrowseLayout] = useState('magazine-x2');

  // Modals
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState('builder');
  const [editingCourse, setEditingCourse] = useState(null);
  const [activeCertificate, setActiveCertificate] = useState(null);
  const [certificateCourse, setCertificateCourse] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput.trim().toLowerCase()), 220);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await migrateLegacyCourseProgress(userId, userName);
      const list = await listCourses(userId);
      setCourses(list);
    } catch (err) {
      setError(err?.message || 'Unable to load courses right now.');
    } finally {
      setLoading(false);
    }
  }, [userId, userName]);

  useEffect(() => {
    loadCatalogue();
  }, [loadCatalogue]);

  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status !== 'archived' && (c.status === 'published' || c.author_id === userId)),
    [courses, userId]
  );

  // Filtered & Sorted list
  const filteredCourses = useMemo(() => {
    let list = [...publishedCourses];

    if (debouncedQuery) {
      list = list.filter(
        (c) =>
          String(c.title || '').toLowerCase().includes(debouncedQuery) ||
          String(c.subtitle || c.description || '').toLowerCase().includes(debouncedQuery) ||
          String(c.instructor_name || '').toLowerCase().includes(debouncedQuery) ||
          String(c.category || '').toLowerCase().includes(debouncedQuery)
      );
    }

    if (activeCategory !== 'all') {
      list = list.filter((c) => c.category === activeCategory);
    }

    if (activePriceFilter === 'free') {
      list = list.filter((c) => Number(c.price_kes || 0) === 0);
    } else if (activePriceFilter === 'paid') {
      list = list.filter((c) => Number(c.price_kes || 0) > 0);
    }

    if (activeLevel !== 'all') {
      list = list.filter((c) => c.level === activeLevel);
    }

    if (activeDuration === 'short') {
      list = list.filter((c) => Number(c.duration_minutes || 90) < 120);
    } else if (activeDuration === 'deep') {
      list = list.filter((c) => Number(c.duration_minutes || 90) >= 120);
    }

    if (activeLanguage !== 'all') {
      list = list.filter((c) =>
        String(c.language || 'English').toLowerCase().includes(activeLanguage.toLowerCase())
      );
    }

    if (sortBy === 'popular') {
      list.sort((a, b) => Number(b.enrolled_count || 0) - Number(a.enrolled_count || 0));
    } else if (sortBy === 'newest') {
      list.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    } else if (sortBy === 'rating') {
      list.sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => Number(a.price_kes || 0) - Number(b.price_kes || 0));
    }

    return list;
  }, [
    publishedCourses,
    debouncedQuery,
    activeCategory,
    activePriceFilter,
    activeLevel,
    activeDuration,
    activeLanguage,
    sortBy
  ]);

  // Curated block slices
  const continueLearningCourses = useMemo(
    () =>
      publishedCourses.filter(
        (c) => (c.enrolled || Number(c.progress_percent || 0) > 0) && Number(c.progress_percent || 0) < 100
      ),
    [publishedCourses]
  );

  const myEnrolledCourses = useMemo(
    () => publishedCourses.filter((c) => c.enrolled || Number(c.progress_percent || 0) > 0),
    [publishedCourses]
  );

  const completedCourses = useMemo(
    () => publishedCourses.filter((c) => Number(c.progress_percent || 0) === 100 || c.completed_at),
    [publishedCourses]
  );

  const featuredCourse = useMemo(
    () => filteredCourses[0] || publishedCourses[0] || null,
    [filteredCourses, publishedCourses]
  );

  const popularCourses = useMemo(
    () =>
      [...publishedCourses]
        .sort((a, b) => Number(b.enrolled_count || 0) - Number(a.enrolled_count || 0))
        .slice(0, 4),
    [publishedCourses]
  );

  const newCourses = useMemo(
    () =>
      [...publishedCourses]
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 4),
    [publishedCourses]
  );

  const openCourseDetail = (course) => {
    setSelectedCourse(course);
    setViewMode('detail');
  };

  const openCoursePlayer = (course, lessonId = null) => {
    setSelectedCourse(course);
    setInitialLessonId(lessonId);
    setViewMode('learn');
  };

  const handleOpenCertModal = async (course) => {
    setCertificateCourse(course);
    if (course.certificate) {
      setActiveCertificate(course.certificate);
      return;
    }
    try {
      const cert = await issueCourseCertificate({
        courseId: course.id,
        userId,
        recipientName: userName
      });
      if (cert) {
        setActiveCertificate(cert);
        setCourses((prev) =>
          prev.map((c) => (c.id === course.id ? { ...c, certificate: cert } : c))
        );
      }
    } catch {}
  };

  const renderCourseCard = (course, compact = false) => {
    const isFree = Number(course.price_kes || 0) === 0;
    const progress = Number(course.progress_percent || 0);
    const totalLessons =
      course.total_lessons ||
      (course.modules || []).reduce((a, m) => a + (m.lessons?.length || 0), 0) ||
      4;

    return (
      <AccentCard
        key={course.id}
        accent={course.accent || '#f59e0b'}
        onClick={() => openCourseDetail(course)}
        className="course-hub-card"
      >
        <div className="course-hub-card-media">
          <img
            src={
              course.cover_url ||
              course.image ||
              'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80'
            }
            alt={course.title}
            loading="lazy"
            className="course-hub-card-img"
          />
          <div className="course-hub-card-badges">
            <span className="course-hub-badge-cat">{course.category}</span>
            <span className={`course-hub-badge-price ${isFree ? 'is-free' : 'is-paid'}`}>
              {isFree ? 'FREE' : `KES ${course.price_kes}`}
            </span>
          </div>
          {progress > 0 && (
            <div className="course-hub-card-ring-wrap">
              <ProgressRing
                percent={progress}
                size={40}
                stroke={3.5}
                color={course.accent || '#f59e0b'}
              />
            </div>
          )}
        </div>

        <div className="course-hub-card-body">
          <div className="course-hub-card-meta-top">
            <span>{course.level || 'Beginner'}</span>
            <span>•</span>
            <span>{formatDurationMinutes(course.duration_minutes || 95)}</span>
            <span>•</span>
            <span>{totalLessons} lessons</span>
          </div>

          <h3 className="course-hub-card-title">{course.title}</h3>
          {!compact && (
            <p className="course-hub-card-desc">
              {course.subtitle || course.description}
            </p>
          )}

          <div className="course-hub-card-footer">
            <div className="course-hub-card-instructor">
              <span className="course-hub-avatar-mini">
                {(course.instructor_name || course.instructor || 'P').charAt(0)}
              </span>
              <span>{course.instructor_name || course.instructor}</span>
            </div>

            <div className="course-hub-card-rating">
              <Star size={13} fill="#fbbf24" color="#fbbf24" />
              <strong>{course.rating_avg || 4.9}</strong>
              <span>({Number(course.enrolled_count || 0).toLocaleString()})</span>
            </div>
          </div>
        </div>
      </AccentCard>
    );
  };

  if (viewMode === 'detail' && selectedCourse) {
    return (
      <CourseDetailView
        course={selectedCourse}
        session={session}
        userProfile={userProfile}
        onBack={() => setViewMode('catalogue')}
        onStartLearning={(courseObj, lessonId) => openCoursePlayer(courseObj, lessonId)}
        onCourseUpdated={(updated) => {
          setSelectedCourse(updated);
          setCourses((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        }}
      />
    );
  }

  if (viewMode === 'learn' && selectedCourse) {
    return (
      <CourseLearnPlayer
        course={selectedCourse}
        initialLessonId={initialLessonId}
        session={session}
        userProfile={userProfile}
        onBack={() => setViewMode('detail')}
        onCourseUpdated={(res) => {
          setSelectedCourse((prev) => ({ ...prev, ...res }));
          loadCatalogue();
        }}
      />
    );
  }

  return (
    <div className="courses-hub-shell">
      {/* Header Banner */}
      <header className="courses-hub-header">
        <div className="courses-hub-header-top">
          <div>
            <span className="courses-hub-eyebrow">
              <Sparkles size={13} /> Shammah Faith Academy
            </span>
            <h1 className="courses-hub-title">Discipleship &amp; Ministry Courses</h1>
            <p className="courses-hub-subtitle">
              Grow in Scripture, prayer, leadership, and Kingdom stewardship with interactive lessons and verifiable certificates.
            </p>
          </div>

          <div className="courses-hub-header-actions">
            <button
              type="button"
              className="course-btn-secondary"
              onClick={() => {
                setEditingCourse(null);
                setCreatorMode('dashboard');
                setCreatorOpen(true);
              }}
            >
              <BarChart3 size={15} />
              <span>Instructor Studio</span>
            </button>
            <button
              type="button"
              className="course-btn-primary"
              onClick={() => {
                setEditingCourse(null);
                setCreatorMode('builder');
                setCreatorOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Create Course</span>
            </button>
          </div>
        </div>

        {/* Stat Strip */}
        <StatStrip
          stats={[
            { label: 'Active Courses', value: publishedCourses.length, icon: <BookOpen size={14} /> },
            {
              label: 'Enrolled In',
              value: myEnrolledCourses.length,
              icon: <PlayCircle size={14} />
            },
            {
              label: 'Certificates Earned',
              value: completedCourses.length,
              icon: <Award size={14} />
            },
            {
              label: 'Community Scholars',
              value: publishedCourses
                .reduce((a, c) => a + Number(c.enrolled_count || 0), 0)
                .toLocaleString(),
              icon: <Users size={14} />
            }
          ]}
        />

        {/* Search & Filter Bar */}
        <div className="courses-hub-Controls">
          <div className="courses-hub-search-row">
            <div className="courses-hub-search-box">
              <Search size={16} />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search courses, pastors, topics, or scriptures..."
                aria-label="Search courses"
              />
            </div>

            <SortMenu
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'popular', label: 'Most Enrolled' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'newest', label: 'Newest First' },
                { value: 'price_asc', label: 'Free First' }
              ]}
            />

            <LayoutSwitcher
              value={browseLayout}
              onChange={setBrowseLayout}
              allowed={['magazine-x2', 'magazine-flat', 'tiles', 'list-rich', 'compact']}
            />
          </div>

          <div className="courses-hub-filter-rows">
            <FilterChips
              value={activePriceFilter}
              onChange={setActivePriceFilter}
              options={[
                { id: 'all', label: 'All Courses' },
                { id: 'free', label: 'Free Courses' },
                { id: 'paid', label: 'Paid (M-Pesa)' }
              ]}
            />

            <FilterChips
              value={activeLevel}
              onChange={setActiveLevel}
              options={[
                { id: 'all', label: 'All Levels' },
                { id: 'Beginner', label: 'Beginner' },
                { id: 'Intermediate', label: 'Intermediate' },
                { id: 'Advanced', label: 'Advanced' }
              ]}
            />

            <FilterChips
              value={activeDuration}
              onChange={setActiveDuration}
              options={[
                { id: 'all', label: 'Any Length' },
                { id: 'short', label: 'Under 2 Hours' },
                { id: 'deep', label: 'Deep Dive (2h+)' }
              ]}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '16px 0' }}>
          <SkeletonGrid count={4} />
        </div>
      ) : error ? (
        <div className="courses-hub-error-card">
          <p>{error}</p>
          <button type="button" className="course-btn-primary" onClick={loadCatalogue}>
            <RefreshCw size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="courses-hub-sections">
          {/* 1. Continue Learning Rail with Progress Rings */}
          {continueLearningCourses.length > 0 && (
            <SectionBlock
              title="Continue Learning"
              subtitle="Pick up right where you left off"
              accent="#06b6d4"
            >
              <ContentLayout mode="rail" accent="#06b6d4">
                {continueLearningCourses.map((c) => (
                  <AccentCard
                    key={c.id}
                    accent={c.accent || '#06b6d4'}
                    onClick={() => openCoursePlayer(c)}
                    className="course-continue-rail-card"
                  >
                    <div className="course-continue-rail-row">
                      <ProgressRing
                        percent={c.progress_percent}
                        size={48}
                        stroke={4}
                        color={c.accent || '#06b6d4'}
                      />
                      <div className="course-continue-rail-info">
                        <span className="course-continue-rail-cat">{c.category}</span>
                        <h4>{c.title}</h4>
                        <span>
                          {c.completed_lessons || 0} of {c.total_lessons || 4} lessons done
                        </span>
                      </div>
                    </div>
                  </AccentCard>
                ))}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 2. Featured Course Spotlight */}
          {featuredCourse && !debouncedQuery && activeCategory === 'all' && (
            <SectionBlock
              title="Featured Course Spotlight"
              subtitle="Hand-picked biblical curriculum for this season"
              accent={featuredCourse.accent || '#f59e0b'}
            >
              <ContentLayout mode="spotlight" accent={featuredCourse.accent || '#f59e0b'}>
                <div
                  className="course-featured-spotlight"
                  style={{ '--sec-color': featuredCourse.accent || '#f59e0b' }}
                  onClick={() => openCourseDetail(featuredCourse)}
                >
                  <div className="course-featured-media">
                    <img
                      src={featuredCourse.cover_url || featuredCourse.image}
                      alt={featuredCourse.title}
                    />
                    <span className="course-featured-pill">
                      <Flame size={13} /> Featured Academy Pick
                    </span>
                  </div>
                  <div className="course-featured-body">
                    <div className="course-hub-card-meta-top">
                      <span>{featuredCourse.category}</span>
                      <span>•</span>
                      <span>{featuredCourse.level}</span>
                      <span>•</span>
                      <span>{formatDurationMinutes(featuredCourse.duration_minutes)}</span>
                    </div>
                    <h2>{featuredCourse.title}</h2>
                    <p>{featuredCourse.subtitle || featuredCourse.description}</p>
                    <div className="course-featured-cta-row">
                      <button
                        type="button"
                        className="course-btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCourseDetail(featuredCourse);
                        }}
                      >
                        <PlayCircle size={16} />
                        <span>
                          {featuredCourse.enrolled
                            ? 'Continue Course'
                            : Number(featuredCourse.price_kes || 0) === 0
                              ? 'Enroll Free'
                              : `Enroll (KES ${featuredCourse.price_kes})`}
                        </span>
                      </button>
                      <span className="course-featured-scholars">
                        <Users size={14} />{' '}
                        {Number(featuredCourse.enrolled_count || 0).toLocaleString()} scholars
                      </span>
                    </div>
                  </div>
                </div>
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 3. Categories Tiles */}
          <SectionBlock
            title="Explore by Ministry Track"
            subtitle="Filter courses by spiritual focus"
            accent="#8b5cf6"
          >
            <ContentLayout mode="tiles" accent="#8b5cf6">
              {CATEGORY_TILES.map((cat) => {
                const isSelected = activeCategory === cat.id;
                const count = publishedCourses.filter((c) => c.category === cat.id).length;
                return (
                  <AccentCard
                    key={cat.id}
                    accent={cat.accent}
                    onClick={() =>
                      setActiveCategory((prev) => (prev === cat.id ? 'all' : cat.id))
                    }
                    className={`course-cat-tile ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="course-cat-tile-body">
                      <div className="course-cat-tile-top">
                        <Compass size={18} style={{ color: cat.accent }} />
                        <span>{count} courses</span>
                      </div>
                      <h4>{cat.label}</h4>
                      <p>{cat.desc}</p>
                    </div>
                  </AccentCard>
                );
              })}
            </ContentLayout>
          </SectionBlock>

          {/* 4. All / Filtered Catalogue with LayoutSwitcher */}
          <SectionBlock
            title={
              activeCategory === 'all'
                ? 'Course Catalogue'
                : `${activeCategory} Courses`
            }
            subtitle={`${filteredCourses.length} courses available`}
            accent="#f59e0b"
          >
            {filteredCourses.length === 0 ? (
              <div className="courses-hub-empty">
                <BookOpen size={32} />
                <h3>No matching courses found</h3>
                <p>Try clearing a filter or create a new course in the Instructor Studio.</p>
                <button
                  type="button"
                  className="course-btn-secondary"
                  onClick={() => {
                    setSearchInput('');
                    setActiveCategory('all');
                    setActivePriceFilter('all');
                    setActiveLevel('all');
                    setActiveDuration('all');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <ContentLayout mode={browseLayout} accent="#f59e0b">
                {filteredCourses.map((c) =>
                  renderCourseCard(c, browseLayout === 'compact')
                )}
              </ContentLayout>
            )}
          </SectionBlock>

          {/* 5. Popular Courses (magazine-flat) */}
          {!debouncedQuery && activeCategory === 'all' && (
            <SectionBlock
              title="Most Popular Across Churches"
              subtitle="Top-rated courses taken by small groups and ministry leaders"
              accent="#10b981"
            >
              <ContentLayout mode="magazine-flat" accent="#10b981">
                {popularCourses.map((c) => renderCourseCard(c, false))}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 6. New Releases (magazine-x2) */}
          {!debouncedQuery && activeCategory === 'all' && (
            <SectionBlock
              title="New & Updated Curricula"
              subtitle="Fresh teachings added recently"
              accent="#ec4899"
            >
              <ContentLayout mode="magazine-x2" accent="#ec4899">
                {newCourses.map((c) => renderCourseCard(c, false))}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 7. My Courses (list-rich with progress) */}
          {myEnrolledCourses.length > 0 && (
            <SectionBlock
              title="My Enrolled Courses"
              subtitle="Your active learning journey synced across all devices"
              accent="#06b6d4"
            >
              <ContentLayout mode="list-rich" accent="#06b6d4">
                {myEnrolledCourses.map((c) => (
                  <AccentCard
                    key={c.id}
                    accent={c.accent || '#06b6d4'}
                    onClick={() => openCoursePlayer(c)}
                    className="course-my-list-card"
                  >
                    <div className="course-my-list-inner">
                      <img
                        src={c.cover_url || c.image}
                        alt={c.title}
                        className="course-my-list-thumb"
                      />
                      <div className="course-my-list-content">
                        <div className="course-my-list-top">
                          <h4>{c.title}</h4>
                          <span className="course-my-list-pct">{c.progress_percent || 0}%</span>
                        </div>
                        <p>{c.instructor_name || c.instructor}</p>
                        <ProgressBar
                          value={c.progress_percent || 0}
                          max={100}
                          accent={c.accent || '#06b6d4'}
                        />
                      </div>
                      <button
                        type="button"
                        className="course-btn-primary course-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCoursePlayer(c);
                        }}
                      >
                        <span>{c.progress_percent === 100 ? 'Review' : 'Resume'}</span>
                      </button>
                    </div>
                  </AccentCard>
                ))}
              </ContentLayout>
            </SectionBlock>
          )}

          {/* 8. Completed & Certificates (compact with certificate links) */}
          <SectionBlock
            title="Completed & Verifiable Certificates"
            subtitle="Download your PDF certificates or verify credentials at /verify/[code]"
            accent="#f59e0b"
          >
            {completedCourses.length === 0 ? (
              <div className="course-completed-empty">
                <Award size={22} />
                <span>
                  Complete all lessons in any course to unlock your verifiable Certificate of Completion.
                </span>
              </div>
            ) : (
              <ContentLayout mode="compact" accent="#f59e0b">
                {completedCourses.map((c) => (
                  <div
                    key={c.id}
                    className="course-completed-compact-row"
                    style={{ '--sec-color': c.accent || '#f59e0b' }}
                  >
                    <div className="course-completed-compact-left">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <div>
                        <strong>{c.title}</strong>
                        <span>
                          {c.certificate?.code
                            ? `Credential: ${c.certificate.code}`
                            : '100% Completed • Ready to issue'}
                        </span>
                      </div>
                    </div>

                    <div className="course-completed-compact-actions">
                      <button
                        type="button"
                        className="course-btn-certificate"
                        onClick={() => handleOpenCertModal(c)}
                      >
                        <Award size={14} />
                        <span>View Certificate</span>
                      </button>
                      {c.certificate?.code && (
                        <a
                          href={`/verify/${c.certificate.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="course-btn-secondary course-btn-sm"
                        >
                          <ShieldCheck size={13} />
                          <span>Verify</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </ContentLayout>
            )}
          </SectionBlock>
        </div>
      )}

      {/* Creator & Instructor Studio Modal */}
      <CourseCreatorModal
        isOpen={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        initialCourse={editingCourse}
        initialMode={creatorMode}
        session={session}
        userProfile={userProfile}
        onCourseSaved={(savedCourse) => {
          setCourses((prev) => {
            const exists = prev.some((c) => c.id === savedCourse.id);
            return exists
              ? prev.map((c) => (c.id === savedCourse.id ? savedCourse : c))
              : [savedCourse, ...prev];
          });
        }}
        onOpenCourse={(courseObj) => openCourseDetail(courseObj)}
      />

      {/* Certificate Modal */}
      <CourseCertificateModal
        isOpen={Boolean(activeCertificate)}
        onClose={() => setActiveCertificate(null)}
        certificate={activeCertificate}
        course={certificateCourse}
        recipientName={userName}
      />
    </div>
  );
}
