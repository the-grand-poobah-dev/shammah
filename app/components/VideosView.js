'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Video as VideoIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  Clock,
  Download,
  Share2,
  MessageCircle,
  Repeat,
  Heart,
  Bookmark,
  Check,
  Disc,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import RepostModal from './RepostModal';
import ReelViewerModal from './ReelViewerModal';
import { isPostReposted, getPostRepostCount, toggleRepost } from '../lib/postInteractions';

// Sample church longform and shortform video content
const SAMPLE_VIDEOS = [
  {
    id: 'vid-reel-1',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    media_type: 'video',
    is_reel: true,
    duration_seconds: 48,
    duration_label: '0:48',
    category_id: 'prayer',
    text_content: 'Never cease praying! When the enemy whispers you are defeated, declare: "No weapon formed against me shall prosper!" 🔥🙌 #PrayerWarrior #Faith',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes_count: 68,
    comments_count: 14,
    reposts_count: 22,
    profiles: {
      name: 'Pastor David Mwangi',
      display_name: 'Pastor David Mwangi',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      badge: 'pastor',
      badge_verified: true,
      role: 'church_admin',
    },
  },
  {
    id: 'vid-long-1',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    media_type: 'video',
    is_reel: false,
    duration_seconds: 596,
    duration_label: '9:56',
    category_id: 'lessons',
    title: 'The Covenant of Grace: Walking in Supernatural Favor',
    text_content: 'Full Sunday sermon teaching from Romans 8. Discover how God has already qualified you through Christ Jesus and how walking by the Spirit releases kingdom breakthrough into every sphere of life.',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    likes_count: 142,
    comments_count: 36,
    reposts_count: 48,
    profiles: {
      name: 'Bishop Sarah Ndung\'u',
      display_name: 'Bishop Sarah Ndung\'u',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      badge: 'bishop',
      badge_verified: true,
      role: 'church_admin',
    },
  },
  {
    id: 'vid-reel-2',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    media_type: 'video',
    is_reel: true,
    duration_seconds: 58,
    duration_label: '0:58',
    category_id: 'worship',
    text_content: 'Live acoustic praise from morning fellowship: "You are the God who does wonders!" Drop an Amen if your soul is blessed today. 🎶🙏',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    likes_count: 94,
    comments_count: 26,
    reposts_count: 38,
    profiles: {
      name: 'Sister Mary Grace',
      display_name: 'Sister Mary Grace',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'worship',
      badge_verified: true,
      role: 'member',
    },
  },
  {
    id: 'vid-long-2',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    media_type: 'video',
    is_reel: false,
    duration_seconds: 654,
    duration_label: '10:54',
    category_id: 'lessons',
    title: 'Kingdom Leadership: Serving with Humility and Power',
    text_content: 'Leadership seminar series for church workers, elders, and youth leaders. How to model Christ-like servant leadership and cultivate spiritual unity.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    likes_count: 110,
    comments_count: 28,
    reposts_count: 31,
    profiles: {
      name: 'Elder James Ochieng',
      display_name: 'Elder James Ochieng',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      badge: 'elder',
      badge_verified: true,
      role: 'member',
    },
  },
];

const VIDEO_PLAYLISTS = [
  {
    id: 'pl-sermons-2026',
    title: 'Grace & Favor: Sunday Sermon Series',
    videoCount: 8,
    totalDuration: '1h 45m',
    coverImage: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=500',
    curator: 'Grace Assembly Media Team',
  },
  {
    id: 'pl-worship-sessions',
    title: 'Acoustic Praise & Adoration Nights',
    videoCount: 12,
    totalDuration: '2h 10m',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
    curator: 'Shammah Worship Ministry',
  },
];

function VideoCard({ video, session, currentUser, openAuth, onOpenReelViewer }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(video.comments_count || 0);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(video.reposts_count || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    isPostReposted(video.id, session?.user?.id).then((isRep) => {
      if (!cancelled) setReposted(isRep);
    });
    getPostRepostCount(video.id, video.reposts_count || 0).then((cnt) => {
      if (!cancelled) setRepostCount(cnt);
    });
    return () => {
      cancelled = true;
    };
  }, [video.id, session?.user?.id, video.reposts_count]);

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }

  function handleSpeedCycle() {
    if (!videoRef.current) return;
    const next = speed === 1 ? 1.25 : speed === 1.25 ? 1.5 : 1;
    videoRef.current.playbackRate = next;
    setSpeed(next);
  }

  function handleFullscreen() {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  }

  function handleSaveDownload() {
    setIsSaved((s) => !s);
    setShareMsg(!isSaved ? 'Saved to downloads for offline!' : 'Removed from downloads');
    setTimeout(() => setShareMsg(''), 2500);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || video.text_content || 'Faith Video',
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(typeof window !== 'undefined' ? window.location.href : '');
    setShareMsg('Link copied to clipboard!');
    setTimeout(() => setShareMsg(''), 2000);
  }

  const authorName = video.profiles?.name || video.profiles?.display_name || 'Member';

  // If this is a reel, clicking opens the fullscreen portrait viewer
  if (video.is_reel) {
    return (
      <article className="post-card video-card reel-grid-card">
        <div className="reel-thumbnail-wrap" onClick={() => onOpenReelViewer(video)}>
          <video src={video.media_url} muted preload="metadata" />
          <div className="reel-card-overlay">
            <span className="reel-badge">
              <Sparkles size={12} /> Reel ({video.duration_label})
            </span>
            <button type="button" className="reel-center-play-fab" title="Open Fullscreen Reel">
              <Play size={20} fill="#ffffff" />
            </button>
          </div>
        </div>

        <div className="video-card-content">
          <div className="post-header">
            <Avatar name={authorName} src={video.profiles?.avatar_url} className="avatar-sm" />
            <div className="post-header-text">
              <div className="video-author-row">
                <span className="video-author-name">{authorName}</span>
                {video.profiles?.badge && <MemberBadge badgeId={video.profiles.badge} size="sm" />}
                {video.profiles?.badge_verified && (
                  <VerifiedBadge badge={video.profiles.badge} size={14} />
                )}
              </div>
              <span className="video-pub-time">{video.duration_label} · Short-form Reel</span>
            </div>
          </div>

          <p className="video-caption-text">{video.text_content}</p>

          <div className="post-actions">
            <ReactionBar
              targetType="post"
              targetId={video.id}
              session={session}
              onRequireSignIn={() => openAuth('signin')}
            />

            <button
              type="button"
              className="action-btn"
              onClick={() => onOpenReelViewer(video)}
              title="Watch reel & join comments"
            >
              <MessageCircle size={15} />
              <span>{commentCount > 0 ? commentCount : 'Comments'}</span>
            </button>

            <button
              type="button"
              className={`action-btn repost-btn${reposted ? ' is-reposted' : ''}`}
              onClick={() => {
                if (!session) return openAuth('signin');
                setShowRepostModal(true);
              }}
              title="Repost reel"
            >
              <Repeat size={15} />
              <span>Repost</span>
              {repostCount > 0 && <span className="repost-count-badge">{repostCount}</span>}
            </button>

            <button type="button" className="action-btn" onClick={handleShare} title="Share reel">
              <Share2 size={15} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {showRepostModal && (
          <RepostModal
            post={video}
            currentUser={currentUser}
            onClose={() => setShowRepostModal(false)}
            onConfirm={async (quote) => {
              const res = await toggleRepost(video.id, video, currentUser, quote);
              setReposted(res.reposted);
              setRepostCount(res.count);
            }}
          />
        )}
      </article>
    );
  }

  // Long-form video card
  return (
    <article className="post-card video-card video-card-longform">
      {/* Video Player & Tools Container */}
      <div className="video-player-container">
        <video
          ref={videoRef}
          src={video.media_url}
          className="video-element-long"
          playsInline
          onEnded={() => setIsPlaying(false)}
        />

        {/* Floating Custom Video Tools Toolbar */}
        <div className="video-controls-overlay">
          <div className="video-tools-bar">
            <button
              type="button"
              className="v-tool-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>

            <button
              type="button"
              className="v-tool-btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            <span className="v-tool-duration">
              <Clock size={12} /> {video.duration_label}
            </span>

            <div className="v-tool-spacer" />

            <button
              type="button"
              className="v-tool-btn speed-btn"
              onClick={handleSpeedCycle}
              title="Playback speed"
            >
              {speed}x
            </button>

            <button
              type="button"
              className={`v-tool-btn${isSaved ? ' active' : ''}`}
              onClick={handleSaveDownload}
              title={isSaved ? 'Saved offline' : 'Save for offline'}
              aria-label="Download"
            >
              <Download size={16} />
            </button>

            <button
              type="button"
              className="v-tool-btn"
              onClick={handleFullscreen}
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="video-card-content">
        <div className="post-header">
          <Avatar name={authorName} src={video.profiles?.avatar_url} className="avatar-sm" />
          <div className="post-header-text">
            <div className="video-author-row">
              <span className="video-author-name">{authorName}</span>
              {video.profiles?.badge && <MemberBadge badgeId={video.profiles.badge} size="sm" />}
              {video.profiles?.badge_verified && (
                <VerifiedBadge badge={video.profiles.badge} size={14} />
              )}
            </div>
            <span className="video-pub-time">{video.duration_label} · Sermon &amp; Teaching</span>
          </div>
        </div>

        {video.title && <h3 className="video-title-heading">{video.title}</h3>}
        <p className="video-caption-text">{video.text_content}</p>

        {shareMsg && <div className="video-toast-pill">{shareMsg}</div>}

        <div className="post-actions">
          <ReactionBar
            targetType="post"
            targetId={video.id}
            session={session}
            onRequireSignIn={() => openAuth('signin')}
          />

          <button
            type="button"
            className="action-btn"
            onClick={() => setCommentsOpen((v) => !v)}
            title="Comments"
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
            title="Repost teaching"
          >
            <Repeat size={15} />
            <span>Repost</span>
            {repostCount > 0 && <span className="repost-count-badge">{repostCount}</span>}
          </button>

          <button type="button" className="action-btn" onClick={handleShare} title="Share video">
            <Share2 size={15} />
            <span>Share</span>
          </button>
        </div>

        {commentsOpen && (
          <CommentThread
            postId={video.id}
            session={session}
            onRequireSignIn={() => openAuth('signin')}
            onCountChange={setCommentCount}
          />
        )}
      </div>

      {showRepostModal && (
        <RepostModal
          post={video}
          currentUser={currentUser}
          onClose={() => setShowRepostModal(false)}
          onConfirm={async (quote) => {
            const res = await toggleRepost(video.id, video, currentUser, quote);
            setReposted(res.reposted);
            setRepostCount(res.count);
          }}
        />
      )}
    </article>
  );
}

export default function VideosView({ feedPosts = [], session, currentUser, openAuth }) {
  const [subTab, setSubTab] = useState('all'); // all | reels | longform | playlists | saved
  const [activeReelIndex, setActiveReelIndex] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  // Extract all video posts from community feed
  const postVideos = feedPosts.filter((p) => p.media_url && (p.media_type === 'video' || p.media_type === 'reel'));

  const combinedVideos = [
    ...SAMPLE_VIDEOS,
    ...postVideos.map((p) => ({
      ...p,
      is_reel: !p.text_content?.includes('sermon') && (p.media_duration_seconds ? p.media_duration_seconds < 120 : true),
      duration_label: p.media_duration_seconds ? `${Math.floor(p.media_duration_seconds / 60)}:${(p.media_duration_seconds % 60).toString().padStart(2, '0')}` : '1:24',
    })),
  ];

  const reels = combinedVideos.filter((v) => v.is_reel);
  const longform = combinedVideos.filter((v) => !v.is_reel);

  const displayedVideos =
    subTab === 'reels'
      ? reels
      : subTab === 'longform'
        ? longform
        : subTab === 'saved'
          ? combinedVideos.filter((v) => savedIds.includes(v.id))
          : combinedVideos;

  function openReelViewer(reel) {
    const idx = reels.findIndex((r) => r.id === reel.id);
    setActiveReelIndex(idx !== -1 ? idx : 0);
  }

  return (
    <div className="section-feed-view videos-view-container">
      {/* Sub-navigation bar inside Videos segment */}
      <div className="video-subnav-bar no-scrollbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'all'}
          className={`video-subnav-pill${subTab === 'all' ? ' active' : ''}`}
          onClick={() => setSubTab('all')}
        >
          <span>All Videos ({combinedVideos.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'reels'}
          className={`video-subnav-pill${subTab === 'reels' ? ' active' : ''}`}
          onClick={() => setSubTab('reels')}
        >
          <Sparkles size={13} />
          <span>Reels &lt; 2 min ({reels.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'longform'}
          className={`video-subnav-pill${subTab === 'longform' ? ' active' : ''}`}
          onClick={() => setSubTab('longform')}
        >
          <Clock size={13} />
          <span>Sermons &gt; 2 min ({longform.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'playlists'}
          className={`video-subnav-pill${subTab === 'playlists' ? ' active' : ''}`}
          onClick={() => setSubTab('playlists')}
        >
          <Disc size={13} />
          <span>Playlists ({VIDEO_PLAYLISTS.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'saved'}
          className={`video-subnav-pill${subTab === 'saved' ? ' active' : ''}`}
          onClick={() => setSubTab('saved')}
        >
          <Bookmark size={13} />
          <span>Saved &amp; Downloads</span>
        </button>
      </div>

      {/* Playlists view */}
      {subTab === 'playlists' && (
        <div className="video-playlists-grid">
          {VIDEO_PLAYLISTS.map((pl) => (
            <div key={pl.id} className="video-playlist-card post-card">
              <div className="pl-cover-wrap" style={{ backgroundImage: `url(${pl.coverImage})` }}>
                <span className="pl-video-count-badge">
                  <VideoIcon size={12} /> {pl.videoCount} Videos
                </span>
                <button type="button" className="pl-play-btn" title="Play series" aria-label="Play">
                  <Play size={20} fill="#ffffff" />
                </button>
              </div>
              <div className="pl-info-wrap">
                <h4 className="pl-title">{pl.title}</h4>
                <span className="pl-meta">{pl.curator} · {pl.totalDuration}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Videos List / Grid */}
      {subTab !== 'playlists' && (
        <div className={`videos-list-container${subTab === 'reels' ? ' reels-grid-layout' : ''}`}>
          {displayedVideos.length === 0 ? (
            <div className="empty-state">
              <VideoIcon size={36} className="empty-icon" />
              <h3>No videos found under this filter</h3>
              <p>Explore all videos or upload your own testimony.</p>
            </div>
          ) : (
            displayedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                session={session}
                currentUser={currentUser}
                openAuth={openAuth}
                onOpenReelViewer={openReelViewer}
              />
            ))
          )}
        </div>
      )}

      {/* Fullscreen Portrait Reels Viewer Modal */}
      {activeReelIndex != null && (
        <ReelViewerModal
          reels={reels}
          initialIndex={activeReelIndex}
          currentUser={currentUser}
          session={session}
          onClose={() => setActiveReelIndex(null)}
          openAuth={openAuth}
        />
      )}
    </div>
  );
}
