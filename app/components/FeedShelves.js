'use client';
import { useState, useRef, useEffect } from 'react';
import {
  BarChart3,
  Headphones,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  Sparkles,
  Gamepad2,
  Play,
  Pause,
  Heart,
  Check,
  ChevronRight,
  Flame,
  Bookmark,
  Users,
  ArrowRight,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { ScrollAffordanceWrapper } from './ScrollAffordance';
import { playSound } from '../lib/soundEffects';
import MpesaPaymentModal from './MpesaPaymentModal';
import { markSectionSeenOnFeed } from '../lib/contentBadgeManager';

/**
 * Reusable drag-scroll hook for horizontal feed shelves
 */
function useShelfDragScroll() {
  const ref = useRef(null);
  const dragInfo = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  function onPointerDown(e) {
    if (!ref.current) return;
    dragInfo.current = {
      isDown: true,
      startX: e.pageX - ref.current.offsetLeft,
      scrollLeft: ref.current.scrollLeft,
      hasMoved: false,
    };
  }

  function onPointerMove(e) {
    if (!dragInfo.current.isDown || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.4;
    ref.current.scrollLeft = dragInfo.current.scrollLeft - walk;
    if (Math.abs(walk) > 4) {
      dragInfo.current.hasMoved = true;
    }
  }

  function onPointerUp() {
    dragInfo.current.isDown = false;
  }

  return { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo };
}

/**
 * Hook to mark section seen when the shelf scrolls into view
 */
function useShelfVisibilityTrigger(sectionKey) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
            markSectionSeenOnFeed(sectionKey);
          }
        });
      },
      { threshold: [0.35] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [sectionKey]);

  return containerRef;
}

// ============================================================================
// 1. POLLS SHELF WIDGET
// ============================================================================
const INITIAL_FEED_POLLS = [
  {
    id: 'shelf-poll-retreat',
    question: '2026 Church Retreat: Which theme should we focus on?',
    author: 'Pastor David Mwangi',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    badge: 'pastor',
    theme: 'shammah-theme-amber',
    tag: 'Ministry Vision',
    options: [
      { id: 'opt-1', label: 'Walking in Holy Spirit Power', votes: 52 },
      { id: 'opt-2', label: 'Kingdom Families & Next-Gen', votes: 41 },
      { id: 'opt-3', label: 'Spiritual Warfare & Prayer', votes: 68 },
    ],
  },
  {
    id: 'shelf-poll-worship',
    question: 'Preferred day for monthly Night of Prophetic Praise?',
    author: 'Sister Mary Grace',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    badge: 'worship',
    theme: 'shammah-theme-violet',
    tag: 'Worship Arts',
    options: [
      { id: 'opt-w1', label: 'Last Friday night (7-10 PM)', votes: 79 },
      { id: 'opt-w2', label: 'First Saturday evening', votes: 34 },
      { id: 'opt-w3', label: 'Sunday Evening Fellowship', votes: 21 },
    ],
  },
  {
    id: 'shelf-poll-trivia',
    question: 'Trivia: Who was the oldest man recorded in Genesis (969 yrs)?',
    author: 'Evangelist Samuel',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    badge: 'partner',
    theme: 'shammah-theme-cyan',
    tag: 'Scripture Quiz',
    options: [
      { id: 'opt-t1', label: 'Methuselah (Genesis 5:27)', votes: 112 },
      { id: 'opt-t2', label: 'Noah (Genesis 9:29)', votes: 18 },
      { id: 'opt-t3', label: 'Jared (Genesis 5:20)', votes: 7 },
    ],
  },
  {
    id: 'shelf-poll-youth',
    question: 'Youth focus for next quarter Bible study?',
    author: 'Brother John Ochieng',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    badge: 'partner',
    theme: 'shammah-theme-emerald',
    tag: 'Next-Gen Youth',
    options: [
      { id: 'opt-y1', label: 'Biblical Worldview & Career', votes: 63 },
      { id: 'opt-y2', label: 'Mental Wholeness & God’s Peace', votes: 85 },
      { id: 'opt-y3', label: 'Purity in modern culture', votes: 47 },
    ],
  },
];

export function PollsShelfWidget({ onSelectSection }) {
  const containerRef = useShelfVisibilityTrigger('polls');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();
  const [polls, setPolls] = useState(INITIAL_FEED_POLLS);
  const [userVotes, setUserVotes] = useState({});

  function handleVote(pollId, optionId) {
    if (dragInfo.current.hasMoved) return;
    playSound('reaction');

    setUserVotes((prev) => ({ ...prev, [pollId]: optionId }));
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const previousVote = userVotes[pollId];
        return {
          ...poll,
          options: poll.options.map((opt) => {
            let nextVotes = opt.votes;
            if (previousVote === opt.id) nextVotes = Math.max(0, nextVotes - 1);
            if (opt.id === optionId) nextVotes += 1;
            return { ...opt, votes: nextVotes };
          }),
        };
      })
    );
  }

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <BarChart3 size={17} className="hl-icon text-cyan-400" />
          <span>Active Church &amp; Faith Polls</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('polls')}
        >
          <span>All Polls</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll polls back" rightLabel="Scroll polls forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;
            const myVote = userVotes[poll.id];

            return (
              <div key={poll.id} className={`shammah-shelf-item shammah-shelf-poll ${poll.theme}`}>
                <div className="shammah-shelf-item-top">
                  <div className="flex items-center gap-2">
                    <Avatar name={poll.author} src={poll.avatar} size={28} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-xs text-[var(--ink)] truncate max-w-[130px]">
                          {poll.author}
                        </span>
                        {poll.badge && <VerifiedBadge badge={poll.badge} size={11} />}
                      </div>
                      <span className="text-[10px] text-[var(--ink-muted)] block truncate">{poll.tag}</span>
                    </div>
                  </div>
                  <span className="shammah-shelf-badge-chip">
                    {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                  </span>
                </div>

                <p className="shammah-shelf-poll-question">{poll.question}</p>

                <div className="shammah-shelf-poll-options">
                  {poll.options.map((opt) => {
                    const isSelected = myVote === opt.id;
                    const pct = Math.round((opt.votes / totalVotes) * 100);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`shammah-shelf-poll-btn${isSelected ? ' is-selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(poll.id, opt.id);
                        }}
                      >
                        <div className="shammah-shelf-poll-fill" style={{ width: `${pct}%` }} />
                        <span className="shammah-shelf-poll-label truncate">{opt.label}</span>
                        <span className="shammah-shelf-poll-pct">{pct}%</span>
                      </button>
                    );
                  })}
                </div>

                <div className="shammah-shelf-footer">
                  <button
                    type="button"
                    className="shammah-shelf-footer-btn"
                    onClick={() => {
                      if (dragInfo.current.hasMoved) return;
                      onSelectSection?.('polls');
                    }}
                  >
                    <span>View discussion &amp; results</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}

// ============================================================================
// 2. AUDIO SHELF WIDGET
// ============================================================================
const INITIAL_FEED_AUDIO = [
  {
    id: 'audio-sermon-psalm91',
    title: 'The Secret Place of the Most High (Psalm 91 Expository)',
    speaker: 'Pastor David Mwangi',
    church: 'Nairobi Worship Center',
    duration: '32:40',
    type: 'Sermon',
    cover: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400',
    theme: 'shammah-theme-amber',
  },
  {
    id: 'audio-worship-glory',
    title: 'Deep Calls to Deep: Prophetic Worship Anthem',
    speaker: 'Sister Mary Grace & Band',
    church: 'Glory Tabernacle',
    duration: '18:15',
    type: 'Worship',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    theme: 'shammah-theme-violet',
  },
  {
    id: 'audio-prayer-midnight',
    title: 'Midnight Prayer Watch & Breaking Strongholds',
    speaker: 'Deaconess Rebecca',
    church: 'Calvary Living Waters',
    duration: '24:00',
    type: 'Prayer Watch',
    cover: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400',
    theme: 'shammah-theme-teal',
  },
  {
    id: 'audio-podcast-campus',
    title: 'Faith in Campus Life: Boldness Without Fear',
    speaker: 'Evangelist Samuel',
    church: 'Mount Zion Cathedral',
    duration: '15:30',
    type: 'Podcast',
    cover: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=400',
    theme: 'shammah-theme-rose',
  },
];

export function AudioShelfWidget({ onSelectSection }) {
  const containerRef = useShelfVisibilityTrigger('podcasts');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();
  const [playingId, setPlayingId] = useState(null);

  function togglePlay(trackId) {
    if (dragInfo.current.hasMoved) return;
    playSound('reaction');
    setPlayingId((prev) => (prev === trackId ? null : trackId));
  }

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Headphones size={17} className="hl-icon text-amber-400" />
          <span>Sermons &amp; Worship Audio</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('podcasts')}
        >
          <span>Listen All</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll audio back" rightLabel="Scroll audio forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {INITIAL_FEED_AUDIO.map((track) => {
            const isPlaying = playingId === track.id;

            return (
              <div
                key={track.id}
                className={`shammah-shelf-item shammah-shelf-audio ${track.theme}`}
                onClick={() => {
                  if (dragInfo.current.hasMoved) return;
                  togglePlay(track.id);
                }}
              >
                <div
                  className="shammah-shelf-audio-thumb"
                  style={{ backgroundImage: `url(${track.cover})` }}
                >
                  <div className="shammah-shelf-audio-overlay" />
                  <button
                    type="button"
                    className={`shammah-shelf-audio-play-btn${isPlaying ? ' is-playing' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(track.id);
                    }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
                  </button>
                  <div className="shammah-shelf-top-badges">
                    <span className="shammah-shelf-tag-chip">{track.type}</span>
                    <span className="shammah-shelf-time-chip">{track.duration}</span>
                  </div>
                  {isPlaying && (
                    <div className="shammah-shelf-wave-bars">
                      <span className="shammah-wave-bar bar-1" />
                      <span className="shammah-wave-bar bar-2" />
                      <span className="shammah-wave-bar bar-3" />
                      <span className="shammah-wave-bar bar-4" />
                    </div>
                  )}
                </div>

                <div className="shammah-shelf-audio-content">
                  <h4 className="shammah-shelf-card-title truncate-2">{track.title}</h4>
                  <div className="shammah-shelf-audio-meta">
                    <span className="shammah-shelf-speaker truncate">{track.speaker}</span>
                    <span className="shammah-shelf-church truncate">{track.church}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}

// ============================================================================
// 3. COURSES SHELF WIDGET
// ============================================================================
const INITIAL_FEED_COURSES = [
  {
    id: 'course-foundations',
    title: 'Foundations of Faith: The New Covenant Pillars',
    instructor: 'Pastor David Mwangi',
    level: 'Foundational',
    lessons: '6 modules · 24 lessons',
    cover: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
    theme: 'shammah-theme-violet',
    studentsCount: '1.2k learners',
  },
  {
    id: 'course-prayer-warfare',
    title: 'Spiritual Warfare & Victorious Intercession',
    instructor: 'Deaconess Rebecca',
    level: 'Intermediate',
    lessons: '5 modules · 18 lessons',
    cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    theme: 'shammah-theme-emerald',
    studentsCount: '850 learners',
  },
  {
    id: 'course-worship-prophetic',
    title: 'Prophetic Worship & Heart of the Psalmist',
    instructor: 'Sister Mary Grace',
    level: 'Practical Ministry',
    lessons: '4 modules · 14 lessons',
    cover: 'https://images.unsplash.com/photo-1510172951991-856a654063f9?w=400',
    theme: 'shammah-theme-amber',
    studentsCount: '920 learners',
  },
  {
    id: 'course-marketplace-leadership',
    title: 'Kingdom Leadership in the Marketplace & Tech',
    instructor: 'Brother John Ochieng',
    level: 'Advanced Leadership',
    lessons: '8 modules · 32 lessons',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
    theme: 'shammah-theme-cyan',
    studentsCount: '640 learners',
  },
];

export function CoursesShelfWidget({ onSelectSection }) {
  const containerRef = useShelfVisibilityTrigger('courses');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <GraduationCap size={17} className="hl-icon text-violet-400" />
          <span>Discipleship Academy &amp; Courses</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('courses')}
        >
          <span>All Courses</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll courses back" rightLabel="Scroll courses forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {INITIAL_FEED_COURSES.map((course) => (
            <div
              key={course.id}
              className={`shammah-shelf-item shammah-shelf-course ${course.theme}`}
              onClick={() => {
                if (dragInfo.current.hasMoved) return;
                playSound('reaction');
                onSelectSection?.('courses');
              }}
            >
              <div
                className="shammah-shelf-course-thumb"
                style={{ backgroundImage: `url(${course.cover})` }}
              >
                <div className="shammah-shelf-course-overlay" />
                <span className="shammah-shelf-course-level">{course.level}</span>
                <span className="shammah-shelf-learners-chip">{course.studentsCount}</span>
              </div>

              <div className="shammah-shelf-course-content">
                <h4 className="shammah-shelf-card-title truncate-2">{course.title}</h4>
                <div className="shammah-shelf-course-meta">
                  <span className="shammah-shelf-course-instructor truncate">{course.instructor}</span>
                  <span className="shammah-shelf-course-lessons truncate">{course.lessons}</span>
                </div>

                <div className="shammah-shelf-footer">
                  <button
                    type="button"
                    className="shammah-shelf-enroll-btn"
                    onClick={(e) => {
                      if (dragInfo.current.hasMoved) return;
                      e.stopPropagation();
                      playSound('reaction');
                      onSelectSection?.('courses');
                    }}
                  >
                    <span>Start Course</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}

// ============================================================================
// 4. BIBLE VERSE OF THE DAY SHELF WIDGET
// ============================================================================
const SCRIPTURE_CARDS = [
  {
    id: 'verse-psalm46',
    reference: 'Psalm 46:1',
    text: '“God is our refuge and strength, a very present help in trouble.”',
    reflection: 'Even when the earth gives way and mountains fall into the heart of the sea, His peace surrounds you.',
    theme: 'shammah-theme-emerald',
    tag: 'Daily Promise',
  },
  {
    id: 'verse-isaiah40',
    reference: 'Isaiah 40:31',
    text: '“Those who wait upon the Lord shall renew their strength; they shall mount up with wings like eagles.”',
    reflection: 'Waiting on God is not passive delay — it is deep spiritual renewal and confident anticipation.',
    theme: 'shammah-theme-amber',
    tag: 'Strength & Renewal',
  },
  {
    id: 'verse-philippians4',
    reference: 'Philippians 4:6-7',
    text: '“Be anxious for nothing, but in everything by prayer and thanksgiving, let your requests be made known unto God.”',
    reflection: 'Exchange restless anxiety for the supernatural peace that guards your mind in Christ Jesus.',
    theme: 'shammah-theme-cyan',
    tag: 'Peace of God',
  },
  {
    id: 'verse-numbers6',
    reference: 'Numbers 6:24-26',
    text: '“The Lord bless you and keep you; the Lord make His face shine upon you and be gracious to you.”',
    reflection: 'Receive the timeless Aaronic priestly blessing over your home, health, family, and steps today.',
    theme: 'shammah-theme-violet',
    tag: 'Priestly Blessing',
  },
];

export function DailyVerseShelfWidget({ onSelectSection }) {
  const containerRef = useShelfVisibilityTrigger('bible');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();
  const [copiedId, setCopiedId] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  function handleCopy(card) {
    if (dragInfo.current.hasMoved) return;
    playSound('reaction');
    const textToCopy = `${card.text}\n— ${card.reference}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleBookmark(cardId) {
    if (dragInfo.current.hasMoved) return;
    playSound('reaction');
    setBookmarkedIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <BookOpen size={17} className="hl-icon text-emerald-400" />
          <span>Bible Verse of the Day &amp; Scripture</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('bible')}
        >
          <span>Open Bible</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll verses back" rightLabel="Scroll verses forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {SCRIPTURE_CARDS.map((card) => {
            const isCopied = copiedId === card.id;
            const isBookmarked = bookmarkedIds.includes(card.id);

            return (
              <div key={card.id} className={`shammah-shelf-item shammah-shelf-verse ${card.theme}`}>
                <div className="shammah-shelf-item-top">
                  <span className="shammah-shelf-tag-chip">{card.tag}</span>
                  <div className="shammah-shelf-verse-actions">
                    <button
                      type="button"
                      className="shammah-shelf-icon-btn"
                      onClick={() => handleCopy(card)}
                      title="Copy verse"
                    >
                      {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    <button
                      type="button"
                      className={`shammah-shelf-icon-btn${isBookmarked ? ' active text-amber-400' : ''}`}
                      onClick={() => handleBookmark(card.id)}
                      title="Save bookmark"
                    >
                      <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                <blockquote className="shammah-shelf-verse-quote">{card.text}</blockquote>
                <strong className="shammah-shelf-verse-ref">{card.reference}</strong>
                <p className="shammah-shelf-verse-reflection">{card.reflection}</p>

                <div className="shammah-shelf-footer">
                  <button
                    type="button"
                    className="shammah-shelf-footer-btn"
                    onClick={() => {
                      if (dragInfo.current.hasMoved) return;
                      playSound('reaction');
                      onSelectSection?.('bible');
                    }}
                  >
                    <span>Read whole chapter</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}

// ============================================================================
// 5. FUNDRAISERS SHELF WIDGET
// ============================================================================
const INITIAL_FEED_FUNDRAISERS = [
  {
    id: 'turkana-borehole',
    name: 'Turkana Clean Water Borehole & Solar Pump',
    tag: 'Mercy & Outreach',
    icon: '💧',
    description: 'Drilling deep borehole & solar purifier for pastoralist families & local schools.',
    targetKes: 650000,
    raisedKes: 520000,
    donorsCount: 312,
    theme: 'shammah-theme-emerald',
  },
  {
    id: 'eldoret-sanctuary',
    name: 'Eldoret Worship Chapel Roof Restoration',
    tag: 'Church Building',
    icon: '⛪',
    description: 'Installing iron sheets and acoustic ceiling insulation before rainy season.',
    targetKes: 450000,
    raisedKes: 310000,
    donorsCount: 198,
    theme: 'shammah-theme-amber',
  },
  {
    id: 'community-food-drive',
    name: 'Community Food Drive & Slum Relief',
    tag: 'Mercy & Outreach',
    icon: '🍞',
    description: 'Supplying dry food rations & clean water to vulnerable families in Mathare & Kibera.',
    targetKes: 350000,
    raisedKes: 228900,
    donorsCount: 265,
    theme: 'shammah-theme-rose',
  },
  {
    id: 'rural-av-equipment',
    name: 'Rural Fellowship Solar Sound & AV Gear',
    tag: 'Church Building',
    icon: '🔊',
    description: 'Equipping village churches with solar battery sound systems and projection.',
    targetKes: 300000,
    raisedKes: 142000,
    donorsCount: 114,
    theme: 'shammah-theme-cyan',
  },
];

export function FundraisersShelfWidget({ onSelectSection, currentUser }) {
  const containerRef = useShelfVisibilityTrigger('fundraisers');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();
  const [selectedMpesaProject, setSelectedMpesaProject] = useState(null);

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <HeartHandshake size={17} className="hl-icon text-emerald-400" />
          <span>Kingdom Causes &amp; Fundraisers</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('fundraisers')}
        >
          <span>All Causes</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll causes back" rightLabel="Scroll causes forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {INITIAL_FEED_FUNDRAISERS.map((fund) => {
            const pct = Math.min(100, Math.round((fund.raisedKes / fund.targetKes) * 100));

            return (
              <div key={fund.id} className={`shammah-shelf-item shammah-shelf-fund ${fund.theme}`}>
                <div className="shammah-shelf-item-top">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{fund.icon}</span>
                    <span className="shammah-shelf-tag-chip">{fund.tag}</span>
                  </div>
                  <span className="shammah-shelf-donors-chip">{fund.donorsCount} givers</span>
                </div>

                <h4 className="shammah-shelf-card-title truncate-2">{fund.name}</h4>
                <p className="shammah-shelf-card-desc truncate-2">{fund.description}</p>

                <div className="shammah-shelf-progress-box">
                  <div className="shammah-shelf-progress-meta">
                    <span className="shammah-shelf-raised-kes">KES {fund.raisedKes.toLocaleString()}</span>
                    <span className="shammah-shelf-pct-num">{pct}%</span>
                  </div>
                  <div className="shammah-shelf-progress-track">
                    <div className="shammah-shelf-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shammah-shelf-target-sub">Goal: KES {fund.targetKes.toLocaleString()}</span>
                </div>

                <div className="shammah-shelf-footer">
                  <button
                    type="button"
                    className="shammah-shelf-sow-mpesa-btn"
                    onClick={(e) => {
                      if (dragInfo.current.hasMoved) return;
                      e.stopPropagation();
                      playSound('reaction');
                      setSelectedMpesaProject(fund.id);
                    }}
                  >
                    <Heart size={13} fill="currentColor" />
                    <span>Sow via M-Pesa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollAffordanceWrapper>

      {selectedMpesaProject && (
        <MpesaPaymentModal
          defaultProjectId={selectedMpesaProject}
          currentUser={currentUser}
          onClose={() => setSelectedMpesaProject(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// 6. FAITH CHALLENGES SHELF WIDGET
// ============================================================================
const INITIAL_FEED_CHALLENGES = [
  {
    id: 'c-scripture-60',
    title: '#ScriptureIn60s Challenge',
    tag: '#ScriptureIn60s',
    tagline: 'Recite or dramatize your favorite verse with passion in 60s!',
    icon: '⚡',
    participantsCount: 1420,
    deadline: 'Active this week',
    theme: 'shammah-theme-violet',
  },
  {
    id: 'c-acoustic-worship',
    title: '#AcousticWorship Challenge',
    tag: '#AcousticWorship',
    tagline: 'Record a raw acoustic praise chorus lifting Jesus high.',
    icon: '🎸',
    participantsCount: 980,
    deadline: '4 days left',
    theme: 'shammah-theme-rose',
  },
  {
    id: 'c-daniel-fast',
    title: '#DanielFast21 & Morning Watch',
    tag: '#DanielFast21',
    tagline: '21 days of consecrated prayer, scripture fasting and spiritual clarity.',
    icon: '🕊️',
    participantsCount: 2350,
    deadline: 'Active now',
    theme: 'shammah-theme-amber',
  },
  {
    id: 'c-proverbs-wisdom',
    title: '#DailyProverbWisdom Challenge',
    tag: '#DailyProverbWisdom',
    tagline: 'Read 1 Chapter of Proverbs every day matching today’s calendar date.',
    icon: '👑',
    participantsCount: 3100,
    deadline: 'Daily streak',
    theme: 'shammah-theme-teal',
  },
];

export function FaithChallengesShelfWidget({ onSelectSection }) {
  const containerRef = useShelfVisibilityTrigger('challenges');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();
  const [joinedChallenges, setJoinedChallenges] = useState([]);

  function toggleJoin(challengeId) {
    if (dragInfo.current.hasMoved) return;
    playSound('reaction');
    setJoinedChallenges((prev) =>
      prev.includes(challengeId) ? prev.filter((id) => id !== challengeId) : [...prev, challengeId]
    );
  }

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Sparkles size={17} className="hl-icon text-purple-400" />
          <span>Faith Challenges &amp; Streaks</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('challenges')}
        >
          <span>All Challenges</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll challenges back" rightLabel="Scroll challenges forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {INITIAL_FEED_CHALLENGES.map((ch) => {
            const isJoined = joinedChallenges.includes(ch.id);

            return (
              <div key={ch.id} className={`shammah-shelf-item shammah-shelf-challenge ${ch.theme}`}>
                <div className="shammah-shelf-item-top">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl" aria-hidden="true">{ch.icon}</span>
                    <span className="shammah-shelf-tag-chip">{ch.tag}</span>
                  </div>
                  <span className="shammah-shelf-deadline-chip">{ch.deadline}</span>
                </div>

                <h4 className="shammah-shelf-card-title truncate-2">{ch.title}</h4>
                <p className="shammah-shelf-card-desc truncate-2">{ch.tagline}</p>

                <div className="shammah-shelf-participants-box">
                  <Users size={12} className="text-[var(--ink-muted)]" />
                  <span>
                    {(ch.participantsCount + (isJoined ? 1 : 0)).toLocaleString()} participants
                  </span>
                </div>

                <div className="shammah-shelf-footer">
                  <button
                    type="button"
                    className={`shammah-shelf-join-btn${isJoined ? ' is-joined' : ''}`}
                    onClick={(e) => {
                      if (dragInfo.current.hasMoved) return;
                      e.stopPropagation();
                      toggleJoin(ch.id);
                    }}
                  >
                    {isJoined ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Joined Streak!</span>
                      </>
                    ) : (
                      <>
                        <Flame size={13} className="text-amber-400" />
                        <span>Join Challenge</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}

// ============================================================================
// 7. ARCADE GAMES SHELF WIDGET
// ============================================================================
const INITIAL_FEED_GAMES = [
  {
    id: 'game-trivia-champion',
    title: 'Bible Trivia Champion',
    category: 'Kids, Teens & Adults',
    icon: '🏆',
    description: 'Fast-paced multi-tier Bible knowledge challenge with scripture hints.',
    highScore: '450 pts',
    theme: 'shammah-theme-cyan',
  },
  {
    id: 'game-david-sling',
    title: 'David vs. Goliath Sling',
    category: 'Youth Action Arcade',
    icon: '🎯',
    description: 'Adjust angle & power to launch 5 smooth stones at Goliath in Elah valley.',
    highScore: '320 pts',
    theme: 'shammah-theme-violet',
  },
  {
    id: 'game-noah-ark',
    title: 'Noah’s Animal Pairs Memory',
    category: 'Memory & Speed',
    icon: '🦁',
    description: 'Match animal pairs two by two before the 45-second timer runs out.',
    highScore: '100% Match',
    theme: 'shammah-theme-emerald',
  },
  {
    id: 'game-scripture-scramble',
    title: 'Scripture Scramble Quest',
    category: 'Word Puzzle',
    icon: '🧩',
    description: 'Reassemble scrambled verses from Psalms and Proverbs under pressure.',
    highScore: '580 pts',
    theme: 'shammah-theme-amber',
  },
];

export function ArcadeGamesShelfWidget({ onSelectSection }) {
  const containerRef = useShelfVisibilityTrigger('games');
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useShelfDragScroll();

  return (
    <div ref={containerRef} className="home-highlight-card shammah-shelf-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Gamepad2 size={17} className="hl-icon text-cyan-400" />
          <span>Faith Arcade &amp; Bible Trivia Games</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => onSelectSection?.('games')}
        >
          <span>Play Arcade</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll games back" rightLabel="Scroll games forward">
        <div
          ref={ref}
          className="shammah-shelf-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {INITIAL_FEED_GAMES.map((game) => (
            <div
              key={game.id}
              className={`shammah-shelf-item shammah-shelf-arcade ${game.theme}`}
              onClick={() => {
                if (dragInfo.current.hasMoved) return;
                playSound('reaction');
                onSelectSection?.('games');
              }}
            >
              <div className="shammah-shelf-item-top">
                <span className="text-2xl" aria-hidden="true">{game.icon}</span>
                <span className="shammah-shelf-highscore-badge">High: {game.highScore}</span>
              </div>

              <h4 className="shammah-shelf-card-title truncate">{game.title}</h4>
              <span className="shammah-shelf-arcade-cat truncate">{game.category}</span>
              <p className="shammah-shelf-card-desc truncate-2">{game.description}</p>

              <div className="shammah-shelf-footer">
                <button
                  type="button"
                  className="shammah-shelf-arcade-btn"
                  onClick={(e) => {
                    if (dragInfo.current.hasMoved) return;
                    e.stopPropagation();
                    playSound('reaction');
                    onSelectSection?.('games');
                  }}
                >
                  <Gamepad2 size={13} />
                  <span>Play Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}
