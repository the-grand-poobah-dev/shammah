'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Rss,
  Search,
  Plus,
  Check,
  Globe,
  ExternalLink,
  Sparkles,
  Shield,
  Trash2,
  Bookmark,
  Share2,
  MessageCircle,
  Repeat,
  Headphones,
  Video as VideoIcon,
  BookOpen,
  Filter,
  Radio,
  X,
  Play,
  Pause,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import RepostModal from './RepostModal';
import {
  getSubscribedFeeds,
  saveSubscribedFeeds,
  addSubscribedFeed,
  removeSubscribedFeed,
  getDeveloperBroadcastFeeds,
  toggleDeveloperBroadcast,
  searchFeedsByQuery,
  PRESET_RSS_FEEDS,
} from '../lib/rssManager';
import { isPostReposted, getPostRepostCount, toggleRepost } from '../lib/postInteractions';

function RssItemCard({ item, feed, session, currentUser, openAuth, isDeveloper }) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(item.commentsCount || 4);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(item.repostsCount || 7);
  const [shareToast, setShareToast] = useState('');

  const audioRef = useRef(null);

  useEffect(() => {
    setReposted(isPostReposted(item.id, session?.user?.id));
    setRepostCount(getPostRepostCount(item.id, item.repostsCount || 7));
  }, [item.id, session?.user?.id, item.repostsCount]);

  function toggleAudio() {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url: item.sourceUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(item.sourceUrl || (typeof window !== 'undefined' ? window.location.href : ''));
    setShareToast('Article link copied!');
    setTimeout(() => setShareToast(''), 2000);
  }

  // Convert to post-compatible shape for comments & reposts
  const postCompat = {
    id: item.id,
    text_content: `${item.title}\n\n${item.description}`,
    category_id: feed.category || 'resources',
    created_at: item.pubDate,
    profiles: {
      name: item.author || feed.sourceName,
      display_name: item.author || feed.sourceName,
      avatar_url: item.imageUrl,
      badge: 'believer',
      badge_verified: true,
      role: 'member',
    },
  };

  return (
    <article className="post-card rss-mixed-card article-reading-target" data-article-title={item.title || 'Article'}>
      {/* Source header with publication chip and original link */}
      <div className="rss-card-source-row">
        <div className="rss-source-badge">
          <Rss size={13} className="rss-icon-orange" />
          <span className="rss-source-name">{feed.sourceName || item.source}</span>
          <span className="rss-dot">·</span>
          <span className="rss-pub-date">{item.pubDate}</span>
        </div>

        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rss-open-external-link"
            title="Read on original website"
          >
            <span>Original</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Main Title & Excerpt */}
      <h3 className="rss-item-title">{item.title}</h3>
      <p className="rss-item-desc">{item.description}</p>

      {/* Media Rendering depending on type: Audio / Video / Hero Image */}
      {item.mediaType === 'audio' && item.audioUrl && (
        <div className="rss-media-audio-player">
          <audio ref={audioRef} src={item.audioUrl} onEnded={() => setIsPlayingAudio(false)} />
          <div className="rss-audio-controls-row">
            <button
              type="button"
              className="rss-audio-play-btn"
              onClick={toggleAudio}
              aria-label={isPlayingAudio ? 'Pause' : 'Play'}
            >
              {isPlayingAudio ? <Pause size={17} fill="#ffffff" /> : <Play size={17} fill="#ffffff" />}
            </button>
            <div className="rss-audio-meta">
              <span className="rss-audio-title">Audio Stream · {item.duration || 'Audio Devotional'}</span>
              <span className="rss-audio-sub">{isPlayingAudio ? 'Streaming living word...' : 'Tap to listen now'}</span>
            </div>
          </div>
        </div>
      )}

      {item.mediaType === 'video' && item.videoUrl && (
        <div className="rss-media-video-wrap">
          <video src={item.videoUrl} controls playsInline className="rss-video-element" />
        </div>
      )}

      {item.imageUrl && item.mediaType !== 'video' && (
        <div className="rss-hero-image-wrap">
          <img src={item.imageUrl} alt="" className="rss-hero-image" />
        </div>
      )}

      {shareToast && <div className="video-toast-pill">{shareToast}</div>}

      {/* Engagement bar */}
      <div className="post-actions">
        <ReactionBar
          targetType="post"
          targetId={item.id}
          session={session}
          onRequireSignIn={() => openAuth('signin')}
        />

        <button
          type="button"
          className="action-btn"
          onClick={() => setCommentsOpen((v) => !v)}
          title="Discuss article"
        >
          <MessageCircle size={15} />
          <span>{commentCount > 0 ? commentCount : 'Comment'}</span>
        </button>

        <button
          type="button"
          className={`action-btn repost-btn${reposted ? ' is-reposted' : ''}`}
          onClick={() => {
            if (!session) return openAuth('signin');
            setShowRepostModal(true);
          }}
          title="Repost RSS article"
        >
          <Repeat size={15} />
          <span>Repost</span>
          {repostCount > 0 && <span className="repost-count-badge">{repostCount}</span>}
        </button>

        <button type="button" className="action-btn" onClick={handleShare} title="Share article">
          <Share2 size={15} />
          <span>Share</span>
        </button>
      </div>

      {commentsOpen && (
        <CommentThread
          postId={item.id}
          session={session}
          onRequireSignIn={() => openAuth('signin')}
          onCountChange={setCommentCount}
        />
      )}

      {showRepostModal && (
        <RepostModal
          post={postCompat}
          currentUser={currentUser}
          onClose={() => setShowRepostModal(false)}
          onConfirm={(quote) => {
            const res = toggleRepost(item.id, postCompat, currentUser, quote);
            setReposted(res.reposted);
            setRepostCount(res.count);
          }}
        />
      )}
    </article>
  );
}

export default function RssFeedsView({ session, currentUser, openAuth }) {
  const [subscribedFeeds, setSubscribedFeeds] = useState([]);
  const [broadcastFeeds, setBroadcastFeeds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // all | articles | audio | video

  const isDeveloper = Boolean(
    (session?.user?.email || '').toLowerCase().includes('juliusthandi') ||
    (session?.user?.email || '').toLowerCase().includes('admin')
  );

  function loadFeeds() {
    setSubscribedFeeds(getSubscribedFeeds());
    setBroadcastFeeds(getDeveloperBroadcastFeeds());
  }

  useEffect(() => {
    loadFeeds();
    window.addEventListener('shammah:rss-feeds-updated', loadFeeds);
    window.addEventListener('shammah:rss-broadcast-updated', loadFeeds);
    return () => {
      window.removeEventListener('shammah:rss-feeds-updated', loadFeeds);
      window.removeEventListener('shammah:rss-broadcast-updated', loadFeeds);
    };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(PRESET_RSS_FEEDS);
      return;
    }
    setIsSearching(true);
    const res = searchFeedsByQuery(searchQuery.trim());
    setSearchResults(res);

    // Pre-select all items by default for convenience
    const allIds = new Set();
    res.forEach((f) => f.items.forEach((it) => allIds.add(it.id)));
    setSelectedItemIds(allIds);
    setIsSearching(false);
  }

  function toggleItemSelection(itemId) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleAddSelectedFeeds(feed, broadcastHomefeed = false) {
    // Filter feed items to only keep selected ones
    const filteredFeed = {
      ...feed,
      items: feed.items.filter((it) => selectedItemIds.has(it.id)),
    };

    addSubscribedFeed(filteredFeed);

    if (isDeveloper && broadcastHomefeed) {
      toggleDeveloperBroadcast(filteredFeed, true);
    }

    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
    loadFeeds();
  }

  function handleRemoveFeed(feedId) {
    removeSubscribedFeed(feedId);
    toggleDeveloperBroadcast({ id: feedId }, false);
    loadFeeds();
  }

  // Aggregate all items from subscribed feeds
  const allSubscribedItems = subscribedFeeds.flatMap((f) =>
    f.items.map((it) => ({ ...it, feed: f }))
  );

  const filteredItems = allSubscribedItems.filter((it) => {
    if (activeTabFilter === 'audio') return it.mediaType === 'audio';
    if (activeTabFilter === 'video') return it.mediaType === 'video';
    if (activeTabFilter === 'articles') return it.mediaType === 'text';
    return true;
  });

  return (
    <div className="section-feed-view rss-feeds-view-container">
      {/* Top Controls Bar: Search & Discover New Feeds */}
      <div className="rss-top-controls-bar">
        <div className="rss-header-intro">
          <div className="rss-badge-row">
            <Rss size={16} className="rss-icon-orange" />
            <span className="rss-title-strong">Spiritual RSS Streams</span>
          </div>
          <p className="rss-subtext">
            Pull sermons, devotionals, podcasts, and global Christian news via keywords or direct RSS link.
          </p>
        </div>

        <button
          type="button"
          className="signin-btn rss-add-btn"
          onClick={() => {
            setShowAddModal(true);
            setSearchResults(PRESET_RSS_FEEDS);
            const allIds = new Set();
            PRESET_RSS_FEEDS.forEach((f) => f.items.forEach((it) => allIds.add(it.id)));
            setSelectedItemIds(allIds);
          }}
        >
          <Plus size={16} />
          <span>Add Feeds by Search / URL</span>
        </button>
      </div>

      {/* Subscribed Feeds quick tags */}
      {subscribedFeeds.length > 0 && (
        <div className="rss-active-sources-bar no-scrollbar">
          <span className="rss-sources-label">My Feeds:</span>
          {subscribedFeeds.map((feed) => {
            const isBroadcast = broadcastFeeds.some((b) => b.id === feed.id);
            return (
              <span key={feed.id} className="rss-feed-pill">
                <span>{feed.icon} {feed.name}</span>
                {isDeveloper && isBroadcast && (
                  <span className="rss-broadcast-indicator" title="Broadcasting to community homefeed under your profile">
                    🌟 Homefeed
                  </span>
                )}
                <button
                  type="button"
                  className="rss-pill-remove"
                  onClick={() => handleRemoveFeed(feed.id)}
                  title="Remove feed"
                  aria-label="Remove feed"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Media Type filter pills */}
      <div className="video-subnav-bar no-scrollbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTabFilter === 'all'}
          className={`video-subnav-pill${activeTabFilter === 'all' ? ' active' : ''}`}
          onClick={() => setActiveTabFilter('all')}
        >
          <span>All RSS Content ({allSubscribedItems.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTabFilter === 'articles'}
          className={`video-subnav-pill${activeTabFilter === 'articles' ? ' active' : ''}`}
          onClick={() => setActiveTabFilter('articles')}
        >
          <BookOpen size={13} />
          <span>Articles</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTabFilter === 'audio'}
          className={`video-subnav-pill${activeTabFilter === 'audio' ? ' active' : ''}`}
          onClick={() => setActiveTabFilter('audio')}
        >
          <Headphones size={13} />
          <span>Audio Podcasts</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTabFilter === 'video'}
          className={`video-subnav-pill${activeTabFilter === 'video' ? ' active' : ''}`}
          onClick={() => setActiveTabFilter('video')}
        >
          <VideoIcon size={13} />
          <span>Video Streams</span>
        </button>
      </div>

      {/* Mixed Assortment Card UI for RSS Articles */}
      <div className="rss-items-list-wrapper">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <Rss size={40} className="rss-icon-orange" />
            <h3>No RSS content subscribed yet</h3>
            <p>Search for keywords or paste an RSS feed URL to stream articles and podcasts.</p>
            <button
              type="button"
              className="signin-btn"
              onClick={() => {
                setShowAddModal(true);
                setSearchResults(PRESET_RSS_FEEDS);
              }}
            >
              Discover Feeds
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
            <RssItemCard
              key={item.id}
              item={item}
              feed={item.feed}
              session={session}
              currentUser={currentUser}
              openAuth={openAuth}
              isDeveloper={isDeveloper}
            />
          ))
        )}
      </div>

      {/* Add / Search Feed Modal Dialog with Select / Deselect checkboxes & Developer Broadcast */}
      {showAddModal && (
        <div className="visibility-modal-backdrop" onClick={() => setShowAddModal(false)} role="dialog" aria-modal="true">
          <div className="rss-add-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="visibility-modal-header">
              <div className="visibility-modal-title">
                <Rss size={18} className="rss-icon-orange" />
                <h3>Search or Add RSS Feed</h3>
              </div>
              <button
                type="button"
                className="visibility-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input for Keyword or URL */}
            <form onSubmit={handleSearch} className="rss-search-form">
              <div className="rss-search-input-wrap">
                <Search size={16} className="rss-input-icon" />
                <input
                  type="text"
                  placeholder="Search keywords (e.g. Piper, prayer) or paste RSS URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rss-modal-search-input"
                  autoFocus
                />
                {searchQuery && (
                  <button type="button" className="picker-clear-search" onClick={() => setSearchQuery('')}>
                    ✕
                  </button>
                )}
              </div>
              <button type="submit" className="signin-btn rss-search-submit">
                Search
              </button>
            </form>

            <p className="rss-modal-hint">
              Select or deselect specific content items from search results to tailor what streams into your feed.
            </p>

            {/* Discovered Feeds List */}
            <div className="rss-discovered-list">
              {searchResults.map((feed) => {
                const isAlreadyAdded = subscribedFeeds.some((f) => f.id === feed.id);
                return (
                  <div key={feed.id} className="rss-discovered-feed-box">
                    <div className="rss-disc-header">
                      <div>
                        <h4 className="rss-disc-title">{feed.icon} {feed.name}</h4>
                        <span className="rss-disc-meta">{feed.sourceName} · {feed.items.length} items found</span>
                      </div>
                    </div>

                    <p className="rss-disc-desc">{feed.description}</p>

                    {/* Content Items with Select / Deselect checkboxes */}
                    <div className="rss-items-checklist">
                      <span className="checklist-heading">Select articles to stream:</span>
                      {feed.items.map((item) => {
                        const isChecked = selectedItemIds.has(item.id);
                        return (
                          <label key={item.id} className={`rss-check-item${isChecked ? ' is-checked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItemSelection(item.id)}
                              className="rss-checkbox-input"
                            />
                            <div className="rss-check-text">
                              <strong>{item.title}</strong>
                              <small>{item.author ? `By ${item.author} · ` : ''}{item.pubDate}</small>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Action button row with Developer Superpower */}
                    <div className="rss-feed-add-actions">
                      {isDeveloper && (
                        <label className="developer-broadcast-toggle-row">
                          <input
                            type="checkbox"
                            id={`broadcast-${feed.id}`}
                            defaultChecked={broadcastFeeds.some((b) => b.id === feed.id)}
                            className="dev-broadcast-checkbox"
                          />
                          <span className="dev-broadcast-label">
                            🌟 Broadcast to community homefeed under my profile ({currentUser?.name || 'Julius Thandi'})
                          </span>
                        </label>
                      )}

                      <button
                        type="button"
                        className="signin-btn rss-confirm-add-btn"
                        onClick={() => {
                          const checkbox = document.getElementById(`broadcast-${feed.id}`);
                          const shouldBroadcast = checkbox ? checkbox.checked : false;
                          handleAddSelectedFeeds(feed, shouldBroadcast);
                        }}
                      >
                        <Check size={16} />
                        <span>{isAlreadyAdded ? 'Update Selected Content' : 'Add to My Feeds'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
