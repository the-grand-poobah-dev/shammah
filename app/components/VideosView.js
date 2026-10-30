'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Video as VideoIcon,
  Play,
  Sparkles,
  Clock,
  Download,
  Share2,
  Bookmark,
  Check,
  Search,
  Plus,
  ArrowRight,
  Trash2,
  Edit,
  Eye,
  Film,
  FolderPlus,
  Compass,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReelViewerModal from './ReelViewerModal';
import MediaUploadModal from './MediaUploadModal';
import VideoWatchView from './VideoWatchView';
import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  FilterChips,
  SortMenu,
  ProgressBar,
  SkeletonLayout,
  EmptyState,
  ErrorState,
  InfiniteSentinel,
  accentFor,
} from './layoutkit';
import {
  listMedia,
  trending,
  listContinueWatching,
  listSeries,
  toggleSave,
  deleteMedia,
} from '../lib/data/mediaApi';
import { listReels } from '../lib/data/reelsApi';
import { saveForOffline, isItemSavedOffline, removeOfflineItem } from '../lib/offlineSyncManager';
import { formatPostDate, useRelativeTimeTick } from '../lib/postDisplay';
import { playSound } from '../lib/soundEffects';

// Compatibility export in case external components import SAMPLE_VIDEOS
export const SAMPLE_VIDEOS = [
  {
    id: 'vid-seed-1',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'The Covenant of Grace: Walking in Supernatural Favor',
    description: 'Sunday teaching on Romans 8 and Kingdom breakthrough in daily life.',
    duration_seconds: 596,
    category: 'Sermons',
    accent: '#06b6d4',
    view_count: 342,
    like_count: 68,
    save_count: 22,
    published_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    author: {
      display_name: 'Bishop Sarah Ndung\'u',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      badge: 'bishop',
      badge_verified: true,
    },
  },
];

const VIDEO_CATEGORIES = [
  { id: 'All', label: 'All Videos' },
  { id: 'Sermons', label: 'Sermons' },
  { id: 'Worship', label: 'Worship' },
  { id: 'Testimonies', label: 'Testimonies' },
  { id: 'Teaching', label: 'Teaching' },
  { id: 'Kids & Family', label: 'Kids & Family' },
  { id: 'Youth & Gen-Z', label: 'Youth & Gen-Z' },
  { id: 'Live Replays', label: 'Live Replays' },
];

const SORT_OPTIONS = [
  { id: 'trending', label: 'Trending' },
  { id: 'recent', label: 'Newest' },
  { id: 'views', label: 'Most Viewed' },
  { id: 'duration', label: 'Duration' },
];

export default function VideosView({ session, currentUser, openAuth }) {
  const now = useRelativeTimeTick();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('trending');
  const [activeLayout, setActiveLayout] = useState('list-rich');

  // Multi-block data state
  const [continueWatching, setContinueWatching] = useState([]);
  const [spotlightVideo, setSpotlightVideo] = useState(null);
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [churchVideos, setChurchVideos] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [reelsList, setReelsList] = useState([]);
  const [allVideos, setAllVideos] = useState([]);

  // Pagination & Loading
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const [fetchError, setFetchError] = useState(null);

  // Modals & Overlays
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(null);
  const [activeWatchVideoId, setActiveWatchVideoId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [toastMessage, setToastMessage] = useState('');

  const isMountedRef = useRef(true);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  }, []);

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load curated blocks on mount or when category changes
  const loadCuratedBlocks = useCallback(async () => {
    setFetchError(null);
    try {
      const [contRes, trendRes, seriesRes, reelsRes] = await Promise.all([
        session?.user?.id ? listContinueWatching({ kind: 'video', limit: 8 }) : Promise.resolve({ data: [] }),
        trending({ kind: 'video', limit: 8 }),
        listSeries({ kind: 'video', limit: 6 }),
        listReels({ limit: 12 }),
      ]);

      if (contRes.data) setContinueWatching(contRes.data);
      if (seriesRes.data) setSeriesList(seriesRes.data);
      if (reelsRes.data) setReelsList(reelsRes.data);

      if (trendRes.data && trendRes.data.length > 0) {
        setSpotlightVideo(trendRes.data[0]);
        setTrendingVideos(trendRes.data.slice(1, 5));
      }

      // Fetch church/fellowship videos
      const churchRes = await listMedia({
        kind: 'video',
        sort: 'recent',
        limit: 6,
        category: activeCategory !== 'All' ? activeCategory : undefined,
      });

      if (churchRes.data) {
        setChurchVideos(churchRes.data.slice(0, 4));
      }
    } catch (err) {
      console.warn('[VideosView] Curated blocks load notice:', err.message);
    }
  }, [session?.user?.id, activeCategory]);

  // Load primary catalog (All Videos)
  const loadPrimaryCatalog = useCallback(async (isReset = false) => {
    if (isReset) {
      setLoadingInitial(true);
      setPageOffset(0);
    } else {
      setLoadingMore(true);
    }

    const currentOffset = isReset ? 0 : pageOffset;

    try {
      const { data, count, error } = await listMedia({
        kind: 'video',
        category: activeCategory !== 'All' ? activeCategory : undefined,
        query: debouncedQuery || undefined,
        sort: activeSort,
        limit: 12,
        offset: currentOffset,
      });

      if (error && (!data || data.length === 0)) {
        if (isReset) setFetchError(error.message || 'Failed to load videos.');
      } else {
        const nextItems = data || [];
        setAllVideos((prev) => (isReset ? nextItems : [...prev, ...nextItems]));
        setHasMore(nextItems.length === 12);
        setPageOffset(currentOffset + nextItems.length);
      }
    } catch (err) {
      if (isReset) setFetchError(err.message || 'Network error loading videos.');
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [activeCategory, debouncedQuery, activeSort, pageOffset]);

  // Initial load
  useEffect(() => {
    loadCuratedBlocks();
    loadPrimaryCatalog(true);
  }, [loadCuratedBlocks, activeCategory, debouncedQuery, activeSort]);

  // Handle Save / Bookmark toggle
  async function handleToggleSaveVideo(video, e) {
    if (e) e.stopPropagation();
    if (!session?.user?.id) {
      if (openAuth) openAuth('signin');
      return;
    }

    const id = video.id;
    const isSaved = savedIds.has(id);
    const nextSaved = new Set(savedIds);
    if (isSaved) nextSaved.delete(id);
    else nextSaved.add(id);
    setSavedIds(nextSaved);

    playSound('reaction');
    showToast(isSaved ? 'Removed from Watch Later' : 'Saved to Watch Later');
    await toggleSave(id);
  }

  // Handle Share video link
  async function handleShareVideo(video, e) {
    if (e) e.stopPropagation();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/watch/${video.id}` : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          url,
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(url);
    showToast('Video link copied!');
  }

  // Handle Delete video (Creator action)
  async function handleDeleteVideo(video, e) {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this video?')) return;

    const { error } = await deleteMedia(video.id);
    if (error) {
      showToast('Error deleting video: ' + error.message);
    } else {
      setAllVideos((prev) => prev.filter((v) => v.id !== video.id));
      showToast('Video deleted');
      playSound('reaction');
    }
  }

  // Open Watch overlay (preserves user scroll position)
  function handleOpenWatch(video) {
    setActiveWatchVideoId(video.id);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({ videoId: video.id }, video.title, `/watch/${video.id}`);
    }
  }

  function handleCloseWatch() {
    setActiveWatchVideoId(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
  }

  // Listen to browser popstate to handle back button for overlay
  useEffect(() => {
    function handlePopState() {
      if (activeWatchVideoId) {
        setActiveWatchVideoId(null);
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeWatchVideoId]);

  // Format seconds to mm:ss
  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <div className="section-feed-view videos-view-container">
      {/* 1. Header Toolbar: Search, Filters, Sort, Layout Switcher & Creator Upload */}
      <div className="video-hub-top-toolbar">
        <div className="video-hub-search-row">
          <div className="video-search-input-wrap">
            <Search size={16} className="video-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sermons, teachings, worship songs, speakers..."
              className="video-search-field"
              aria-label="Search videos"
            />
            {searchQuery && (
              <button
                type="button"
                className="video-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            className="video-upload-cta-btn"
            onClick={() => {
              if (!session?.user?.id && openAuth) {
                openAuth('signin');
                return;
              }
              setShowUploadModal(true);
            }}
            aria-label="Upload video"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Upload Video</span>
          </button>
        </div>

        {/* Categories Strip, Sort Menu & Layout Switcher */}
        <div className="video-filter-controls-strip">
          <div className="video-categories-scroll-wrap no-scrollbar">
            <FilterChips
              chips={VIDEO_CATEGORIES}
              activeId={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>

          <div className="video-sort-layout-group">
            <SortMenu
              options={SORT_OPTIONS}
              activeId={activeSort}
              onSelect={setActiveSort}
            />
            <LayoutSwitcher
              value={activeLayout}
              onChange={setActiveLayout}
              storageKey="shammah_videos_layout"
            />
          </div>
        </div>
      </div>

      {/* 2. Stacked Content Blocks */}
      <div className="video-blocks-stack">
        {/* Block A: Continue Watching (Rail) */}
        {continueWatching.length > 0 && !debouncedQuery && (
          <SectionBlock
            title="Continue Watching"
            subtitle="Pick up where you left off"
            count={continueWatching.length}
            accent="#06b6d4"
          >
            <ContentLayout
              layout="rail"
              items={continueWatching}
              renderItem={(item) => (
                <AccentCard
                  key={item.id}
                  accent="#06b6d4"
                  variant="wash"
                  hoverGlow={true}
                  className="continue-watching-card"
                  onClick={() => handleOpenWatch(item)}
                >
                  <div className="cw-thumb-wrapper">
                    <img
                      src={item.thumb_url || '/assets/aistudio/pic_4e5732f2.png'}
                      alt={item.title}
                      className="cw-thumb-img"
                      loading="lazy"
                    />
                    <div className="cw-play-badge">
                      <Play size={16} fill="#ffffff" />
                    </div>
                    {/* Playback Progress Indicator */}
                    <div className="cw-progress-bar-wrap">
                      <div
                        className="cw-progress-bar-fill"
                        style={{ width: `${item.playback_percent || 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="cw-info-content">
                    <h4 className="cw-card-title truncate-2">{item.title}</h4>
                    <span className="cw-card-channel">
                      {item.author?.display_name || 'Teacher'}
                    </span>
                    <span className="cw-card-remaining">
                      {Math.max(1, Math.round(((item.playback_duration || item.duration_seconds || 0) - (item.playback_position || 0)) / 60))} min left
                    </span>
                  </div>
                </AccentCard>
              )}
            />
          </SectionBlock>
        )}

        {/* Block B: Spotlight / Featured Sermon */}
        {spotlightVideo && !debouncedQuery && activeCategory === 'All' && (
          <SectionBlock
            title="Featured Message"
            subtitle="Recommended community teaching"
            accent="#8b5cf6"
          >
            <ContentLayout
              layout="spotlight"
              items={[spotlightVideo]}
              renderItem={(item) => (
                <AccentCard
                  key={item.id}
                  accent="#8b5cf6"
                  variant="edge"
                  hoverGlow={true}
                  className="spotlight-featured-card"
                  onClick={() => handleOpenWatch(item)}
                >
                  <div className="spotlight-hero-media">
                    <img
                      src={item.thumb_url || '/assets/aistudio/pic_4e5732f2.png'}
                      alt={item.title}
                      className="spotlight-hero-img"
                    />
                    <div className="spotlight-hero-scrim" />
                    <div className="spotlight-hero-badge">
                      <Sparkles size={13} className="text-amber-400" />
                      <span>Spotlight</span>
                    </div>
                    <span className="spotlight-hero-duration">
                      {formatDuration(item.duration_seconds)}
                    </span>
                    <div className="spotlight-hero-play-circle">
                      <Play size={28} fill="#ffffff" />
                    </div>
                  </div>
                  <div className="spotlight-hero-details">
                    <span className="spotlight-category-chip">{item.category || 'Sermons'}</span>
                    <h2 className="spotlight-hero-title">{item.title}</h2>
                    <p className="spotlight-hero-desc truncate-2">{item.description}</p>
                    <div className="spotlight-author-row">
                      <Avatar
                        name={item.author?.display_name || 'Channel'}
                        src={item.author?.avatar_url}
                        className="avatar-sm"
                      />
                      <span className="spotlight-author-name">{item.author?.display_name || 'Shammah Member'}</span>
                      <span className="spotlight-meta-dot">·</span>
                      <span className="spotlight-views-text">{item.view_count || 0} views</span>
                    </div>
                  </div>
                </AccentCard>
              )}
            />
          </SectionBlock>
        )}

        {/* Block C: Reels Strip (Horizontal rail of 9:16 portrait cards) */}
        {reelsList.length > 0 && !debouncedQuery && (
          <SectionBlock
            title="Faith Reels"
            subtitle="Quick vertical testimonies & worship moments"
            count={reelsList.length}
            accent="#ec4899"
            actionLabel="See All"
            onAction={() => {
              if (typeof window !== 'undefined') window.location.href = '/reels';
            }}
          >
            <div className="reels-strip-rail no-scrollbar">
              {reelsList.map((reel, rIdx) => (
                <div
                  key={reel.id}
                  className="reels-strip-card"
                  onClick={() => setActiveReelIndex(rIdx)}
                >
                  <div className="reels-strip-thumb-wrap">
                    <video
                      src={reel.media_url}
                      className="reels-strip-video-preview"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div className="reels-strip-gradient" />
                    <div className="reels-strip-views-badge">
                      <Eye size={11} /> {reel.view_count || 0}
                    </div>
                    <div className="reels-strip-play-badge">
                      <Play size={14} fill="#ffffff" />
                    </div>
                    <div className="reels-strip-bottom-author">
                      <Avatar
                        name={reel.profiles?.display_name || 'Creator'}
                        src={reel.profiles?.avatar_url}
                        className="avatar-xs reels-strip-avatar"
                      />
                      <span className="reels-strip-name truncate">
                        {reel.profiles?.display_name || 'Believer'}
                      </span>
                    </div>
                  </div>
                  <p className="reels-strip-caption truncate-2">{reel.text_content}</p>
                </div>
              ))}
            </div>
          </SectionBlock>
        )}

        {/* Block D: Trending Now (Magazine-flat) */}
        {trendingVideos.length > 0 && !debouncedQuery && (
          <SectionBlock
            title="Trending Now"
            subtitle="Most engaged faith broadcasts this week"
            count={trendingVideos.length}
            accent="#f59e0b"
          >
            <ContentLayout
              layout="magazine-flat"
              items={trendingVideos}
              renderItem={(video) => (
                <VideoCardItem
                  key={video.id}
                  video={video}
                  session={session}
                  currentUser={currentUser}
                  onOpenWatch={handleOpenWatch}
                  onToggleSave={handleToggleSaveVideo}
                  onShare={handleShareVideo}
                  onDelete={handleDeleteVideo}
                  formatDuration={formatDuration}
                  now={now}
                />
              )}
            />
          </SectionBlock>
        )}

        {/* Block E: Teaching & Sermon Series (Rail) */}
        {seriesList.length > 0 && !debouncedQuery && (
          <SectionBlock
            title="Study & Sermon Series"
            subtitle="Curated multi-part kingdom teachings"
            count={seriesList.length}
            accent="#10b981"
          >
            <ContentLayout
              layout="rail"
              items={seriesList}
              renderItem={(series) => (
                <AccentCard
                  key={series.id}
                  accent="#10b981"
                  variant="wash"
                  hoverGlow={true}
                  className="series-rail-card"
                  onClick={() => {
                    setActiveCategory(series.title);
                  }}
                >
                  <div className="series-cover-wrap">
                    <img
                      src={series.cover_url || '/assets/aistudio/pic_4e5732f2.png'}
                      alt={series.title}
                      className="series-cover-img"
                      loading="lazy"
                    />
                    <div className="series-episodes-pill">
                      <FolderPlus size={12} />
                      <span>{series.episodes?.[0]?.count || 1} Parts</span>
                    </div>
                  </div>
                  <div className="series-card-content">
                    <h4 className="series-card-title truncate-2">{series.title}</h4>
                    <span className="series-card-owner">{series.owner?.display_name || 'Ministry Series'}</span>
                  </div>
                </AccentCard>
              )}
            />
          </SectionBlock>
        )}

        {/* Block F: Primary Catalog: All Videos (User layout switcher driven) */}
        <SectionBlock
          title={debouncedQuery ? `Search Results for "${debouncedQuery}"` : activeCategory !== 'All' ? `${activeCategory} Videos` : 'All Videos'}
          subtitle={`${allVideos.length} video broadcasts`}
          count={allVideos.length}
          accent="#0ea5e9"
        >
          {loadingInitial ? (
            <SkeletonLayout count={6} layout={activeLayout} />
          ) : fetchError ? (
            <ErrorState message={fetchError} onRetry={() => loadPrimaryCatalog(true)} />
          ) : allVideos.length === 0 ? (
            <EmptyState
              title="No videos found"
              description="Try adjusting your search terms or select another category."
              icon={VideoIcon}
              actionLabel="Reset Filters"
              onAction={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
            />
          ) : (
            <>
              <ContentLayout
                layout={activeLayout}
                items={allVideos}
                renderItem={(video) => (
                  <VideoCardItem
                    key={video.id}
                    video={video}
                    session={session}
                    currentUser={currentUser}
                    onOpenWatch={handleOpenWatch}
                    onToggleSave={handleToggleSaveVideo}
                    onShare={handleShareVideo}
                    onDelete={handleDeleteVideo}
                    formatDuration={formatDuration}
                    now={now}
                  />
                )}
              />

              {/* Infinite Scroll Sentinel */}
              <InfiniteSentinel
                hasMore={hasMore}
                loading={loadingMore}
                onLoadMore={() => loadPrimaryCatalog(false)}
              />
            </>
          )}
        </SectionBlock>
      </div>

      {/* 3. In-Page YouTube-Style Watch Overlay (Preserves scroll) */}
      {activeWatchVideoId && (
        <div className="video-watch-overlay-modal" role="dialog" aria-modal="true">
          <VideoWatchView
            videoId={activeWatchVideoId}
            session={session}
            currentUser={currentUser}
            isOverlay={true}
            onClose={handleCloseWatch}
            openAuth={openAuth}
            onSelectVideo={(item) => setActiveWatchVideoId(item.id)}
          />
        </div>
      )}

      {/* 4. Fullscreen TikTok-Style Reels Viewer Modal */}
      {activeReelIndex !== null && (
        <ReelViewerModal
          reels={reelsList}
          initialIndex={activeReelIndex}
          currentUser={currentUser}
          session={session}
          onClose={() => setActiveReelIndex(null)}
          openAuth={openAuth}
        />
      )}

      {/* 5. Creator Media Upload Modal */}
      {showUploadModal && (
        <MediaUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          defaultKind="video"
          onSuccess={(newVideo) => {
            setAllVideos((prev) => [newVideo, ...prev]);
            showToast('Video published successfully!');
          }}
        />
      )}

      {/* 6. Toast Notification */}
      {toastMessage && (
        <div className="video-toast-banner" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

/**
 * Standard 16:9 Video Card Component
 */
function VideoCardItem({
  video,
  session,
  currentUser,
  onOpenWatch,
  onToggleSave,
  onShare,
  onDelete,
  formatDuration,
  now,
}) {
  const isOwner = session?.user?.id && session.user.id === video.author_id;
  const accent = video.accent || accentFor(video.title || video.id);

  return (
    <AccentCard
      accent={accent}
      variant="wash"
      hoverGlow={true}
      className="video-standard-item-card"
      onClick={() => onOpenWatch(video)}
    >
      {/* 16:9 Thumbnail Box */}
      <div className="vcard-thumb-wrap">
        <img
          src={video.thumb_url || '/assets/aistudio/pic_4e5732f2.png'}
          alt={video.title}
          className="vcard-thumb-img"
          loading="lazy"
        />
        <span className="vcard-duration-badge">
          {formatDuration(video.duration_seconds)}
        </span>
        <div className="vcard-play-hover-overlay">
          <Play size={24} fill="#ffffff" />
        </div>
      </div>

      {/* Video Info Strip */}
      <div className="vcard-body">
        <div className="vcard-author-avatar-wrap">
          <Avatar
            name={video.author?.display_name || 'Channel'}
            src={video.author?.avatar_url}
            className="avatar-sm"
          />
        </div>

        <div className="vcard-content-wrap">
          <h4 className="vcard-title truncate-2">{video.title}</h4>

          <div className="vcard-author-row">
            <span className="vcard-author-name truncate">{video.author?.display_name || 'Faith Member'}</span>
            {video.author?.badge && <MemberBadge badgeId={video.author.badge} size="xs" />}
            {video.author?.badge_verified && <VerifiedBadge badge={video.author.badge} size={12} />}
          </div>

          <div className="vcard-meta-row">
            <span>{video.view_count || 0} views</span>
            <span className="vcard-meta-dot">·</span>
            <span>{video.published_at ? formatPostDate(video.published_at, now) : 'Recently'}</span>
            {video.category && (
              <>
                <span className="vcard-meta-dot">·</span>
                <span className="vcard-category-tag">{video.category}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="vcard-actions-dock" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="vcard-action-btn"
            onClick={(e) => onToggleSave(video, e)}
            title="Save to Watch Later"
            aria-label="Save video"
          >
            <Bookmark size={15} />
          </button>
          <button
            type="button"
            className="vcard-action-btn"
            onClick={(e) => onShare(video, e)}
            title="Share"
            aria-label="Share video"
          >
            <Share2 size={15} />
          </button>
          {isOwner && (
            <button
              type="button"
              className="vcard-action-btn danger"
              onClick={(e) => onDelete(video, e)}
              title="Delete video"
              aria-label="Delete video"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </AccentCard>
  );
}
