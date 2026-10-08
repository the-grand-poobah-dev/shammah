'use client';
import { useState } from 'react';
import {
  BarChart3,
  Check,
  Plus,
  Sparkles,
  Filter,
  Users,
  Globe,
  Tv,
  Share2,
  Bot,
  TrendingUp,
} from 'lucide-react';
import PostCard from './PostCard';
import ProjectionModeModal from './ProjectionModeModal';
import WatermarkShareModal from './WatermarkShareModal';
import PollAnalyticsModal from './PollAnalyticsModal';
import { playSound } from '../lib/soundEffects';

const SAMPLE_POLLS = [
  {
    id: 'poll-church-camp',
    text_content: 'Which theme inspires you most for our upcoming 2026 Annual Church Retreat? Cast your vote so the ministry council can prepare materials and breakout sessions. 🙏✨',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    category_id: 'events',
    likes_count: 54,
    comments_count: 22,
    reposts_count: 15,
    profiles: {
      name: 'Pastor David Mwangi',
      display_name: 'Pastor David Mwangi',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      badge: 'pastor',
      badge_verified: true,
      role: 'church_admin',
    },
    options: [
      { id: 'opt-1', label: 'Walking in the Supernatural Power of the Holy Spirit' },
      { id: 'opt-2', label: 'Building Kingdom Families & Strong Next-Gen Believers' },
      { id: 'opt-3', label: 'Spiritual Warfare & Overcoming Strongholds in Prayer' },
      { id: 'opt-4', label: 'Marketplace Ministry: Being Salt and Light at Work' },
    ],
    counts: { 'opt-1': 48, 'opt-2': 35, 'opt-3': 62, 'opt-4': 29 },
  },
  {
    id: 'poll-worship-night',
    text_content: 'Which day works best for our monthly Night of Worship & Prophetic Praise? Let your voice be heard!',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    category_id: 'worship',
    likes_count: 42,
    comments_count: 14,
    reposts_count: 9,
    profiles: {
      name: 'Sister Mary Grace',
      display_name: 'Sister Mary Grace',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'worship',
      badge_verified: true,
      role: 'member',
    },
    options: [
      { id: 'opt-w-1', label: 'Last Friday of the month (7:00 PM – 10:00 PM)' },
      { id: 'opt-w-2', label: 'First Saturday evening (6:00 PM – 9:00 PM)' },
      { id: 'opt-w-3', label: 'Sunday Night Fellowship (6:30 PM – 8:30 PM)' },
    ],
    counts: { 'opt-w-1': 74, 'opt-w-2': 31, 'opt-w-3': 18 },
  },
  {
    id: 'poll-methuselah-quiz',
    text_content: 'Bible Trivia Quiz: According to Genesis 5:27, who was the oldest man recorded in scripture, living a total of 969 years? Test your biblical knowledge!',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    category_id: 'lessons',
    likes_count: 67,
    comments_count: 31,
    reposts_count: 24,
    is_quiz: true,
    quiz_explanation: 'Genesis 5:27 affirms: "Altogether, Methuselah lived a total of 969 years, and then he died."',
    profiles: {
      name: 'Pastor David Mwangi',
      display_name: 'Pastor David Mwangi',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      badge: 'pastor',
      badge_verified: true,
      role: 'church_admin',
    },
    options: [
      { id: 'opt-q-1', label: 'Enoch', is_correct: false },
      { id: 'opt-q-2', label: 'Methuselah', is_correct: true },
      { id: 'opt-q-3', label: 'Noah', is_correct: false },
      { id: 'opt-q-4', label: 'Adam', is_correct: false },
    ],
    counts: { 'opt-q-1': 14, 'opt-q-2': 188, 'opt-q-3': 22, 'opt-q-4': 9 },
  },
];

export default function PollsView({
  feedPosts = [],
  pollOptionsByPost = {},
  pollCountsByPost = {},
  myVoteByPost = {},
  onVote,
  session,
  currentUser,
  openAuth,
  onFocusCompose,
}) {
  const [filter, setFilter] = useState('all'); // all | active | voted
  const [projectingPoll, setProjectingPoll] = useState(null);
  const [watermarkShareData, setWatermarkShareData] = useState(null);
  const [analyticsPoll, setAnalyticsPoll] = useState(null);

  // Combine feed polls with sample polls
  const feedPollPosts = feedPosts.filter((p) => pollOptionsByPost[p.id] && pollOptionsByPost[p.id].length > 0);

  const allPolls = [
    ...feedPollPosts,
    ...SAMPLE_POLLS.filter((sp) => !feedPollPosts.some((fp) => fp.id === sp.id)),
  ];

  const displayedPolls = allPolls.filter((p) => {
    const hasVoted = myVoteByPost[p.id] != null;
    const isQuizPoll = Boolean(p.is_quiz || p.poll_type === 'quiz' || (p.options && p.options.some((o) => o.is_correct)) || (pollOptionsByPost[p.id] && pollOptionsByPost[p.id].some((o) => o.is_correct)));
    if (filter === 'quiz') return isQuizPoll;
    if (filter === 'voted') return hasVoted;
    if (filter === 'active') return !hasVoted;
    return true;
  });

  function handleProjectPoll(poll) {
    playSound('reaction');
    const options = poll.options || pollOptionsByPost[poll.id] || [];
    const counts = poll.counts || pollCountsByPost[poll.id] || {};
    setProjectingPoll({
      ...poll,
      options,
      counts,
      churchName: poll.profiles?.name ? `${poll.profiles.name}'s Church` : 'Shammah Community',
    });
  }

  function handleSharePollWatermarked(poll) {
    playSound('reaction');
    const options = poll.options || pollOptionsByPost[poll.id] || [];
    setWatermarkShareData({
      title: 'Interactive Poll',
      textContent: poll.text_content,
      authorName: poll.profiles?.name || poll.profiles?.display_name || 'Church Admin',
      churchName: 'Shammah Global Community',
      category: 'Community Poll',
      pollOptions: options,
    });
  }

  return (
    <div className="section-feed-view polls-view-container">
      {/* Projection Hero Card for Sanctuary Service Polls */}
      <div className="polls-projection-hero-banner">
        <div className="polls-proj-left">
          <div className="courses-badge-tag">
            <Tv size={14} className="text-amber-400" />
            <span>Interactive Sanctuary Service Hub</span>
          </div>
          <h3>Project Live Polls on Stage &amp; Sanctuary Screens</h3>
          <p>
            Engage congregants live during services or fellowship. Project real-time animated vote charts and an on-screen QR code for members to vote with their phones.
          </p>
        </div>

        <button
          type="button"
          className="polls-launch-stage-btn"
          onClick={() => handleProjectPoll(allPolls[0])}
        >
          <Tv size={16} />
          <span>Project Live Poll to Sanctuary</span>
        </button>
      </div>

      {/* Polls sub-navigation & create action */}
      <div className="polls-subnav-row">
        <div className="video-subnav-bar no-scrollbar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`video-subnav-pill${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>All ({allPolls.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === 'quiz'}
            className={`video-subnav-pill quiz-pill${filter === 'quiz' ? ' active' : ''}`}
            onClick={() => setFilter('quiz')}
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>🎯 Bible Quizzes</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === 'active'}
            className={`video-subnav-pill${filter === 'active' ? ' active' : ''}`}
            onClick={() => setFilter('active')}
          >
            <span>Open for Voting</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === 'voted'}
            className={`video-subnav-pill${filter === 'voted' ? ' active' : ''}`}
            onClick={() => setFilter('voted')}
          >
            <Check size={13} />
            <span>My Votes</span>
          </button>
        </div>

        <div className="polls-top-action-group">
          <button
            type="button"
            className="ai-poll-shortcut-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('shammah:open-chatbot'));
            }}
            title="Ask Shammah AI to generate poll questions"
          >
            <Bot size={15} />
            <span>AI Poll Generator</span>
          </button>

          <button
            type="button"
            className="create-poll-shortcut-btn"
            onClick={onFocusCompose}
            title="Create a new poll for the church"
          >
            <Plus size={15} />
            <span>New Poll</span>
          </button>
        </div>
      </div>

      {/* Poll Cards list */}
      <div className="polls-list-wrapper">
        {displayedPolls.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={36} className="empty-icon" />
            <h3>No polls found under this filter</h3>
            <p>Start a poll to gather feedback and prayers from the church community.</p>
            <button type="button" className="signin-btn" onClick={onFocusCompose}>
              Create a Poll
            </button>
          </div>
        ) : (
          displayedPolls.map((poll) => {
            const options = poll.options || pollOptionsByPost[poll.id] || [];
            const counts = poll.counts || pollCountsByPost[poll.id] || {};
            const myVote = myVoteByPost[poll.id] || null;

            return (
              <div key={poll.id} className="poll-card-wrapper-with-stage">
                <PostCard
                  post={poll}
                  session={session}
                  openAuth={openAuth}
                  pollOptions={options}
                  pollCounts={counts}
                  myVote={myVote}
                  onVote={(optId) => onVote(poll.id, optId)}
                />

                {/* Stage Projection & Watermark Share shortcuts bar */}
                <div className="poll-stage-action-bar">
                  <button
                    type="button"
                    className="poll-stage-action-pill"
                    onClick={() => handleProjectPoll(poll)}
                    title="Project this poll on stage / sanctuary screen"
                  >
                    <Tv size={14} className="text-amber-400" />
                    <span>Project to Screen</span>
                  </button>

                  <button
                    type="button"
                    className="poll-stage-action-pill"
                    onClick={() => handleSharePollWatermarked(poll)}
                    title="Share watermarked poll card outside app"
                  >
                    <Share2 size={14} className="text-cyan-400" />
                    <span>Share Watermarked</span>
                  </button>

                  <button
                    type="button"
                    className="poll-stage-action-pill"
                    onClick={() => {
                      playSound('reaction');
                      setAnalyticsPoll(poll);
                    }}
                    title="View poll voting trends & patterns line chart"
                  >
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span>Poll Analytics</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Projection Mode Modal */}
      {projectingPoll && (
        <ProjectionModeModal
          type="poll"
          data={projectingPoll}
          onClose={() => setProjectingPoll(null)}
        />
      )}

      {/* Watermarked Share Modal */}
      {watermarkShareData && (
        <WatermarkShareModal
          contentData={watermarkShareData}
          onClose={() => setWatermarkShareData(null)}
        />
      )}

      {/* Poll Analytics Modal */}
      {analyticsPoll && (
        <PollAnalyticsModal
          poll={analyticsPoll}
          pollOptions={analyticsPoll.options || pollOptionsByPost[analyticsPoll.id]}
          pollCounts={analyticsPoll.counts || pollCountsByPost[analyticsPoll.id]}
          onClose={() => setAnalyticsPoll(null)}
        />
      )}
    </div>
  );
}
