'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  getActivityLog,
  clearActivityLog,
  deleteActivityItem,
  getActivityStats,
} from '../lib/activityLogManager';
import {
  Clock,
  Filter,
  Trash2,
  ShieldCheck,
  Search,
  MessageCircle,
  Heart,
  BarChart3,
  PenSquare,
  Sparkles,
  Eye,
  CheckCircle2,
  Share2,
  Calendar,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

function formatActivityTime(isoString) {
  if (!isoString) return 'Recent';
  const now = Date.now();
  const past = new Date(isoString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;

  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const TYPE_ICONS = {
  post: PenSquare,
  reaction: Heart,
  comment: MessageCircle,
  poll_vote: BarChart3,
  share: Share2,
};

const TYPE_COLORS = {
  post: '#0ea5e9', // Sky blue
  reaction: '#ec4899', // Pink
  comment: '#10b981', // Emerald
  poll_vote: '#8b5cf6', // Purple
  share: '#f59e0b', // Amber
};

export default function ActivityLog({ onSelectPost = null, onClose = null }) {
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all | post | reaction | comment | poll_vote
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, posts: 0, reactions: 0, comments: 0, pollVotes: 0 });

  // Date Range Filtering States
  const [datePreset, setDatePreset] = useState('all'); // all | today | week | month | custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function reload() {
    setActivities(getActivityLog());
    setStats(getActivityStats());
  }

  useEffect(() => {
    reload();

    function onActivityUpdate() {
      reload();
    }
    window.addEventListener('shammah:activity-updated', onActivityUpdate);
    return () => window.removeEventListener('shammah:activity-updated', onActivityUpdate);
  }, []);

  // Filter activities by Type, Search Query, and Date Range
  const filteredList = useMemo(() => {
    return activities.filter((item) => {
      // 1. Type filter
      if (filterType !== 'all' && item.type !== filterType) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchSnippet = item.snippet?.toLowerCase().includes(q);
        const matchTarget = item.targetTitle?.toLowerCase().includes(q);
        const matchAuthor = item.authorName?.toLowerCase().includes(q);
        if (!matchTitle && !matchSnippet && !matchTarget && !matchAuthor) return false;
      }

      // 3. Date range filter
      if (datePreset !== 'all') {
        const itemDate = item.timestamp ? new Date(item.timestamp).getTime() : 0;
        const now = Date.now();

        if (datePreset === 'today') {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          if (itemDate < startOfDay.getTime()) return false;
        } else if (datePreset === 'week') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (itemDate < sevenDaysAgo) return false;
        } else if (datePreset === 'month') {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (itemDate < thirtyDaysAgo) return false;
        } else if (datePreset === 'custom') {
          if (startDate) {
            const startMs = new Date(startDate + 'T00:00:00').getTime();
            if (itemDate < startMs) return false;
          }
          if (endDate) {
            const endMs = new Date(endDate + 'T23:59:59.999').getTime();
            if (itemDate > endMs) return false;
          }
        }
      }

      return true;
    });
  }, [activities, filterType, searchQuery, datePreset, startDate, endDate]);

  function handleDatePresetChange(preset) {
    playSound('reaction');
    setDatePreset(preset);
  }

  function handleResetDateFilter() {
    playSound('reaction');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  }

  function handleClear() {
    if (confirm('Are you sure you want to clear your local activity history?')) {
      clearActivityLog();
      playSound('reaction');
      reload();
    }
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    deleteActivityItem(id);
    playSound('reaction');
    reload();
  }

  const isDateFiltered = datePreset !== 'all' || startDate || endDate;

  return (
    <div className="activity-log-container">
      {/* Transparency Header Banner */}
      <div className="activity-log-hero">
        <div className="activity-hero-icon-wrap">
          <ShieldCheck size={24} className="text-teal-400" />
        </div>
        <div className="activity-hero-text">
          <div className="activity-hero-title-row">
            <h3>Engagement Activity Log</h3>
            <span className="activity-transparency-badge">
              <CheckCircle2 size={12} />
              <span>Full Transparency</span>
            </span>
          </div>
          <p className="activity-hero-desc">
            A complete reverse-chronological record of all your actions in Shammah — posts published, reactions given, comments shared, and anonymous poll votes.
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="activity-stats-grid">
        <div className="activity-stat-card">
          <span className="stat-label">Total Actions</span>
          <strong className="stat-value">{stats.total}</strong>
        </div>
        <div className="activity-stat-card" style={{ '--accent-color': '#0ea5e9' }}>
          <span className="stat-label">Posts Shared</span>
          <strong className="stat-value">{stats.posts}</strong>
        </div>
        <div className="activity-stat-card" style={{ '--accent-color': '#ec4899' }}>
          <span className="stat-label">Reactions</span>
          <strong className="stat-value">{stats.reactions}</strong>
        </div>
        <div className="activity-stat-card" style={{ '--accent-color': '#10b981' }}>
          <span className="stat-label">Comments</span>
          <strong className="stat-value">{stats.comments}</strong>
        </div>
        <div className="activity-stat-card" style={{ '--accent-color': '#8b5cf6' }}>
          <span className="stat-label">Poll Votes</span>
          <strong className="stat-value">{stats.pollVotes}</strong>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="activity-filter-toolbar">
        {/* Search Bar */}
        <div className="activity-search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search actions, topics, or comments…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="activity-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Type Filter Chips */}
        <div className="activity-filter-chips">
          <button
            type="button"
            className={`act-filter-chip${filterType === 'all' ? ' active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({activities.length})
          </button>
          <button
            type="button"
            className={`act-filter-chip${filterType === 'post' ? ' active' : ''}`}
            onClick={() => setFilterType('post')}
          >
            ✍️ Posts ({stats.posts})
          </button>
          <button
            type="button"
            className={`act-filter-chip${filterType === 'reaction' ? ' active' : ''}`}
            onClick={() => setFilterType('reaction')}
          >
            ❤️ Likes ({stats.reactions})
          </button>
          <button
            type="button"
            className={`act-filter-chip${filterType === 'comment' ? ' active' : ''}`}
            onClick={() => setFilterType('comment')}
          >
            💬 Comments ({stats.comments})
          </button>
          <button
            type="button"
            className={`act-filter-chip${filterType === 'poll_vote' ? ' active' : ''}`}
            onClick={() => setFilterType('poll_vote')}
          >
            📊 Polls ({stats.pollVotes})
          </button>
        </div>

        {/* Filter by Date Range Picker */}
        <div className="activity-date-filter-section">
          <div className="date-filter-header">
            <div className="date-filter-title-wrap">
              <Calendar size={14} className="text-teal-400" />
              <span className="date-filter-title">Filter by Date Range</span>
            </div>
            {isDateFiltered && (
              <button
                type="button"
                className="date-filter-reset-btn"
                onClick={handleResetDateFilter}
                title="Reset date filter to All Time"
              >
                <RotateCcw size={11} />
                <span>Reset Date</span>
              </button>
            )}
          </div>

          <div className="date-filter-presets">
            <button
              type="button"
              className={`date-preset-btn${datePreset === 'all' ? ' active' : ''}`}
              onClick={() => handleDatePresetChange('all')}
            >
              All Time
            </button>
            <button
              type="button"
              className={`date-preset-btn${datePreset === 'today' ? ' active' : ''}`}
              onClick={() => handleDatePresetChange('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`date-preset-btn${datePreset === 'week' ? ' active' : ''}`}
              onClick={() => handleDatePresetChange('week')}
            >
              Past 7 Days
            </button>
            <button
              type="button"
              className={`date-preset-btn${datePreset === 'month' ? ' active' : ''}`}
              onClick={() => handleDatePresetChange('month')}
            >
              Past 30 Days
            </button>
            <button
              type="button"
              className={`date-preset-btn${datePreset === 'custom' ? ' active' : ''}`}
              onClick={() => handleDatePresetChange('custom')}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Date Range Picker inputs */}
          {datePreset === 'custom' && (
            <div className="date-custom-range-row">
              <div className="date-input-wrap">
                <label className="date-input-label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="activity-date-input"
                />
              </div>
              <span className="date-range-sep">
                <ArrowRight size={14} />
              </span>
              <div className="date-input-wrap">
                <label className="date-input-label">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="activity-date-input"
                />
              </div>
            </div>
          )}

          {/* Active Date Filter Summary Bar */}
          {isDateFiltered && (
            <div className="date-filter-status-banner">
              <span>
                Filtered by date: <strong>{datePreset === 'custom' ? `${startDate || 'Start'} to ${endDate || 'Now'}` : datePreset === 'today' ? 'Today' : datePreset === 'week' ? 'Past 7 Days' : 'Past 30 Days'}</strong>
              </span>
              <span className="date-filtered-count-badge">
                {filteredList.length} action{filteredList.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>

        {activities.length > 0 && (
          <div className="activity-toolbar-bottom-actions">
            <button
              type="button"
              className="activity-clear-btn"
              onClick={handleClear}
              title="Clear all stored activity logs"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {/* Reverse-Chronological Activity List */}
      <div className="activity-list-wrapper">
        {filteredList.length === 0 ? (
          <div className="activity-empty-state">
            <Clock size={36} className="empty-icon" />
            <h4>No activity recorded in this range</h4>
            <p>
              {isDateFiltered || searchQuery
                ? 'No actions match your current search and date filters. Try adjusting the date range or search terms.'
                : 'Interact with posts, vote on polls, or share reflections to see your activity timeline.'}
            </p>
            {isDateFiltered && (
              <button
                type="button"
                className="date-filter-reset-empty-btn"
                onClick={handleResetDateFilter}
              >
                Reset Date Filters
              </button>
            )}
          </div>
        ) : (
          <div className="activity-timeline-feed">
            {filteredList.map((item, idx) => {
              const ActionIcon = TYPE_ICONS[item.type] || Sparkles;
              const color = TYPE_COLORS[item.type] || '#38bdf8';

              return (
                <div
                  key={item.id || idx}
                  className="activity-card-item"
                  style={{ '--item-accent': color }}
                >
                  {/* Left indicator column with type icon */}
                  <div className="activity-left-col">
                    <div className="activity-type-avatar" style={{ background: `color-mix(in srgb, ${color} 14%, var(--surface))`, color }}>
                      {item.icon ? <span className="custom-emoji">{item.icon}</span> : <ActionIcon size={16} />}
                    </div>
                    {idx < filteredList.length - 1 && <div className="activity-line" />}
                  </div>

                  {/* Main activity content */}
                  <div className="activity-main-content">
                    <div className="activity-meta-row">
                      <div className="activity-title-group">
                        <span className="activity-type-pill" style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}>
                          {item.type === 'poll_vote' ? 'Poll Vote' : item.type.toUpperCase()}
                        </span>
                        <strong className="activity-title-text">{item.title}</strong>
                      </div>

                      <div className="activity-time-group">
                        <Clock size={11} className="time-icon" />
                        <span className="activity-time-ago" title={item.timestamp}>
                          {formatActivityTime(item.timestamp)}
                        </span>
                        <button
                          type="button"
                          className="activity-delete-item-btn"
                          onClick={(e) => handleDelete(item.id, e)}
                          title="Remove this action from your log"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Context / Target Title */}
                    {item.targetTitle && (
                      <div className="activity-target-banner">
                        <span className="target-label">On:</span>
                        <span className="target-title">{item.targetTitle}</span>
                        {item.authorName && <span className="target-author">by {item.authorName}</span>}
                      </div>
                    )}

                    {/* Content snippet */}
                    {item.snippet && (
                      <div className="activity-snippet-box">
                        <p className="activity-snippet-text">&ldquo;{item.snippet}&rdquo;</p>
                      </div>
                    )}

                    {/* Transparency & Privacy Footer */}
                    <div className="activity-item-footer">
                      <span className="activity-privacy-pill">
                        {item.visibility === 'anonymous' ? '🔒 Anonymous Action' : '🌐 Public Post'}
                      </span>
                      <span className="activity-sync-pill">
                        ✓ Recorded locally
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
