'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Share2,
  Bookmark,
  Check,
  Download,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Calendar,
  Eye,
  Radio,
} from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import CommentThread from './CommentThread';
import { supabase } from '../lib/supabaseClient';
import { saveForOffline, isItemSavedOffline, removeOfflineItem } from '../lib/offlineSyncManager';
import { playSound } from '../lib/soundEffects';

export default function VideoWatchView({
  videoId,
  session,
  currentUser,
  isOverlay = false,
  onClose,
}) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  useEffect(() => {
    let mounted = true;
    async function loadVideo() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('media_items')
          .select('*, author:profiles(*)')
          .eq('id', videoId)
          .maybeSingle();

        if (mounted && data) {
          setVideo(data);
          setLikesCount(data.likes_count || 12);
        } else if (mounted) {
          setVideo({
            id: videoId,
            title: 'Walking in the Supernatural Favor of God',
            description: 'A transformative teaching exploring biblical keys to walking in divine favor and divine acceleration.',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail_url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&auto=format&fit=crop&q=80',
            duration: 1840,
            views_count: 1420,
            speaker_name: 'Pastor David Omondi',
            church_name: 'Grace Cathedral Nairobi',
            created_at: new Date().toISOString(),
          });
        }
        setIsOffline(isItemSavedOffline(videoId));
      } catch {
        if (mounted) {
          setVideo({
            id: videoId,
            title: 'Walking in the Supernatural Favor of God',
            description: 'A transformative teaching exploring biblical keys to walking in divine favor and divine acceleration.',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration: 1840,
            views_count: 1420,
            speaker_name: 'Pastor David Omondi',
            church_name: 'Grace Cathedral Nairobi',
            created_at: new Date().toISOString(),
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadVideo();
    return () => {
      mounted = false;
    };
  }, [videoId]);

  const handleLike = () => {
    playSound('reaction');
    setHasLiked((prev) => !prev);
    setLikesCount((prev) => (hasLiked ? prev - 1 : prev + 1));
  };

  const handleOfflineToggle = () => {
    playSound('button');
    if (isOffline) {
      removeOfflineItem(videoId);
      setIsOffline(false);
    } else if (video) {
      saveForOffline({
        id: video.id,
        title: video.title,
        type: 'video',
        url: video.url,
        thumbnail: video.thumbnail_url,
      });
      setIsOffline(true);
    }
  };

  const handleShare = async () => {
    playSound('button');
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Watch on Shammah',
          text: `Watch "${video?.title}" on Shammah faith community`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] overflow-y-auto flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-sunken)] transition-colors min-h-[44px] min-w-[44px]"
            onClick={onClose}
            aria-label="Back to videos"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-semibold text-sm line-clamp-1 text-[var(--ink)]">
            {video?.title || 'Watch Video'}
          </span>
        </div>
        <button
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-sunken)] transition-colors min-h-[44px] min-w-[44px]"
          onClick={onClose}
          aria-label="Close watch viewer"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main Watch Container */}
      <div className="max-w-4xl w-full mx-auto p-3 sm:p-5 flex-1 flex flex-col gap-5">
        {/* Video Player */}
        <div className="aspect-16-9 w-full bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-[var(--border)]">
          {video?.url && (
            <video
              src={video.url}
              poster={video.thumbnail_url}
              controls
              playsInline
              autoPlay
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Video Info Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-sm">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug">
              {video?.title || 'Sanctuary Worship & Preaching'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-muted)] mt-2">
              <span>{video?.church_name || 'Sanctuary Broadcast'}</span>
              <span>•</span>
              <span>{video?.speaker_name || 'Ministry Leader'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye size={13} /> {video?.views_count || 120} views
              </span>
            </div>
          </div>

          {/* Action Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all min-h-[44px] ${
                hasLiked
                  ? 'bg-[var(--teal)] text-white border-[var(--teal)]'
                  : 'border-[var(--border)] text-[var(--ink)] hover:border-[var(--sec-color)]'
              }`}
            >
              <ThumbsUp size={16} />
              <span>{likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('button');
                setIsSaved((prev) => !prev);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all min-h-[44px] ${
                isSaved
                  ? 'bg-[var(--gold)] text-black border-[var(--gold)]'
                  : 'border-[var(--border)] text-[var(--ink)] hover:border-[var(--sec-color)]'
              }`}
            >
              <Bookmark size={16} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={handleOfflineToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all min-h-[44px] ${
                isOffline
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-[var(--border)] text-[var(--ink)] hover:border-[var(--sec-color)]'
              }`}
            >
              {isOffline ? <Check size={16} /> : <Download size={16} />}
              <span>{isOffline ? 'Downloaded' : 'Offline'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--ink)] hover:border-[var(--sec-color)] transition-all min-h-[44px]"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </div>

          {/* Video Description */}
          {video?.description && (
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed pt-2">
              {video.description}
            </p>
          )}
        </div>

        {/* Video Comments */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--border)] font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--teal)]" />
            <span>Community Discussion &amp; Prayer Requests</span>
          </div>
          <div className="p-2 sm:p-4">
            <CommentThread
              mediaId={videoId}
              session={session}
              currentUser={currentUser}
              onRequireSignIn={() => {
                window.dispatchEvent(new CustomEvent('shammah:require-auth'));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
