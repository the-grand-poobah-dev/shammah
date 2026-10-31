'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Music,
  Plus,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Avatar from './Avatar';
import MemberName from './MemberName';
import VerifiedBadge from './VerifiedBadge';
import { playSound } from '../lib/soundEffects';
import { ContentLayout, LayoutSwitcher, AccentCard, EmptyState } from './layoutkit';
import { useLayoutMode } from '../lib/useLayoutMode';
import ReelCreatorModal from './ReelCreatorModal';
import CommentThread from './CommentThread';
import WatermarkShareModal from './WatermarkShareModal';
import { supabase } from '../lib/supabaseClient';

export const SAMPLE_REELS = [
  {
    id: 'reel-1',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'When God opens a door that no man can shut ✨',
    scripture: 'Revelation 3:8',
    audio_title: 'Original Sound · Grace & Praise Nairobi',
    likes_count: 248,
    comments_count: 36,
    accent: '#ec4899',
    creator: {
      id: 'cr-1',
      display_name: 'Pastor David Karanja',
      username: 'pastordavid',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      badge: 'pastor',
      badge_verified: true,
    },
  },
  {
    id: 'reel-2',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    title: 'Morning prayer over Kenya & East Africa 🙏',
    scripture: 'Psalm 121:1-2',
    audio_title: 'Worship Spontaneous in D Minor',
    likes_count: 512,
    comments_count: 84,
    accent: '#8b5cf6',
    creator: {
      id: 'cr-2',
      display_name: 'Joy Wambui',
      username: 'joywambui',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'worship_leader',
      badge_verified: true,
    },
  },
  {
    id: 'reel-3',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    title: 'Youth Choir rehearsal vibes before Sunday blast 🔥',
    scripture: 'Colossians 3:16',
    audio_title: 'Live Sanctuary Drums & Harmonies',
    likes_count: 389,
    comments_count: 42,
    accent: '#06b6d4',
    creator: {
      id: 'cr-3',
      display_name: 'Nairobi Worship Center',
      username: 'nwc_church',
      avatar_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
      badge: 'church_official',
      badge_verified: true,
    },
  },
];

export default function ReelsFeed({ currentUser, session, isModal = false, openAuth, initialReelId }) {
  const [layoutMode, setLayoutMode] = useLayoutMode('reels', 'list-rich');
  const [reels, setReels] = useState(SAMPLE_REELS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedMap, setLikedMap] = useState({});
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [activeCommentsReel, setActiveCommentsReel] = useState(null);
  const [activeShareReel, setActiveShareReel] = useState(null);
  const videoRefs = useRef({});

  useEffect(() => {
    async function loadReelsFromDb() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('media_type', 'reel')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          const mapped = data.map((p) => ({
            id: p.id,
            video_url: p.media_url || p.video_url,
            title: p.text_content || p.title,
            scripture: p.scripture_tag || 'Philippians 4:13',
            audio_title: p.audio_title || 'Original Faith Sound',
            likes_count: p.reaction_count || p.likes_count || 12,
            comments_count: p.comment_count || 0,
            accent: p.accent_color || '#ec4899',
            creator: {
              id: p.user_id,
              display_name: p.user_display_name || 'Believer',
              username: p.user_username || 'believer',
              avatar_url: p.user_avatar_url,
              badge: p.author_badge || 'member',
              badge_verified: Boolean(p.author_badge_verified),
            },
          }));
          setReels(mapped);
        }
      } catch (_) {}
    }
    loadReelsFromDb();
  }, []);

  const handleToggleLike = (reelId) => {
    playSound('reaction');
    setLikedMap((prev) => ({ ...prev, [reelId]: !prev[reelId] }));
  };

  const handleTogglePlay = (idx) => {
    const vid = videoRefs.current[idx];
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className={`section-feed-view reels-section-container ${isModal ? 'is-modal-view' : ''}`}>
      {/* Top Bar with Layout Controls & Create Reel Action */}
      {!isModal && (
        <div className="section-toolbar-row">
          <div className="section-header-meta">
            <h2 className="section-main-heading">Faith Reels</h2>
            <p className="section-main-subheading">Short inspiring testimonies, verses, and gospel highlights</p>
          </div>
          <div className="section-toolbar-actions">
            <button
              type="button"
              className="section-action-cta-btn"
              onClick={() => {
                playSound('pop');
                if (!session) {
                  openAuth?.();
                  return;
                }
                setShowCreatorModal(true);
              }}
              style={{ background: 'var(--teal, #06b6d4)' }}
            >
              <Plus size={16} />
              <span>Create Reel</span>
            </button>
            <LayoutSwitcher
              value={layoutMode}
              onChange={setLayoutMode}
              storageKey="shammah_layout_reels"
              options={[
                { id: 'list-rich', label: 'Immersive Feed', icon: ChevronDown },
                { id: 'magazine-x2', label: 'Grid', icon: LayoutSwitcher },
              ]}
            />
          </div>
        </div>
      )}

      {/* Render Reels Feed */}
      <ContentLayout
        layout={layoutMode}
        accent="#ec4899"
        items={reels}
        emptyState={
          <EmptyState
            icon={Sparkles}
            title="No faith reels yet"
            description="Be the first to share an inspiring praise testimony or short gospel clip."
            actionLabel="Create a Reel"
            onAction={() => setShowCreatorModal(true)}
            accent="#ec4899"
          />
        }
        renderItem={(reel, idx) => {
          const isLiked = Boolean(likedMap[reel.id]);
          const reelLikes = reel.likes_count + (isLiked ? 1 : 0);

          return (
            <AccentCard
              key={reel.id}
              accent={reel.accent || '#ec4899'}
              variant="wash"
              className={`reel-feed-card ${layoutMode === 'list-rich' ? 'immersive-card' : 'grid-card'}`}
            >
              <div className="reel-video-container aspect-9-16">
                <video
                  ref={(el) => {
                    if (el) videoRefs.current[idx] = el;
                  }}
                  src={reel.video_url}
                  className="reel-video-element"
                  loop
                  muted={isMuted}
                  playsInline
                  onClick={() => handleTogglePlay(idx)}
                />

                {/* Overlays */}
                <div className="reel-top-overlay">
                  <span className="reel-scripture-chip">{reel.scripture}</span>
                  <button
                    type="button"
                    className="reel-audio-mute-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted((v) => !v);
                    }}
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>

                <div className="reel-bottom-info">
                  <div className="reel-creator-line">
                    <Avatar
                      src={reel.creator.avatar_url}
                      name={reel.creator.display_name}
                      size="sm"
                    />
                    <MemberName
                      name={reel.creator.display_name}
                      badge={reel.creator.badge}
                      verified={reel.creator.badge_verified}
                    />
                  </div>
                  <p className="reel-caption-text">{reel.title}</p>
                  <div className="reel-audio-track-tag">
                    <Music size={13} className="spin-slow" />
                    <span>{reel.audio_title}</span>
                  </div>
                </div>

                {/* Vertical Side Action Controls */}
                <div className="reel-side-actions">
                  <button
                    type="button"
                    className={`reel-action-btn${isLiked ? ' is-liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLike(reel.id);
                    }}
                    aria-label={`Like reel (${reelLikes})`}
                  >
                    <Heart size={22} fill={isLiked ? '#ec4899' : 'none'} color={isLiked ? '#ec4899' : '#ffffff'} />
                    <span className="reel-action-count">{reelLikes}</span>
                  </button>

                  <button
                    type="button"
                    className="reel-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound('reaction');
                      setActiveCommentsReel(reel);
                    }}
                    aria-label={`Comments (${reel.comments_count})`}
                  >
                    <MessageCircle size={22} color="#ffffff" />
                    <span className="reel-action-count">{reel.comments_count}</span>
                  </button>

                  <button
                    type="button"
                    className="reel-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound('pop');
                      setActiveShareReel(reel);
                    }}
                    aria-label="Share reel"
                  >
                    <Share2 size={22} color="#ffffff" />
                    <span className="reel-action-label">Share</span>
                  </button>
                </div>
              </div>
            </AccentCard>
          );
        }}
      />

      {/* Reel Creator Modal */}
      {showCreatorModal && (
        <ReelCreatorModal
          currentUser={currentUser}
          session={session}
          onClose={() => setShowCreatorModal(false)}
          onPublished={(newReel) => {
            setReels((prev) => [newReel, ...prev]);
            setShowCreatorModal(false);
          }}
        />
      )}

      {/* Reel Comment Thread Sheet */}
      {activeCommentsReel && (
        <div className="reel-comments-overlay" onClick={() => setActiveCommentsReel(null)}>
          <div className="reel-comments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reel-comments-header">
              <span className="comments-heading">Comments on Reel</span>
              <button
                type="button"
                className="popup-sheet-close-btn"
                onClick={() => setActiveCommentsReel(null)}
                aria-label="Close comments"
              >
                ✕
              </button>
            </div>
            <div className="reel-comments-body">
              <CommentThread
                postId={activeCommentsReel.id}
                currentUser={currentUser}
                session={session}
                openAuth={openAuth}
              />
            </div>
          </div>
        </div>
      )}

      {/* Watermark Share Modal */}
      {activeShareReel && (
        <WatermarkShareModal
          post={{
            id: activeShareReel.id,
            text_content: activeShareReel.title,
            author: activeShareReel.creator,
          }}
          onClose={() => setActiveShareReel(null)}
        />
      )}
    </div>
  );
}
