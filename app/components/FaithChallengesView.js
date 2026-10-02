'use client';
import { useState, useEffect } from 'react';
import {
  Flame,
  Sparkles,
  Trophy,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Heart,
  MessageCircle,
  Plus,
  X,
  Check,
  Video,
  Music,
  Award,
  ChevronRight,
  Send,
  Church,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { playSound } from '../lib/soundEffects';

const INITIAL_CHALLENGES = [
  {
    id: 'c-scripture-60',
    title: '#ScriptureIn60s Challenge',
    tag: '#ScriptureIn60s',
    tagline: 'Recite or dramatize your favorite Bible verse with passion in under 60 seconds!',
    icon: '⚡',
    badge: 'Trending #1',
    participantsCount: 1420,
    cheersCount: 8930,
    deadline: 'Active this week',
  },
  {
    id: 'c-worship-cover',
    title: '#AcousticWorship Challenge',
    tag: '#AcousticWorship',
    tagline: 'Record a raw acoustic, piano, or acapella worship chorus that lifts Jesus high.',
    icon: '🎸',
    badge: 'Popular',
    participantsCount: 980,
    cheersCount: 6540,
    deadline: '4 days left',
  },
  {
    id: 'c-sunday-fit',
    title: '#SundayFitCheck & Scripture',
    tag: '#SundayFitCheck',
    tagline: 'Show your Sunday best church outfit paired with your posture of worship (Psalm 96:9).',
    icon: '👗',
    badge: 'Youth & Teens',
    participantsCount: 1850,
    cheersCount: 12400,
    deadline: 'Active this Sunday',
  },
  {
    id: 'c-daily-testimony',
    title: '#1MinTestimony Miracle',
    tag: '#1MinTestimony',
    tagline: 'Share a 60-second testimony of God’s goodness, healing, or answered prayer.',
    icon: '🕊️',
    badge: 'Faith Builder',
    participantsCount: 760,
    cheersCount: 4890,
    deadline: 'Ongoing daily',
  },
];

const INITIAL_SUBMISSIONS = [
  {
    id: 'sub-1',
    challengeId: 'c-scripture-60',
    challengeTag: '#ScriptureIn60s',
    title: 'Romans 8:31-39 in one continuous breath! 🔥',
    author: {
      id: 'p-samuel',
      name: 'Evangelist Samuel',
      badge: 'youth',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      branch: 'UoN Christian Union',
    },
    videoUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
    audioTitle: 'Deep Worship Beat · Original Praise Sound',
    cheers: 842,
    commentsCount: 67,
    scripture: 'Romans 8:37',
    description: 'No matter what youth face on campus, in all these things we are MORE than conquerors! Tag someone who needs courage today! 🙏',
  },
  {
    id: 'sub-2',
    challengeId: 'c-worship-cover',
    challengeTag: '#AcousticWorship',
    title: 'Way Maker (Swahili & English Acoustic Mashup)',
    author: {
      id: 'p-mary',
      name: 'Sister Mary Grace',
      badge: 'worship',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      branch: 'CITAM Woodley Youth',
    },
    videoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    audioTitle: 'Acoustic Guitar in E Major · Mary Grace',
    cheers: 1240,
    commentsCount: 114,
    scripture: 'Psalm 100:1-2',
    description: 'Bwana anafanya njia pasipo na njia. Recorded this during morning devotion before class. God is so good!',
  },
  {
    id: 'sub-3',
    challengeId: 'c-sunday-fit',
    challengeTag: '#SundayFitCheck',
    title: 'African Kitenge Sunday Fit & Psalm 96 🌟',
    author: {
      id: 'p-rebecca',
      name: 'Deaconess Rebecca',
      badge: 'deacon',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      branch: 'Grace Community Fellowship',
    },
    videoUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
    audioTitle: 'Sunday Morning Joy Chimes · Shammah Sound',
    cheers: 630,
    commentsCount: 42,
    scripture: 'Psalm 96:9',
    description: 'Worship the Lord in the splendor of his holiness; tremble before him, all the earth. Blessed Sunday church family!',
  },
];

export default function FaithChallengesView({ session, profile }) {
  const [activeChallengeId, setActiveChallengeId] = useState('all');
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);
  const [cheeredSet, setCheeredSet] = useState(new Set());
  const [toastMsg, setToastMsg] = useState('');

  // Submit Challenge Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    challengeId: 'c-scripture-60',
    title: '',
    scripture: '',
    description: '',
    branch: profile?.branch || 'Campus CU / Youth Fellowship',
  });

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  }

  function handleCheer(subId) {
    playSound('reaction');
    setCheeredSet((prev) => {
      const next = new Set(prev);
      const isCheered = next.has(subId);
      if (isCheered) {
        next.delete(subId);
        setSubmissions((list) =>
          list.map((s) => (s.id === subId ? { ...s, cheers: Math.max(0, s.cheers - 1) } : s))
        );
      } else {
        next.add(subId);
        setSubmissions((list) =>
          list.map((s) => (s.id === subId ? { ...s, cheers: s.cheers + 1 } : s))
        );
        showToast('Amen! Cheered with faith! ❤️🔥');
      }
      return next;
    });
  }

  async function handleShare(sub) {
    const text = `Check out this testimony on Shammah: "${sub.title}" ${sub.challengeTag}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Faith Challenge' });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Challenge link copied to clipboard!');
      playSound('reaction');
    } catch {}
  }

  function handleSubmitChallengeEntry(e) {
    e.preventDefault();
    if (!submitForm.title.trim()) {
      showToast('Please add a title for your challenge submission.');
      return;
    }

    const ch = INITIAL_CHALLENGES.find((c) => c.id === submitForm.challengeId) || INITIAL_CHALLENGES[0];

    const newEntry = {
      id: `sub-${Date.now()}`,
      challengeId: ch.id,
      challengeTag: ch.tag,
      title: submitForm.title.trim(),
      author: {
        id: session?.user?.id || 'me-anon',
        name: profile?.display_name || profile?.name || 'Fellowship Youth Member',
        badge: profile?.badge || 'youth',
        avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        branch: submitForm.branch || 'Shammah Christian Family',
      },
      videoUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
      audioTitle: 'Spiritual Fellowship Audio · Original Sound',
      cheers: 1,
      commentsCount: 0,
      scripture: submitForm.scripture.trim() || 'Matthew 5:14-16',
      description: submitForm.description.trim(),
    };

    setSubmissions([newEntry, ...submissions]);
    setShowSubmitModal(false);
    showToast('🎉 Challenge submitted! You are a Faith Champion!');
    playSound('reaction');
  }

  const visibleSubmissions =
    activeChallengeId === 'all'
      ? submissions
      : submissions.filter((s) => s.challengeId === activeChallengeId);

  return (
    <div className="section-feed-view faith-challenges-view">
      {/* Hero Header */}
      <div className="challenges-hero-banner">
        <div className="chal-badge-pill">
          <Flame size={15} />
          <span>Christian Youth & Teen Trends · Faith TikTok Challenges</span>
        </div>

        <h2 className="chal-hero-title">Shammah Faith Challenges</h2>
        <p className="chal-hero-subtitle">
          Inspiring short testimonies, worship covers, 60-second scriptures, and creative faith expressions from campus CUs and youth ministries.
        </p>

        <button
          type="button"
          className="join-challenge-cta-btn"
          onClick={() => setShowSubmitModal(true)}
        >
          <Plus size={16} />
          <span>Join a Challenge</span>
        </button>
      </div>

      {toastMsg && <div className="video-toast-pill">{toastMsg}</div>}

      {/* Challenge Categories Carousel */}
      <div className="challenges-track-header">
        <span className="chal-track-label">🔥 Trending Challenges:</span>
        <div className="chal-pills-scroll no-scrollbar">
          <button
            type="button"
            className={`chal-category-pill${activeChallengeId === 'all' ? ' active' : ''}`}
            onClick={() => setActiveChallengeId('all')}
          >
            <span>All Challenges</span>
          </button>
          {INITIAL_CHALLENGES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chal-category-pill${activeChallengeId === c.id ? ' active' : ''}`}
              onClick={() => setActiveChallengeId(c.id)}
            >
              <span>{c.icon} {c.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed of Short Video / Challenge Submissions */}
      <div className="challenges-feed-list">
        {visibleSubmissions.map((sub) => {
          const isCheered = cheeredSet.has(sub.id);
          return (
            <article key={sub.id} className="post-card challenge-video-card">
              {/* Creator & Challenge Tag Header */}
              <div className="chal-card-header">
                <div className="chal-author-row">
                  <Avatar
                    name={sub.author.name}
                    src={sub.author.avatar}
                    userId={sub.author.id}
                    className="avatar-sm"
                  />
                  <div className="chal-author-meta">
                    <MemberName
                      name={sub.author.name}
                      badge={sub.author.badge}
                      verified={true}
                      userId={sub.author.id}
                    />
                    <span className="chal-author-branch">{sub.author.branch}</span>
                  </div>
                </div>

                <span className="chal-tag-badge">{sub.challengeTag}</span>
              </div>

              {/* Simulated Vertical Short Video Container */}
              <div className="chal-video-viewport">
                <img src={sub.videoUrl} alt={sub.title} className="chal-video-poster" />
                <div className="chal-video-gradient" />

                {/* Sound & Scripture Floating Chips */}
                <div className="chal-sound-chip">
                  <Music size={13} className="spin-slow" />
                  <span>{sub.audioTitle}</span>
                </div>

                {sub.scripture && (
                  <div className="chal-scripture-chip">
                    <span>📖 {sub.scripture}</span>
                  </div>
                )}

                {/* Floating Side Action Rail */}
                <div className="chal-side-actions">
                  <button
                    type="button"
                    className={`chal-action-bubble${isCheered ? ' active' : ''}`}
                    onClick={() => handleCheer(sub.id)}
                    title="Amen! Cheer with faith"
                  >
                    <Heart size={20} fill={isCheered ? '#ec4899' : 'none'} color={isCheered ? '#ec4899' : '#fff'} />
                    <span className="chal-bubble-count">{sub.cheers}</span>
                  </button>

                  <button
                    type="button"
                    className="chal-action-bubble"
                    onClick={() => showToast('Opening comments…')}
                    title="View comments"
                  >
                    <MessageCircle size={20} color="#fff" />
                    <span className="chal-bubble-count">{sub.commentsCount}</span>
                  </button>

                  <button
                    type="button"
                    className="chal-action-bubble"
                    onClick={() => handleShare(sub)}
                    title="Share this challenge"
                  >
                    <Share2 size={20} color="#fff" />
                    <span className="chal-bubble-count">Share</span>
                  </button>
                </div>

                {/* Bottom Overlay Text */}
                <div className="chal-video-bottom">
                  <h4 className="chal-submission-title">{sub.title}</h4>
                  <p className="chal-submission-desc">{sub.description}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Submit Entry Modal */}
      {showSubmitModal && (
        <div className="vis-modal-backdrop" onClick={() => setShowSubmitModal(false)} role="dialog" aria-modal="true">
          <div className="vis-modal-card neon-glow-modal submit-chal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="submit-chal-header">
              <div className="submit-chal-title-group">
                <Flame size={18} className="chal-icon" />
                <h3>Join a Faith Challenge</h3>
              </div>
              <button
                type="button"
                className="submit-chal-close"
                onClick={() => setShowSubmitModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitChallengeEntry} className="submit-chal-form">
              <label className="chal-form-field">
                <span className="chal-form-label">Select Challenge *</span>
                <select
                  className="onb-input"
                  value={submitForm.challengeId}
                  onChange={(e) => setSubmitForm({ ...submitForm, challengeId: e.target.value })}
                >
                  {INITIAL_CHALLENGES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="chal-form-field">
                <span className="chal-form-label">Submission Title *</span>
                <input
                  type="text"
                  className="onb-input"
                  required
                  placeholder="e.g. Way Maker acoustic chorus in our dorm room"
                  value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                />
              </label>

              <label className="chal-form-field">
                <span className="chal-form-label">Scripture Reference (optional)</span>
                <input
                  type="text"
                  className="onb-input"
                  placeholder="e.g. Romans 8:28 or Psalm 23"
                  value={submitForm.scripture}
                  onChange={(e) => setSubmitForm({ ...submitForm, scripture: e.target.value })}
                />
              </label>

              <label className="chal-form-field">
                <span className="chal-form-label">Your Campus CU or Youth Fellowship</span>
                <input
                  type="text"
                  className="onb-input"
                  placeholder="e.g. KU Christian Union or CITAM Youth"
                  value={submitForm.branch}
                  onChange={(e) => setSubmitForm({ ...submitForm, branch: e.target.value })}
                />
              </label>

              <label className="chal-form-field">
                <span className="chal-form-label">Caption & Testimony Details</span>
                <textarea
                  className="onb-input"
                  rows={3}
                  placeholder="Share a short word of encouragement with the youth and teens across Shammah…"
                  value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                />
              </label>

              <div className="submit-chal-actions">
                <button
                  type="button"
                  className="cx-btn cx-btn-ghost"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cx-btn cx-btn-primary">
                  Publish to Challenge Feed 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
