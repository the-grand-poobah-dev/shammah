'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Music,
  Mic,
  Disc,
  Clock,
  Sparkles,
  Share2,
  MessageCircle,
  Repeat,
  Heart,
  Bookmark,
  Radio,
  X,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import RepostModal from './RepostModal';
import { isPostReposted, getPostRepostCount, toggleRepost } from '../lib/postInteractions';

const SAMPLE_AUDIO_TRACKS = [
  {
    id: 'audio-sermon-1',
    title: 'The Secret Place of the Most High (Psalm 91 Expository Sermon)',
    speaker: 'Pastor David Mwangi',
    church: 'Shammah Assembly of Saints',
    type: 'podcast', // podcast | song | voicenote
    category_id: 'lessons',
    duration_label: '32:40',
    duration_seconds: 1960,
    audio_url: 'https://actions.google.com/sounds/v1/ambiences/gentle_stream.ogg',
    cover_image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=500',
    description: 'An in-depth teaching on spiritual refuge, angel ministry, and dwelling under the protective canopy of the Almighty in times of testing.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    likes_count: 82,
    comments_count: 19,
    reposts_count: 27,
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
    id: 'audio-worship-1',
    title: 'Worthy is the Lamb (Live Worship & Spontaneous Praise)',
    speaker: 'Sister Mary Grace & Shammah Worship',
    church: 'Grace Community Worship',
    type: 'song',
    category_id: 'worship',
    duration_label: '6:18',
    duration_seconds: 378,
    audio_url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain.ogg',
    cover_image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
    description: 'Captured live during Friday night praise vigil. Acoustic guitar, strings, and spontaneous congregational prayer in the Spirit.',
    created_at: new Date(Date.now() - 3600000 * 9).toISOString(),
    likes_count: 145,
    comments_count: 32,
    reposts_count: 53,
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
    id: 'audio-voicenote-1',
    title: 'Morning Intercession & Declarations for Families',
    speaker: 'Sister Esther Wanjiku',
    church: 'Intercessory Prayer Band',
    type: 'voicenote',
    category_id: 'prayer',
    duration_label: '3:12',
    duration_seconds: 192,
    audio_url: 'https://actions.google.com/sounds/v1/ambiences/gentle_stream.ogg',
    cover_image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500',
    description: 'Personal voice prayer recorded at dawn: speaking peace over troubled homes, children in school, and health recovery.',
    created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    likes_count: 63,
    comments_count: 11,
    reposts_count: 18,
    profiles: {
      name: 'Esther Wanjiku',
      display_name: 'Esther Wanjiku',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      badge: 'intercessor',
      badge_verified: true,
      role: 'member',
    },
  },
  {
    id: 'audio-sermon-2',
    title: 'Walking in Biblical Wisdom & Financial Stewardship',
    speaker: 'Elder James Ochieng',
    church: 'Men of Faith Fellowship',
    type: 'podcast',
    category_id: 'lessons',
    duration_label: '24:50',
    duration_seconds: 1490,
    audio_url: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain.ogg',
    cover_image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=500',
    description: 'Proverbs series examining integrity in business, generosity in the kingdom, and breaking the cycles of lack through faithful stewardship.',
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    likes_count: 79,
    comments_count: 15,
    reposts_count: 24,
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

const AUDIO_PLAYLISTS = [
  {
    id: 'pl-audio-psalms',
    title: 'Psalms of Deliverance & Adoration',
    trackCount: 14,
    duration: '1h 12m',
    cover: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500',
    curator: 'Scripture Audio Vault',
  },
  {
    id: 'pl-audio-revival',
    title: 'Spiritual Awakening Sermon Archive',
    trackCount: 9,
    duration: '4h 30m',
    cover: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500',
    curator: 'Pastoral Council',
  },
];

function AudioTrackCard({
  track,
  isActiveTrack,
  isPlaying,
  onPlayTrack,
  onPauseTrack,
  session,
  currentUser,
  openAuth,
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(track.comments_count || 0);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(track.reposts_count || 0);
  const [shareToast, setShareToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    isPostReposted(track.id, session?.user?.id).then((isRep) => {
      if (!cancelled) setReposted(isRep);
    });
    getPostRepostCount(track.id, track.reposts_count || 0).then((cnt) => {
      if (!cancelled) setRepostCount(cnt);
    });
    return () => {
      cancelled = true;
    };
  }, [track.id, session?.user?.id, track.reposts_count]);

  const authorName = track.profiles?.name || track.profiles?.display_name || track.speaker || 'Member';

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(typeof window !== 'undefined' ? window.location.href : '');
    setShareToast('Audio link copied!');
    setTimeout(() => setShareToast(''), 2000);
  }

  const isCurrentPlaying = isActiveTrack && isPlaying;

  return (
    <article className={`post-card audio-track-card${isCurrentPlaying ? ' is-active-playing' : ''}`}>
      <div className="audio-card-top-row">
        <div className="audio-cover-thumbnail" style={{ backgroundImage: `url(${track.cover_image})` }}>
          <button
            type="button"
            className="audio-play-fab"
            onClick={() => (isCurrentPlaying ? onPauseTrack() : onPlayTrack(track))}
            aria-label={isCurrentPlaying ? 'Pause audio' : 'Play audio'}
            title={isCurrentPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
          </button>
        </div>

        <div className="audio-main-meta">
          <div className="audio-badge-type-tag">
            {track.type === 'song' ? (
              <span className="audio-type-chip song"><Music size={11} /> Worship Track</span>
            ) : track.type === 'voicenote' ? (
              <span className="audio-type-chip voicenote"><Mic size={11} /> Voice Prayer</span>
            ) : (
              <span className="audio-type-chip podcast"><Headphones size={11} /> Sermon Podcast</span>
            )}
            <span className="audio-duration-meta">{track.duration_label}</span>
          </div>

          <h3 className="audio-track-title">{track.title}</h3>

          <div className="audio-speaker-row">
            <Avatar name={authorName} src={track.profiles?.avatar_url} className="avatar-xs" />
            <span className="audio-speaker-name">{authorName}</span>
            {track.profiles?.badge && <MemberBadge badgeId={track.profiles.badge} size="sm" />}
            {track.profiles?.badge_verified && (
              <VerifiedBadge badge={track.profiles.badge} size={13} />
            )}
          </div>
        </div>
      </div>

      <p className="audio-track-desc">{track.description}</p>

      {/* Simulated Live Audio Waveform Graphic */}
      <div className="audio-waveform-bar" onClick={() => onPlayTrack(track)}>
        <div className="waveform-lines">
          {[35, 60, 90, 45, 75, 100, 80, 50, 65, 95, 70, 40, 85, 90, 60, 45, 80, 100, 65, 50, 75, 90, 40, 60, 85].map((h, i) => (
            <span
              key={i}
              className={`wf-bar${isCurrentPlaying ? ' animated' : ''}`}
              style={{
                height: `${h}%`,
                animationDelay: `${(i % 5) * 0.12}s`,
              }}
            />
          ))}
        </div>
      </div>

      {shareToast && <div className="audio-toast-pill">{shareToast}</div>}

      <div className="post-actions">
        <ReactionBar
          targetType="post"
          targetId={track.id}
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
          title="Repost audio"
        >
          <Repeat size={15} />
          <span>Repost</span>
          {repostCount > 0 && <span className="repost-count-badge">{repostCount}</span>}
        </button>

        <button type="button" className="action-btn" onClick={handleShare} title="Share audio">
          <Share2 size={15} />
          <span>Share</span>
        </button>
      </div>

      {commentsOpen && (
        <CommentThread
          postId={track.id}
          session={session}
          onRequireSignIn={() => openAuth('signin')}
          onCountChange={setCommentCount}
        />
      )}

      {showRepostModal && (
        <RepostModal
          post={track}
          currentUser={currentUser}
          onClose={() => setShowRepostModal(false)}
          onConfirm={async (quote) => {
            const res = await toggleRepost(track.id, track, currentUser, quote);
            setReposted(res.reposted);
            setRepostCount(res.count);
          }}
        />
      )}
    </article>
  );
}

export default function AudioView({ feedPosts = [], session, currentUser, openAuth }) {
  const [subTab, setSubTab] = useState('all'); // all | podcasts | worship | voicenotes | playlists
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);

  // Extract all audio posts from community feed
  const postAudio = feedPosts.filter((p) => p.media_url && (p.media_type === 'audio' || p.media_type === 'podcast'));

  const combinedAudio = [
    ...SAMPLE_AUDIO_TRACKS,
    ...postAudio.map((p) => ({
      ...p,
      title: p.text_content ? p.text_content.slice(0, 60) + '...' : 'Community Fellowship Audio',
      speaker: p.profiles?.display_name || 'Member',
      type: 'podcast',
      duration_label: '14:20',
      duration_seconds: 860,
      audio_url: p.media_url,
      cover_image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500',
      description: p.text_content,
    })),
  ];

  const podcasts = combinedAudio.filter((a) => a.type === 'podcast');
  const worship = combinedAudio.filter((a) => a.type === 'song');
  const voicenotes = combinedAudio.filter((a) => a.type === 'voicenote');

  const displayedAudio =
    subTab === 'podcasts'
      ? podcasts
      : subTab === 'worship'
        ? worship
        : subTab === 'voicenotes'
          ? voicenotes
          : combinedAudio;

  function handlePlayTrack(track) {
    if (currentTrack?.id === track.id) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
  }

  function handlePauseTrack() {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }

  function handleSkip(seconds) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
  }

  function handleCycleSpeed() {
    if (!audioRef.current) return;
    const next = playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1;
    audioRef.current.playbackRate = next;
    setPlaybackSpeed(next);
  }

  return (
    <div className="section-feed-view audio-view-container">
      {/* Sub-navigation bar inside Audio segment */}
      <div className="video-subnav-bar no-scrollbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'all'}
          className={`video-subnav-pill${subTab === 'all' ? ' active' : ''}`}
          onClick={() => setSubTab('all')}
        >
          <span>All Audio ({combinedAudio.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'podcasts'}
          className={`video-subnav-pill${subTab === 'podcasts' ? ' active' : ''}`}
          onClick={() => setSubTab('podcasts')}
        >
          <Headphones size={13} />
          <span>Sermons &amp; Podcasts ({podcasts.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'worship'}
          className={`video-subnav-pill${subTab === 'worship' ? ' active' : ''}`}
          onClick={() => setSubTab('worship')}
        >
          <Music size={13} />
          <span>Worship Songs ({worship.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'voicenotes'}
          className={`video-subnav-pill${subTab === 'voicenotes' ? ' active' : ''}`}
          onClick={() => setSubTab('voicenotes')}
        >
          <Mic size={13} />
          <span>Voice Prayers ({voicenotes.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'playlists'}
          className={`video-subnav-pill${subTab === 'playlists' ? ' active' : ''}`}
          onClick={() => setSubTab('playlists')}
        >
          <Disc size={13} />
          <span>Playlists ({AUDIO_PLAYLISTS.length})</span>
        </button>
      </div>

      {/* Playlists view */}
      {subTab === 'playlists' && (
        <div className="video-playlists-grid">
          {AUDIO_PLAYLISTS.map((pl) => (
            <div key={pl.id} className="video-playlist-card post-card">
              <div className="pl-cover-wrap" style={{ backgroundImage: `url(${pl.cover})` }}>
                <span className="pl-video-count-badge">
                  <Headphones size={12} /> {pl.trackCount} Tracks
                </span>
                <button type="button" className="pl-play-btn" title="Play audio album" aria-label="Play">
                  <Play size={20} fill="#ffffff" />
                </button>
              </div>
              <div className="pl-info-wrap">
                <h4 className="pl-title">{pl.title}</h4>
                <span className="pl-meta">{pl.curator} · {pl.duration}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audio Tracks List */}
      {subTab !== 'playlists' && (
        <div className="audio-tracks-list">
          {displayedAudio.map((track) => (
            <AudioTrackCard
              key={track.id}
              track={track}
              isActiveTrack={currentTrack?.id === track.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onPauseTrack={handlePauseTrack}
              session={session}
              currentUser={currentUser}
              openAuth={openAuth}
            />
          ))}
        </div>
      )}

      {/* Hidden HTML5 Audio Element */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audio_url}
          autoPlay
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Persistent Mini Audio Player Toolbar when audio is active */}
      {currentTrack && (
        <div className="persistent-audio-player-bar">
          <div className="mini-player-content">
            <div className="mini-track-info">
              <span className="mini-track-title">{currentTrack.title}</span>
              <span className="mini-speaker-name">{currentTrack.speaker || currentTrack.profiles?.display_name}</span>
            </div>

            <div className="mini-player-controls">
              <button type="button" className="mini-ctrl-btn" onClick={() => handleSkip(-15)} title="Rewind 15s">
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                className="mini-ctrl-btn play-pause-main"
                onClick={() => (isPlaying ? handlePauseTrack() : handlePlayTrack(currentTrack))}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
              </button>

              <button type="button" className="mini-ctrl-btn" onClick={() => handleSkip(15)} title="Forward 15s">
                <RotateCw size={16} />
              </button>

              <button type="button" className="mini-ctrl-btn speed-toggle" onClick={handleCycleSpeed}>
                {playbackSpeed}x
              </button>

              <button
                type="button"
                className="mini-ctrl-btn close-player"
                onClick={() => {
                  handlePauseTrack();
                  setCurrentTrack(null);
                }}
                title="Close player"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
