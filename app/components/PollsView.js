'use client';
import { useState } from 'react';
import { BarChart3, Check, Plus, Sparkles, Filter, Users, Globe } from 'lucide-react';
import PostCard from './PostCard';

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

  // Combine feed polls with sample polls
  const feedPollPosts = feedPosts.filter((p) => pollOptionsByPost[p.id] && pollOptionsByPost[p.id].length > 0);

  const allPolls = [
    ...feedPollPosts,
    ...SAMPLE_POLLS.filter((sp) => !feedPollPosts.some((fp) => fp.id === sp.id)),
  ];

  const displayedPolls = allPolls.filter((p) => {
    const hasVoted = myVoteByPost[p.id] != null;
    if (filter === 'voted') return hasVoted;
    if (filter === 'active') return !hasVoted;
    return true;
  });

  return (
    <div className="section-feed-view polls-view-container">
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
            <span>All Polls ({allPolls.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === 'active'}
            className={`video-subnav-pill${filter === 'active' ? ' active' : ''}`}
            onClick={() => setFilter('active')}
          >
            <Sparkles size={13} />
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
              <PostCard
                key={poll.id}
                post={poll}
                session={session}
                openAuth={openAuth}
                pollOptions={options}
                pollCounts={counts}
                myVote={myVote}
                onVote={(optId) => onVote(poll.id, optId)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
