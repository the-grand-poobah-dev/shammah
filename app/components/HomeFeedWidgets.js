'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Headphones,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  Flame,
  Gamepad2,
  ChevronRight,
  Play,
  Pause,
  Check,
  Sparkles,
  Users,
  Trophy,
  Copy,
  CheckCheck,
  ExternalLink,
  Coins,
  ShieldCheck,
  Volume2,
  Share2,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { ScrollAffordanceWrapper } from './ScrollAffordance';
import { playSound } from '../lib/soundEffects';
import { getIcebreakerPolls, getUserVotes, voteOnIcebreakerPoll } from '../lib/icebreakerPolls';
import { COURSES_CATALOG } from './CoursesView';
import { COMMUNITY_PROJECTS } from './MpesaPaymentModal';
import { markContentSeen } from '../lib/contentCounterManager';

// Custom drag-scroll hook matching existing HomeHighlights pattern
function useDragScroll() {
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
    const walk = (x - dragInfo.current.startX) * 1.35;
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

// =============================================================================
// 1. Trending Polls Widget
// =============================================================================
export function TrendingPollsCard({ onSelectSection, onVoted }) {
  const [polls, setPolls] = useState(() => getIcebreakerPolls());
  const [userVotes, setUserVotes] = useState(() => getUserVotes());
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  useEffect(() => {
    function refresh() {
      setPolls(getIcebreakerPolls());
      setUserVotes(getUserVotes());
    }
    window.addEventListener('shammah:icebreaker-polls-updated', refresh);
    return () => window.removeEventListener('shammah:icebreaker-polls-updated', refresh);
  }, []);

  function handleVote(pollId, optionId, e) {
    if (dragInfo.current.hasMoved) return;
    e.stopPropagation();
    if (userVotes[pollId]) return;

    playSound('reaction');
    voteOnIcebreakerPoll(pollId, optionId);
    setUserVotes(getUserVotes());
    setPolls(getIcebreakerPolls());
    markContentSeen('polls');
    onVoted?.(pollId, optionId);
  }

  const pollThemes = [
    'poll-theme-cyan',
    'poll-theme-violet',
    'poll-theme-amber',
    'poll-theme-emerald',
    'poll-theme-rose',
  ];

  return (
    <div className="home-highlight-card polls-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <BarChart3 size={17} className="hl-icon" style={{ color: '#06b6d4' }} />
          <span>Trending &amp; Live Polls</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('polls');
            onSelectSection?.('polls');
          }}
        >
          <span>All polls</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll polls back" rightLabel="Scroll polls forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {polls.slice(0, 6).map((poll, idx) => {
            const hasVoted = Boolean(userVotes[poll.id]);
            const selectedOption = userVotes[poll.id];
            const themeClass = pollThemes[idx % pollThemes.length];
            const totalVotes = (poll.options || []).reduce((acc, o) => acc + (o.votes || 0), 0);

            return (
              <div key={poll.id} className={`poll-widget-color-card ${themeClass}`}>
                <div className="poll-widget-top">
                  <span className="poll-widget-category">{poll.category || 'Sunday Poll'}</span>
                  <span className="poll-widget-count">{totalVotes} votes</span>
                </div>

                <h4 className="poll-widget-question">{poll.question}</h4>

                <div className="poll-widget-options">
                  {(poll.options || []).map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    const percent = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`poll-widget-opt-btn${isSelected ? ' selected' : ''}${hasVoted ? ' voted' : ''}`}
                        onClick={(e) => handleVote(poll.id, opt.id, e)}
                        disabled={hasVoted}
                      >
                        {hasVoted && (
                          <div
                            className="poll-opt-progress-bar"
                            style={{ width: `${percent}%` }}
                          />
                        )}
                        <span className="poll-opt-label">
                          {isSelected && <Check size={12} className="inline-mr" />}
                          {opt.text}
                        </span>
                        {hasVoted && <span className="poll-opt-percent">{percent}%</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="poll-widget-footer">
                  <span className="poll-widget-church">{poll.churchName || 'Faith Community'}</span>
                  <button
                    type="button"
                    className="poll-widget-participate-btn"
                    onClick={() => {
                      markContentSeen('polls');
                      onSelectSection?.('polls');
                    }}
                  >
                    <span>{hasVoted ? 'Results' : 'Vote'}</span>
                    <ChevronRight size={12} />
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

// =============================================================================
// 2. Audio & Podcasts Widget
// =============================================================================
const SAMPLE_AUDIO_HIGHLIGHTS = [
  {
    id: 'audio-sermon-secret-place',
    title: 'The Secret Place of the Most High',
    preacher: 'Pastor David Mwangi',
    church: 'Shammah Assembly of Saints',
    duration: '32:40',
    category: 'Sermon',
    color: '#0ea5e9',
    cover: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=500',
    plays: 1240,
    theme: 'audio-theme-blue',
  },
  {
    id: 'audio-worship-unfailing-love',
    title: 'Unfailing Love: Live Prophetic Worship',
    preacher: 'Esther Mutua & Worship Team',
    church: 'Nairobi Praise Tabernacle',
    duration: '18:15',
    category: 'Worship Track',
    color: '#ec4899',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
    plays: 2890,
    theme: 'audio-theme-rose',
  },
  {
    id: 'audio-podcast-leadership-fire',
    title: 'Leading With Integrity in the Marketplace',
    preacher: 'Bishop Joseph Kamau',
    church: 'Kingdom Vision Ministries',
    duration: '24:50',
    category: 'Podcast',
    color: '#8b5cf6',
    cover: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500',
    plays: 850,
    theme: 'audio-theme-purple',
  },
  {
    id: 'audio-sermon-faith-over-fear',
    title: 'Overcoming Anxiety through Covenant Promises',
    preacher: 'Reverend Grace Omondi',
    church: 'Grace Living Waters Kisumu',
    duration: '29:10',
    category: 'Devotional',
    color: '#10b981',
    cover: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=500',
    plays: 1670,
    theme: 'audio-theme-emerald',
  },
];

export function TrendingAudioCard({ onSelectSection, onPlayTrack }) {
  const [playingId, setPlayingId] = useState(null);
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  function handlePlay(track, e) {
    if (dragInfo.current.hasMoved) return;
    e.stopPropagation();
    playSound('reaction');
    const nextId = playingId === track.id ? null : track.id;
    setPlayingId(nextId);
    markContentSeen('podcasts');

    if (onPlayTrack) {
      onPlayTrack(track);
    } else {
      window.dispatchEvent(
        new CustomEvent('shammah:play-audio', {
          detail: {
            title: track.title,
            artist: track.preacher,
            church: track.church,
            cover_image: track.cover,
            audio_url: 'https://actions.google.com/sounds/v1/ambiences/gentle_stream.ogg',
          },
        })
      );
    }
  }

  return (
    <div className="home-highlight-card audio-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Headphones size={17} className="hl-icon" style={{ color: '#0ea5e9' }} />
          <span>Sermons &amp; Worship Audio</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('podcasts');
            onSelectSection?.('podcasts');
          }}
        >
          <span>Listen all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll audio back" rightLabel="Scroll audio forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {SAMPLE_AUDIO_HIGHLIGHTS.map((t) => {
            const isPlaying = playingId === t.id;

            return (
              <div
                key={t.id}
                className={`audio-widget-color-card ${t.theme}`}
                onClick={(e) => handlePlay(t, e)}
              >
                <div className="audio-widget-cover-box">
                  <img src={t.cover} alt={t.title} className="audio-widget-img" loading="lazy" />
                  <button
                    type="button"
                    className={`audio-play-floating-btn${isPlaying ? ' playing' : ''}`}
                    aria-label={isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                    onClick={(e) => handlePlay(t, e)}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
                  </button>
                  <span className="audio-widget-duration">{t.duration}</span>
                </div>

                <div className="audio-widget-info">
                  <span className="audio-widget-tag">{t.category}</span>
                  <h4 className="audio-widget-title" title={t.title}>{t.title}</h4>
                  <div className="audio-widget-preacher-row">
                    <span className="audio-widget-preacher">{t.preacher}</span>
                    <span className="audio-widget-plays">{t.plays} listens</span>
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

// =============================================================================
// 3. Featured Courses Widget
// =============================================================================
export function TrendingCoursesCard({ onSelectSection }) {
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  const courses = COURSES_CATALOG.slice(0, 5);

  const courseThemes = [
    'course-theme-purple',
    'course-theme-sapphire',
    'course-theme-emerald',
    'course-theme-amber',
    'course-theme-ruby',
  ];

  return (
    <div className="home-highlight-card courses-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <GraduationCap size={17} className="hl-icon" style={{ color: '#8b5cf6' }} />
          <span>Discipleship Courses &amp; Academy</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('courses');
            onSelectSection?.('courses');
          }}
        >
          <span>Explore academy</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll courses back" rightLabel="Scroll courses forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {courses.map((c, i) => {
            const themeClass = courseThemes[i % courseThemes.length];

            return (
              <div
                key={c.id}
                className={`course-widget-color-card ${themeClass}`}
                onClick={() => {
                  if (dragInfo.current.hasMoved) return;
                  markContentSeen('courses');
                  onSelectSection?.('courses');
                }}
              >
                <div className="course-widget-cover-wrap">
                  <img src={c.cover} alt={c.title} className="course-widget-img" loading="lazy" />
                  <span className="course-widget-level">{c.level || 'Foundational'}</span>
                </div>

                <div className="course-widget-body">
                  <h4 className="course-widget-title" title={c.title}>{c.title}</h4>

                  <div className="course-widget-instructor">
                    <Avatar name={c.instructor} src={c.avatar} size={24} className="avatar-xs" />
                    <span className="course-widget-instructor-name">{c.instructor}</span>
                    <VerifiedBadge badge={c.badge || 'pastor'} size={12} />
                  </div>

                  <div className="course-widget-footer">
                    <span className="course-widget-lessons">6 Modules • Certificate</span>
                    <button
                      type="button"
                      className="course-widget-start-btn"
                      onClick={(e) => {
                        if (dragInfo.current.hasMoved) return;
                        e.stopPropagation();
                        markContentSeen('courses');
                        onSelectSection?.('courses');
                      }}
                    >
                      <span>Enroll</span>
                      <ChevronRight size={13} />
                    </button>
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

// =============================================================================
// 4. Bible Verse of the Day Widget
// =============================================================================
const SCRIPTURE_VERSES = [
  {
    id: 'vod-joshua-1-9',
    reference: 'Joshua 1:9',
    version: 'NIV',
    text: '“Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.”',
    devotional: 'True courage does not come from self-confidence, but from the unshakeable presence of God who walks beside you in every battle today.',
    theme: 'verse-theme-gold',
    tag: 'Daily Courage',
    color: '#f59e0b',
  },
  {
    id: 'vod-isaiah-40-31',
    reference: 'Isaiah 40:31',
    version: 'NIV',
    text: '“Those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.”',
    devotional: 'When human strength exhausts itself, waiting on the Lord invites divine acceleration and supernatural endurance.',
    theme: 'verse-theme-sapphire',
    tag: 'Renewed Strength',
    color: '#0ea5e9',
  },
  {
    id: 'vod-romans-8-28',
    reference: 'Romans 8:28',
    version: 'NKJV',
    text: '“And we know that all things work together for good to those who love God, to those who are the called according to His purpose.”',
    devotional: 'No season is wasted in God’s kingdom. Even unexpected delays are woven into His master purpose for your life.',
    theme: 'verse-theme-emerald',
    tag: 'Kingdom Purpose',
    color: '#10b981',
  },
  {
    id: 'vod-philippians-4-6',
    reference: 'Philippians 4:6-7',
    version: 'NIV',
    text: '“Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.”',
    devotional: 'Trade your restless anxiety for prayer and quiet thanksgiving, and allow His supernatural peace to garrison your heart.',
    theme: 'verse-theme-purple',
    tag: 'Divine Peace',
    color: '#8b5cf6',
  },
];

export function VerseOfTheDayCard({ onSelectSection }) {
  const [copiedId, setCopiedId] = useState(null);
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  function handleCopyVerse(v, e) {
    if (dragInfo.current.hasMoved) return;
    e.stopPropagation();
    playSound('reaction');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${v.text} — ${v.reference} (${v.version})`);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  }

  return (
    <div className="home-highlight-card verse-of-day-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <BookOpen size={17} className="hl-icon" style={{ color: '#f59e0b' }} />
          <span>Bible Verse of the Day</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('bible');
            onSelectSection?.('bible');
          }}
        >
          <span>Open Bible</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll scripture back" rightLabel="Scroll scripture forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {SCRIPTURE_VERSES.map((v) => (
            <div key={v.id} className={`verse-widget-color-card ${v.theme}`}>
              <div className="verse-widget-top">
                <span className="verse-widget-badge">{v.tag}</span>
                <span className="verse-widget-ref">{v.reference} ({v.version})</span>
              </div>

              <blockquote className="verse-widget-text">{v.text}</blockquote>

              <p className="verse-widget-devotional">{v.devotional}</p>

              <div className="verse-widget-actions">
                <button
                  type="button"
                  className="verse-widget-btn copy"
                  onClick={(e) => handleCopyVerse(v, e)}
                  title="Copy scripture to clipboard"
                >
                  {copiedId === v.id ? <CheckCheck size={13} /> : <Copy size={13} />}
                  <span>{copiedId === v.id ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  className="verse-widget-btn read"
                  onClick={() => {
                    markContentSeen('bible');
                    onSelectSection?.('bible');
                  }}
                  title="Read full chapter in Bible Reader"
                >
                  <span>Read Chapter</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}

// =============================================================================
// 5. Community Fundraisers Widget
// =============================================================================
export function FundraisersGivingCard({ onSelectSection, onOpenGivingModal }) {
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  const causes = COMMUNITY_PROJECTS.slice(0, 4);

  const causeThemes = [
    'cause-theme-emerald',
    'cause-theme-sapphire',
    'cause-theme-amber',
    'cause-theme-rose',
  ];

  return (
    <div className="home-highlight-card fundraisers-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <HeartHandshake size={17} className="hl-icon" style={{ color: '#10b981' }} />
          <span>Community Projects &amp; Causes</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('fundraisers');
            onSelectSection?.('fundraisers');
          }}
        >
          <span>All causes</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll causes back" rightLabel="Scroll causes forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {causes.map((item, idx) => {
            const percent = Math.min(100, Math.round((item.raisedKes / item.targetKes) * 100));
            const themeClass = causeThemes[idx % causeThemes.length];

            return (
              <div key={item.id} className={`fundraiser-widget-color-card ${themeClass}`}>
                <div className="fundraiser-card-top">
                  <span className="fundraiser-card-icon-pill">{item.icon}</span>
                  <span className="fundraiser-card-tag">{item.tag}</span>
                </div>

                <h4 className="fundraiser-card-title">{item.name}</h4>
                <p className="fundraiser-card-desc">{item.description}</p>

                <div className="fundraiser-progress-block">
                  <div className="fundraiser-progress-bar-bg">
                    <div className="fundraiser-progress-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="fundraiser-progress-meta">
                    <span className="fundraiser-raised">KES {item.raisedKes.toLocaleString()}</span>
                    <span className="fundraiser-percent">{percent}% of KES {item.targetKes.toLocaleString()}</span>
                  </div>
                </div>

                <div className="fundraiser-card-footer">
                  <span className="fundraiser-donors-count">300+ Donors</span>
                  <button
                    type="button"
                    className="fundraiser-give-btn"
                    onClick={(e) => {
                      if (dragInfo.current.hasMoved) return;
                      e.stopPropagation();
                      playSound('reaction');
                      markContentSeen('fundraisers');
                      if (onOpenGivingModal) {
                        onOpenGivingModal(item);
                      } else {
                        onSelectSection?.('fundraisers');
                      }
                    }}
                  >
                    <Coins size={13} />
                    <span>Support</span>
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

// =============================================================================
// 6. Faith Challenges Widget
// =============================================================================
const SAMPLE_CHALLENGES = [
  {
    id: 'c-scripture-60',
    title: '#ScriptureIn60s Challenge',
    tagline: 'Recite or dramatize your favourite Bible verse with passion under 60s!',
    icon: '⚡',
    badge: 'Trending #1',
    participants: 1420,
    theme: 'challenge-theme-amber',
    reward: '+50 Faith Pts',
  },
  {
    id: 'c-acoustic-worship',
    title: '#AcousticWorship Cover',
    tagline: 'Record a raw acoustic, piano, or vocal worship chorus that lifts Jesus high.',
    icon: '🎸',
    badge: 'Popular',
    participants: 980,
    theme: 'challenge-theme-violet',
    reward: 'Worship Badge',
  },
  {
    id: 'c-sunday-fit',
    title: '#SundayFitCheck & Word',
    tagline: 'Show your Sunday church outfit paired with a verse on reverence & joy.',
    icon: '👗',
    badge: 'Youth & Teens',
    participants: 1850,
    theme: 'challenge-theme-rose',
    reward: '+30 Faith Pts',
  },
  {
    id: 'c-gratitude-7day',
    title: '#7DaysOfGratitude',
    tagline: 'Share 1 thing God has done for you every morning this week with scripture.',
    icon: '🙏',
    badge: 'Community Streak',
    participants: 2150,
    theme: 'challenge-theme-emerald',
    reward: 'Praise Trophy',
  },
];

export function TrendingChallengesCard({ onSelectSection }) {
  const [joinedChallenges, setJoinedChallenges] = useState({});
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  function handleJoin(cId, e) {
    if (dragInfo.current.hasMoved) return;
    e.stopPropagation();
    playSound('reaction');
    setJoinedChallenges((prev) => ({ ...prev, [cId]: !prev[cId] }));
    markContentSeen('challenges');
  }

  return (
    <div className="home-highlight-card challenges-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Flame size={17} className="hl-icon" style={{ color: '#f97316' }} />
          <span>Faith Challenges &amp; Streaks</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('challenges');
            onSelectSection?.('challenges');
          }}
        >
          <span>Join challenges</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll challenges back" rightLabel="Scroll challenges forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {SAMPLE_CHALLENGES.map((ch) => {
            const isJoined = Boolean(joinedChallenges[ch.id]);

            return (
              <div key={ch.id} className={`challenge-widget-color-card ${ch.theme}`}>
                <div className="challenge-widget-top">
                  <span className="challenge-icon-box">{ch.icon}</span>
                  <span className="challenge-badge">{ch.badge}</span>
                </div>

                <h4 className="challenge-title">{ch.title}</h4>
                <p className="challenge-tagline">{ch.tagline}</p>

                <div className="challenge-reward-row">
                  <Trophy size={13} className="challenge-reward-icon" />
                  <span className="challenge-reward-text">{ch.reward}</span>
                </div>

                <div className="challenge-footer">
                  <span className="challenge-participants">{ch.participants + (isJoined ? 1 : 0)} joined</span>
                  <button
                    type="button"
                    className={`challenge-join-btn${isJoined ? ' joined' : ''}`}
                    onClick={(e) => handleJoin(ch.id, e)}
                  >
                    {isJoined ? (
                      <>
                        <Check size={12} />
                        <span>Joined</span>
                      </>
                    ) : (
                      <span>Join</span>
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

// =============================================================================
// 7. Faith Arcade Games Widget
// =============================================================================
const ARCADE_GAMES = [
  {
    id: 'game-trivia-blitz',
    title: 'Daily Bible Trivia Blitz',
    tagline: 'Test your scriptural knowledge across 3 difficulty tiers against the clock!',
    icon: '⚡',
    category: 'Bible Trivia',
    players: '3.4k Plays',
    theme: 'arcade-theme-cyan',
  },
  {
    id: 'game-scripture-scramble',
    title: 'Scripture Memory Scramble',
    tagline: 'Reassemble scrambled verses word-by-word to commit key scriptures to memory.',
    icon: '🧩',
    category: 'Memory Game',
    players: '2.1k Plays',
    theme: 'arcade-theme-purple',
  },
  {
    id: 'game-heroes-quiz',
    title: 'Heroes of Faith Speed Quiz',
    tagline: 'Identify Old & New Testament kings, prophets, and apostles from clues.',
    icon: '👑',
    category: 'Quick Quiz',
    players: '1.8k Plays',
    theme: 'arcade-theme-emerald',
  },
  {
    id: 'game-david-goliath',
    title: 'Sling & Stones Reflex Arcade',
    tagline: 'Tap stones to hit targets of courage, truth, and faith in this arcade minigame.',
    icon: '🎯',
    category: 'Action Arcade',
    players: '4.2k Plays',
    theme: 'arcade-theme-amber',
  },
];

export function FaithArcadeWidgetCard({ onSelectSection }) {
  const { ref, onPointerDown, onPointerMove, onPointerUp, dragInfo } = useDragScroll();

  return (
    <div className="home-highlight-card arcade-card">
      <div className="home-highlight-header">
        <div className="hl-header-title">
          <Gamepad2 size={17} className="hl-icon" style={{ color: '#06b6d4' }} />
          <span>Faith Arcade &amp; Bible Trivia</span>
        </div>
        <button
          type="button"
          className="hl-view-all"
          onClick={() => {
            markContentSeen('games');
            onSelectSection?.('games');
          }}
        >
          <span>Play all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll arcade back" rightLabel="Scroll arcade forward">
        <div
          ref={ref}
          className="feed-widget-scroll no-scrollbar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {ARCADE_GAMES.map((g) => (
            <div
              key={g.id}
              className={`arcade-widget-color-card ${g.theme}`}
              onClick={() => {
                if (dragInfo.current.hasMoved) return;
                markContentSeen('games');
                onSelectSection?.('games');
              }}
            >
              <div className="arcade-widget-top">
                <span className="arcade-icon-circle">{g.icon}</span>
                <span className="arcade-category-badge">{g.category}</span>
              </div>

              <h4 className="arcade-game-title">{g.title}</h4>
              <p className="arcade-game-desc">{g.tagline}</p>

              <div className="arcade-widget-footer">
                <span className="arcade-players-count">{g.players}</span>
                <button
                  type="button"
                  className="arcade-play-btn"
                  onClick={(e) => {
                    if (dragInfo.current.hasMoved) return;
                    e.stopPropagation();
                    playSound('reaction');
                    markContentSeen('games');
                    onSelectSection?.('games');
                  }}
                >
                  <Play size={12} style={{ marginLeft: 1 }} />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollAffordanceWrapper>
    </div>
  );
}
