'use client';
import { useState, useEffect } from 'react';
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
  Tv,
  DownloadCloud,
  Check,
  Search,
  Filter,
  Flame,
  Shield,
  Coins,
  Lock,
  MessageCircle,
  Repeat,
  FileText,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import RepostModal from './RepostModal';
import WatermarkShareModal from './WatermarkShareModal';
import ProjectionModeModal from './ProjectionModeModal';
import { saveOfflineItem, isItemSavedOffline, getRemainingDays } from '../lib/offlineSyncManager';
import { playSound } from '../lib/soundEffects';

const COURSE_CATEGORIES = [
  { id: 'all', label: 'All Subjects' },
  { id: 'discipleship', label: 'Foundations & Discipleship' },
  { id: 'leadership', label: 'Pastoral & Kingdom Leadership' },
  { id: 'prayer', label: 'Spiritual Warfare & Intercession' },
  { id: 'marriage', label: 'Covenant Marriage & Family' },
  { id: 'worship', label: 'Prophetic Worship & Arts' },
  { id: 'youth', label: 'Youth & Next-Gen' },
  { id: 'apologetics', label: 'Bible Mastery & Apologetics' },
];

export const COURSES_CATALOG = [
  {
    id: 'course-foundations',
    category: 'discipleship',
    title: 'Foundations of Faith: The Pillars of New Covenant Believers',
    instructor: 'Pastor David Mwangi',
    churchName: 'Nairobi Chapel & Fellowship',
    role: 'church_admin',
    badge: 'pastor',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
    level: 'Foundational',
    duration: '4 Weeks · 5 Modules',
    enrolledCount: 248,
    isPremium: false,
    priceKes: 0,
    certificateTitle: 'Pillars of Faith Foundation Certificate',
    badgeIcon: '🔥',
    badgeName: 'Faith Foundation Pillar',
    description: 'Master the core truths of salvation by grace, believer authority in Christ, water baptism, the Holy Spirit baptism, and continuous communion with God.',
    modules: [
      {
        id: 'm-1',
        title: 'Module 1: The Assurance of Eternal Salvation',
        duration: '24 min',
        completed: true,
        scripture: 'Ephesians 2:8-10 · Romans 8:38-39',
        notes: 'Salvation is a gift received by faith, not earned by works. God seals believers with the Holy Spirit of promise.',
      },
      {
        id: 'm-2',
        title: 'Module 2: The Authority of the Believer in Christ',
        duration: '32 min',
        completed: true,
        scripture: 'Luke 10:19 · Ephesians 1:19-23',
        notes: 'Understanding the delegated authority of the believer to speak God’s word and stand firm against demonic schemes.',
      },
      {
        id: 'm-3',
        title: 'Module 3: Walking in Communion & Daily Prayer',
        duration: '28 min',
        completed: true,
        scripture: '1 Thessalonians 5:16-18 · John 15:5-7',
        notes: 'Communion is living awareness of God’s presence throughout every minute of the day.',
      },
      {
        id: 'm-4',
        title: 'Module 4: The Baptism and Gifts of the Holy Spirit',
        duration: '35 min',
        completed: true,
        scripture: 'Acts 1:8 · 1 Corinthians 12:4-11',
        notes: 'Power for witness and divine enablement through spiritual gifts serving the body of Christ.',
      },
      {
        id: 'm-5',
        title: 'Module 5: Overcoming Temptation & Living Consecrated',
        duration: '30 min',
        completed: false,
        scripture: '1 Corinthians 10:13 · Galatians 5:16-25',
        notes: 'Walking by the Spirit so that you do not fulfill the desires of the flesh.',
      },
    ],
  },
  {
    id: 'course-intercession',
    category: 'prayer',
    title: 'Spiritual Warfare & Intercession: Guarding the City Gates',
    instructor: 'Sister Esther Wanjiku',
    churchName: 'Mavuno City Church',
    role: 'member',
    badge: 'intercessor',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
    level: 'Intermediate',
    duration: '3 Weeks · 3 Modules',
    enrolledCount: 182,
    isPremium: false,
    priceKes: 0,
    certificateTitle: 'Watchman Intercession & Warfare Diploma',
    badgeIcon: '🛡️',
    badgeName: 'City Gate Watchman',
    description: 'Learn biblical protocols of spiritual warfare, binding and loosing, prayer vigils, praying scripture, and cultivating acute sensitivity to the Holy Spirit.',
    modules: [
      {
        id: 'm-w-1',
        title: 'Module 1: The Armor of God in Ephesians 6',
        duration: '26 min',
        completed: true,
        scripture: 'Ephesians 6:10-18',
        notes: 'Stand firm in truth, righteousness, the gospel of peace, faith, salvation, and the sword of the Spirit.',
      },
      {
        id: 'm-w-2',
        title: 'Module 2: Strategic Prayer Watches & Dawn Prayers',
        duration: '29 min',
        completed: true,
        scripture: 'Psalm 63:1 · Lamentations 2:19',
        notes: 'The night watches and morning dew prayers that dismantle territorial oppression.',
      },
      {
        id: 'm-w-3',
        title: 'Module 3: Fasting as Spiritual Breakthrough Weapon',
        duration: '33 min',
        completed: true,
        scripture: 'Isaiah 58:6-12 · Matthew 17:21',
        notes: 'The true fast that loosens bands of wickedness and releases divine illumination.',
      },
    ],
  },
  {
    id: 'course-leadership',
    category: 'leadership',
    title: 'Kingdom Leadership: Servant Heart & Pastoral Wisdom',
    instructor: 'Bishop Sarah Ndung\'u',
    churchName: 'Christ Is The Answer Ministries',
    role: 'church_admin',
    badge: 'bishop',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    cover: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600',
    level: 'Advanced',
    duration: '6 Weeks · 4 Modules',
    enrolledCount: 134,
    isPremium: true,
    priceKes: 1500,
    certificateTitle: 'Executive Kingdom Leadership Credential',
    badgeIcon: '👑',
    badgeName: 'Servant Shepherd Leader',
    description: 'Essential leadership training for elders, deacons, cell group shepherds, and ministry coordinators. Conflict resolution, delegation, and mentoring emerging ministers.',
    modules: [
      {
        id: 'm-l-1',
        title: 'Module 1: The Heart of a Servant Shepherd',
        duration: '40 min',
        completed: false,
        scripture: '1 Peter 5:1-4 · Mark 10:42-45',
        notes: 'Leading by example, not lording over God’s heritage.',
      },
      {
        id: 'm-l-2',
        title: 'Module 2: Navigating Church Transitions & Unity',
        duration: '38 min',
        completed: false,
        scripture: 'Ephesians 4:1-6 · 1 Corinthians 1:10',
        notes: 'Guarding the unity of the Spirit in the bond of peace during growth phases.',
      },
      {
        id: 'm-l-3',
        title: 'Module 3: Preaching & Teaching with Spiritual Power',
        duration: '45 min',
        completed: false,
        scripture: '2 Timothy 4:1-5 · 1 Corinthians 2:4',
        notes: 'Not with persuasive words of human wisdom, but in demonstration of the Spirit and of power.',
      },
      {
        id: 'm-l-4',
        title: 'Module 4: Financial Integrity & Church Administration',
        duration: '35 min',
        completed: false,
        scripture: '2 Corinthians 8:20-21 · 1 Timothy 3:1-7',
        notes: 'Providing things honest not only in the sight of the Lord, but also in the sight of men.',
      },
    ],
  },
  {
    id: 'course-marriage',
    category: 'marriage',
    title: 'Covenant Marriage: Building Christ-Centered Homes',
    instructor: 'Rev. Timothy & Janet Kariuki',
    churchName: 'All Saints Cathedral',
    role: 'pastor',
    badge: 'pastor',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    cover: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
    level: 'All Couples & Singles',
    duration: '4 Weeks · 4 Modules',
    enrolledCount: 310,
    isPremium: false,
    priceKes: 0,
    certificateTitle: 'Kingdom Family & Covenant Marriage Award',
    badgeIcon: '💍',
    badgeName: 'Covenant Marriage Builder',
    description: 'Biblical blueprints for lifelong marital intimacy, raising godly children, transparent communication, and overcoming financial and emotional hurdles.',
    modules: [
      {
        id: 'm-m-1',
        title: 'Module 1: The Covenant vs Contract in Christian Marriage',
        duration: '30 min',
        completed: false,
        scripture: 'Genesis 2:24 · Ephesians 5:21-33',
        notes: 'Marriage is a sacred covenant reflecting Christ and His bride, the Church.',
      },
      {
        id: 'm-m-2',
        title: 'Module 2: Communication, Healing & Quick Forgiveness',
        duration: '34 min',
        completed: false,
        scripture: 'Colossians 3:12-14 · James 1:19',
        notes: 'Be quick to hear, slow to speak, and slow to anger.',
      },
      {
        id: 'm-m-3',
        title: 'Module 3: Kingdom Finances for Married Couples',
        duration: '28 min',
        completed: false,
        scripture: 'Proverbs 3:9-10 · Luke 16:10-12',
        notes: 'Unified budgeting, debt freedom, and generative blessing.',
      },
    ],
  },
  {
    id: 'course-worship',
    category: 'worship',
    title: 'Prophetic Worship & Atmosphere: Leading Congregational Praise',
    instructor: 'Minister Mercy Masika & Worship Team',
    churchName: 'Jubilee Christian Church',
    role: 'member',
    badge: 'worship',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
    level: 'Worship Ministers & Believers',
    duration: '3 Weeks · 3 Modules',
    enrolledCount: 220,
    isPremium: true,
    priceKes: 800,
    certificateTitle: 'Prophetic Worship Leader Certificate',
    badgeIcon: '🕊️',
    badgeName: 'Prophetic Atmosphere Builder',
    description: 'Flow in the Holy Spirit during corporate worship, sensitivity to the prophetic song, spiritual preparation, and songwriting for church revival.',
    modules: [
      {
        id: 'm-w-1',
        title: 'Module 1: Worship in Spirit and in Truth',
        duration: '32 min',
        completed: false,
        scripture: 'John 4:23-24 · Psalm 100',
        notes: 'The Father seeks true worshipers who worship beyond outward form.',
      },
      {
        id: 'm-w-2',
        title: 'Module 2: The New Song & Prophetic Spontaneous Praise',
        duration: '36 min',
        completed: false,
        scripture: 'Psalm 40:3 · Revelation 5:9',
        notes: 'Releasing spontaneous spiritual songs that shift spiritual atmospheres in services.',
      },
    ],
  },
];

export default function CoursesView({ session, currentUser, openAuth }) {
  const [courses, setCourses] = useState(COURSES_CATALOG);
  const [activeTab, setActiveTab] = useState('all'); // all | my-courses | explore | free | premium | completed
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Projection Mode state
  const [projectingCourse, setProjectingCourse] = useState(null);

  // Watermark Share state
  const [watermarkShareData, setWatermarkShareData] = useState(null);

  // Repost Modal state
  const [repostModalCourse, setRepostModalCourse] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState('');

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  // Load completion states from localStorage if any
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shammah_completed_courses_v1');
      if (stored) {
        const completedIds = JSON.parse(stored);
        setCourses((prev) =>
          prev.map((c) => {
            if (completedIds.includes(c.id)) {
              return {
                ...c,
                modules: c.modules.map((m) => ({ ...m, completed: true })),
              };
            }
            return c;
          })
        );
      }
    } catch {}
  }, []);

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
        const nextMods = c.modules.map((m) =>
          m.id === modId ? { ...m, completed: !m.completed } : m
        );
        const done = nextMods.filter((m) => m.completed).length;
        const isAllDone = done === nextMods.length;
        const updated = { ...c, modules: nextMods };

        if (isAllDone) {
          playSound('badge');
          showToast(`🎉 Congratulations! You completed ${c.title} and earned the "${c.badgeName}" Badge!`);
          try {
            const stored = JSON.parse(localStorage.getItem('shammah_completed_courses_v1') || '[]');
            if (!stored.includes(courseId)) {
              stored.push(courseId);
              localStorage.setItem('shammah_completed_courses_v1', JSON.stringify(stored));
            }
          } catch {}
        } else {
          playSound('reaction');
        }

        if (selectedCourse?.id === courseId) {
          setSelectedCourse(updated);
        }
        return updated;
      })
    );
  }

  function handleSaveOffline(course) {
    playSound('reaction');
    const res = saveOfflineItem(course, 'course');
    if (res.success) {
      showToast(`Saved "${course.title}" for 30-day offline access!`);
    } else {
      showToast(res.reason || 'Could not save course offline.');
    }
  }

  function handleShareCourseWatermarked(course) {
    playSound('reaction');
    setWatermarkShareData({
      title: course.title,
      textContent: `${course.description}\n\nInstructor: ${course.instructor} (${course.churchName})\nLevel: ${course.level} · ${course.duration}`,
      authorName: course.instructor,
      churchName: course.churchName,
      category: 'Discipleship Academy',
      courseInfo: {
        title: course.title,
        badgeName: course.badgeName,
      },
    });
  }

  function handleProjectCourse(course) {
    playSound('reaction');
    setProjectingCourse(course);
  }

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const isEnrolled = course.modules.some((m) => m.completed);
    const isCompleted = course.modules.every((m) => m.completed);

    if (activeTab === 'my-courses' && !isEnrolled) return false;
    if (activeTab === 'completed' && !isCompleted) return false;
    if (activeTab === 'free' && course.isPremium) return false;
    if (activeTab === 'premium' && !course.isPremium) return false;

    if (selectedCategory !== 'all' && course.category !== selectedCategory) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = course.title.toLowerCase().includes(q);
      const matchInst = course.instructor.toLowerCase().includes(q);
      const matchDesc = course.description.toLowerCase().includes(q);
      return matchTitle || matchInst || matchDesc;
    }
    return true;
  });

  const enrolledCount = courses.filter((c) => c.modules.some((m) => m.completed)).length;
  const completedCount = courses.filter((c) => c.modules.every((m) => m.completed)).length;

  return (
    <div className="section-feed-view courses-view-container">
      {/* Academy Banner with Projection & Action CTAs */}
      <div className="courses-header-banner">
        <div className="courses-header-content">
          <div className="courses-badge-tag">
            <GraduationCap size={16} />
            <span>Kingdom Discipleship Academy</span>
          </div>
          <h2 className="courses-main-title">Biblical Courses, Discipleship &amp; Leadership</h2>
          <p className="courses-subtext">
            Grow deep in doctrine, spiritual warfare, family covenants, and leadership. Instructors and pastors can project any course directly onto sanctuary and classroom screens.
          </p>

          <div className="courses-quick-meta-row">
            <span className="course-quick-stat">
              <Award size={14} className="text-amber-400" />
              <span>{completedCount} Completed Badges</span>
            </span>
            <span className="course-quick-stat">
              <BookOpen size={14} className="text-cyan-400" />
              <span>{enrolledCount} Active Studies</span>
            </span>
            <button
              type="button"
              className="course-project-hero-btn"
              onClick={() => handleProjectCourse(courses[0])}
              title="Project to sanctuary or classroom projector"
            >
              <Tv size={14} />
              <span>Launch Sanctuary Screen Projection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="courses-main-tabs no-scrollbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`course-tab-pill${activeTab === 'all' ? ' active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All Courses ({courses.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'my-courses'}
          className={`course-tab-pill${activeTab === 'my-courses' ? ' active' : ''}`}
          onClick={() => setActiveTab('my-courses')}
        >
          <BookOpen size={14} />
          <span>My Courses &amp; Progress ({enrolledCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'completed'}
          className={`course-tab-pill${activeTab === 'completed' ? ' active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <Award size={14} className="text-amber-400" />
          <span>Completed &amp; Badges ({completedCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'free'}
          className={`course-tab-pill${activeTab === 'free' ? ' active' : ''}`}
          onClick={() => setActiveTab('free')}
        >
          <Sparkles size={14} className="text-teal-400" />
          <span>Free Courses</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'premium'}
          className={`course-tab-pill${activeTab === 'premium' ? ' active' : ''}`}
          onClick={() => setActiveTab('premium')}
        >
          <Coins size={14} className="text-yellow-400" />
          <span>Premium &amp; Certified Tracks</span>
        </button>
      </div>

      {/* Search & Subject Category Filter Row */}
      <div className="courses-filter-bar">
        <div className="courses-search-wrap">
          <Search size={15} className="courses-search-icon" />
          <input
            type="text"
            className="courses-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search discipleship courses, pastors, subjects..."
          />
        </div>

        <div className="courses-cat-pills no-scrollbar">
          {COURSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-filter-pill${selectedCategory === cat.id ? ' active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="courses-grid-list">
        {filteredCourses.length === 0 ? (
          <div className="empty-state">
            <GraduationCap size={36} className="empty-icon" />
            <h3>No courses match this filter</h3>
            <p>Try switching categories or view all discipleship courses.</p>
            <button
              type="button"
              className="signin-btn"
              onClick={() => {
                setActiveTab('all');
                setSelectedCategory('all');
                setSearchTerm('');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const completedMods = course.modules.filter((m) => m.completed).length;
            const totalMods = course.modules.length;
            const progressPercent = Math.round((completedMods / totalMods) * 100);
            const isCompleted = progressPercent === 100;
            const isSaved = isItemSavedOffline(course.id);

            return (
              <article key={course.id} className="post-card course-card">
                {/* Cover Image & Chips */}
                <div
                  className="course-card-cover"
                  style={{ backgroundImage: `url(${course.cover})` }}
                >
                  <span className="course-level-chip">{course.level}</span>
                  <span className="course-duration-chip">
                    <Clock size={11} /> {course.duration}
                  </span>
                  {course.isPremium ? (
                    <span className="course-price-chip premium">
                      <Coins size={11} /> Kes {course.priceKes.toLocaleString()} · Certified
                    </span>
                  ) : (
                    <span className="course-price-chip free">
                      <Sparkles size={11} /> Free Discipleship
                    </span>
                  )}
                </div>

                <div className="course-card-body">
                  {/* Instructor row */}
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

                  {/* Progress section */}
                  <div className="course-progress-section">
                    <div className="course-progress-header">
                      <span>
                        {isCompleted
                          ? '🎉 100% Completed · Badge Earned'
                          : progressPercent > 0
                            ? `${progressPercent}% Completed`
                            : 'Not enrolled yet'}
                      </span>
                      <span>
                        {completedMods} / {totalMods} modules
                      </span>
                    </div>
                    <div className="course-progress-track">
                      <div
                        className="course-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Completed Badge Showcase Chip if completed */}
                  {isCompleted && (
                    <div className="course-earned-badge-chip">
                      <span className="badge-emoji">{course.badgeIcon}</span>
                      <div className="badge-text">
                        <strong>{course.badgeName}</strong>
                        <small>{course.certificateTitle}</small>
                      </div>
                    </div>
                  )}

                  {/* Course Action Buttons */}
                  <div className="course-actions-row">
                    <button
                      type="button"
                      className="course-enroll-btn"
                      onClick={() => handleEnroll(course)}
                    >
                      <BookOpen size={16} />
                      <span>{progressPercent > 0 ? 'Continue Lesson' : 'Start Course'}</span>
                      <ChevronRight size={16} />
                    </button>

                    {/* Sanctuary Projection Screen Button */}
                    <button
                      type="button"
                      className="course-project-icon-btn"
                      onClick={() => handleProjectCourse(course)}
                      title="Project Course to Sanctuary / Classroom Screen"
                      aria-label="Project Course"
                    >
                      <Tv size={16} />
                    </button>

                    {/* Offline Download Button (30-day storage) */}
                    <button
                      type="button"
                      className={`course-offline-btn${isSaved ? ' saved' : ''}`}
                      onClick={() => handleSaveOffline(course)}
                      title={isSaved ? 'Saved offline for 30 days' : 'Download for 30-day offline access'}
                      aria-label="Save offline"
                    >
                      {isSaved ? <Check size={16} /> : <DownloadCloud size={16} />}
                    </button>

                    {/* Watermark Share Button */}
                    <button
                      type="button"
                      className="course-share-btn"
                      onClick={() => handleShareCourseWatermarked(course)}
                      title="Share with Official Watermark"
                      aria-label="Share course"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>

                  {/* Reaction & Engagement Bar for Courses */}
                  <div className="course-engagement-bar">
                    <ReactionBar
                      postId={course.id}
                      session={session}
                      onRequireSignIn={() => (openAuth ? openAuth('signin') : null)}
                      size="sm"
                    />

                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setRepostModalCourse(course)}
                      title="Repost course to profile"
                    >
                      <Repeat size={14} className="repost-icon" />
                      <span className="repost-label-text">Repost</span>
                    </button>

                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => setSelectedCourse(course)}
                      title="Course discussion & questions"
                    >
                      <MessageCircle size={14} />
                      <span>Discussion</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Course Detail, Lesson Syllabus & Discussion Modal */}
      {selectedCourse && (
        <div
          className="visibility-modal-backdrop"
          onClick={() => setSelectedCourse(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="course-modal-card neon-glow-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
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
              {/* Instructor info banner */}
              <div className="course-modal-instructor-info">
                <Avatar
                  name={selectedCourse.instructor}
                  src={selectedCourse.avatar}
                  className="avatar-sm"
                />
                <div style={{ flex: 1 }}>
                  <strong>Instructor: {selectedCourse.instructor}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <MemberBadge badgeId={selectedCourse.badge} size="sm" />
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {selectedCourse.churchName} · {selectedCourse.duration}
                    </span>
                  </div>
                </div>

                {/* Direct Project to Sanctuary Screen Button */}
                <button
                  type="button"
                  className="projection-btn icon highlight"
                  onClick={() => {
                    handleProjectCourse(selectedCourse);
                    setSelectedCourse(null);
                  }}
                  title="Project Course to Sanctuary Screen"
                >
                  <Tv size={16} />
                  <span>Project on Stage</span>
                </button>
              </div>

              {/* Modules & Lessons Checklist */}
              <h4 style={{ margin: '18px 0 10px', fontSize: 15 }}>
                Course Modules &amp; Study Notes:
              </h4>

              <div className="course-modules-list">
                {selectedCourse.modules.map((mod, idx) => (
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
                        <span className="module-duration">
                          {mod.duration} · {mod.scripture || 'Scripture Notes Included'}
                        </span>
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

              {/* Course Discussion & Q&A Thread */}
              <div className="course-discussion-section">
                <h4 style={{ margin: '20px 0 10px', fontSize: 15 }}>
                  Course Discussion &amp; Questions:
                </h4>
                <CommentThread
                  postId={selectedCourse.id}
                  session={session}
                  onRequireSignIn={() => (openAuth ? openAuth('signin') : null)}
                  onCountChange={() => {}}
                />
              </div>
            </div>

            <div className="course-modal-footer">
              <button
                type="button"
                className="signin-btn"
                onClick={() => setSelectedCourse(null)}
                style={{ width: '100%', padding: '10px 0' }}
              >
                Close Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projection Mode Modal */}
      {projectingCourse && (
        <ProjectionModeModal
          type="course"
          data={projectingCourse}
          onClose={() => setProjectingCourse(null)}
        />
      )}

      {/* Watermarked Share Modal */}
      {watermarkShareData && (
        <WatermarkShareModal
          contentData={watermarkShareData}
          onClose={() => setWatermarkShareData(null)}
        />
      )}

      {/* Repost Modal */}
      {repostModalCourse && (
        <RepostModal
          post={{
            id: repostModalCourse.id,
            text_content: repostModalCourse.title,
            profiles: {
              name: repostModalCourse.instructor,
              display_name: repostModalCourse.instructor,
              avatar_url: repostModalCourse.avatar,
            },
          }}
          currentUser={currentUser}
          onClose={() => setRepostModalCourse(null)}
          onConfirm={(quote) => {
            playSound('reposted');
            showToast('Course reposted to your fellowship profile feed!');
            setRepostModalCourse(null);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && <div className="video-toast-pill">{toastMsg}</div>}
    </div>
  );
}
