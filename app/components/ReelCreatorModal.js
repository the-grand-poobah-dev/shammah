'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Film,
  Video,
  UploadCloud,
  X,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  Globe,
  Users,
  Church,
  Lock,
  Play,
  Clock,
  Tag,
} from 'lucide-react';
import PopupSheet from './PopupSheet';
import Avatar from './Avatar';
import MemberName from './MemberName';
import { uploadPostMedia } from '../lib/mediaUpload';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from '../lib/soundEffects';
import { cleanDisplayName } from '../lib/postDisplay';

const REEL_CATEGORIES = [
  { id: 'testimonies', label: 'Testimonies', color: '#ec4899', emoji: '🙌' },
  { id: 'worship', label: 'Praise & Worship', color: '#8b5cf6', emoji: '🎵' },
  { id: 'youth', label: 'Youth & Gen-Z', color: '#06b6d4', emoji: '⚡' },
  { id: 'sermons', label: 'Sermon Highlights', color: '#f59e0b', emoji: '📖' },
  { id: 'devotion', label: 'Daily Devotion', color: '#10b981', emoji: '🌱' },
  { id: 'prayer', label: 'Prayer & Intercession', color: '#3b82f6', emoji: '🙏' },
];

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', desc: 'Anyone on Shammah', icon: Globe },
  { id: 'followers', label: 'Followers', desc: 'People who follow you', icon: Users },
  { id: 'church', label: 'Church', desc: 'Members of your church', icon: Church },
  { id: 'private', label: 'Only Me', desc: 'Saved privately in your drafts', icon: Lock },
];

export default function ReelCreatorModal({
  isOpen,
  onClose,
  session,
  profile,
  onCreated,
}) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('testimonies');
  const [visibility, setVisibility] = useState('public');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);
  const videoElemRef = useRef(null);

  const displayName = cleanDisplayName(
    profile?.display_name || session?.user?.email?.split('@')[0] || 'Disciple',
    'Disciple'
  );

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (videoPreview && videoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  function handleFileSelect(file) {
    if (!file) return;
    setError('');

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file (MP4, WebM, or QuickTime MOV).');
      return;
    }

    // 100 MB max matching mediaUpload.js
    if (file.size > 100 * 1024 * 1024) {
      setError('Video file is too large. Maximum size is 100 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreview(objectUrl);

    // Read video metadata to check duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(Math.round(tempVideo.duration || 0));
    };
    tempVideo.src = objectUrl;
  }

  function handleRemoveVideo() {
    if (videoPreview && videoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }

  async function handlePublishReel(e) {
    if (e) e.preventDefault();
    if (!videoFile) {
      setError('Please select a vertical video to post as a reel.');
      return;
    }

    if (!session?.user?.id) {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: 'signin' }));
      onClose();
      return;
    }

    setUploading(true);
    setError('');

    try {
      // 1. Upload video to Supabase Storage bucket 'post-media'
      const uploaded = await uploadPostMedia(videoFile, session.user.id);

      // 2. Insert into posts table as a 'reel'
      const { data: inserted, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: session.user.id,
          church_id: profile?.church_id ?? null,
          category_id: category,
          text_content: caption.trim() || null,
          media_url: uploaded.url,
          media_type: 'reel',
          visibility: visibility,
        })
        .select('id, created_at')
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save reel post.');
      }

      const newPostId = inserted?.id || 'post-' + Date.now();
      const newReelPost = {
        id: newPostId,
        author_id: session.user.id,
        church_id: profile?.church_id ?? null,
        category_id: category,
        text_content: caption.trim() || null,
        media_url: uploaded.url,
        media_type: 'reel',
        visibility: visibility,
        created_at: inserted?.created_at || new Date().toISOString(),
        profiles: {
          display_name: displayName,
          avatar_url: profile?.avatar_url || null,
          badge: profile?.badge || null,
          badge_verified: profile?.badge_verified || false,
          role: profile?.role || 'member',
        },
      };

      // 3. Dispatch events to update feed in real time
      window.dispatchEvent(new CustomEvent('shammah:post-created', { detail: { post: newReelPost } }));
      window.dispatchEvent(new CustomEvent('shammah:feed-algorithm-updated'));

      playSound('reaction');
      if (onCreated) onCreated(newReelPost);
      onClose();
    } catch (err) {
      console.error('Error posting reel:', err);
      setError(err.message || 'Failed to post reel. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const modalTitle = (
    <div className="flex items-center gap-2 text-[var(--ink)]">
      <span className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
        <Film size={18} />
      </span>
      <div>
        <h3 className="text-sm sm:text-base font-bold leading-tight">Post a Faith Reel</h3>
        <p className="text-[11px] text-[var(--ink-muted)]">Short vertical video testimonies &amp; worship moments</p>
      </div>
    </div>
  );

  const modalFooter = (
    <div className="flex items-center justify-between gap-3 w-full">
      <button
        type="button"
        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--border)] transition-colors"
        onClick={onClose}
        disabled={uploading}
      >
        Cancel
      </button>

      <button
        type="button"
        className="gws-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
        disabled={!videoFile || uploading}
        onClick={handlePublishReel}
      >
        {uploading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            <span>Publishing Reel...</span>
          </>
        ) : (
          <>
            <Send size={15} />
            <span>Publish Reel</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={modalFooter}
      size="md"
    >
      <div className="space-y-4 p-1">
        {/* Author row */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <Avatar name={displayName} src={profile?.avatar_url} className="w-9 h-9" />
          <div className="min-w-0 flex-1">
            <MemberName
              name={displayName}
              badge={profile?.badge}
              verified={profile?.badge_verified}
              role={profile?.role}
              nameClassName="text-xs font-bold text-[var(--ink)]"
            />
            <span className="text-[11px] text-[var(--ink-muted)] block truncate">
              Sharing to Faith Reels Shelf &amp; Videos Feed
            </span>
          </div>
        </div>

        {/* Video Upload Dropzone / Preview */}
        {!videoPreview ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-purple-500/50 hover:bg-[var(--surface-hover,var(--surface))]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-lg">
              <UploadCloud size={26} />
            </div>
            <strong className="text-sm font-semibold text-[var(--ink)] mb-1">
              Select or Drop Vertical Video
            </strong>
            <p className="text-xs text-[var(--ink-muted)] max-w-xs mb-3">
              MP4, WebM, or QuickTime MOV up to 100 MB. Portrait (9:16) format recommended.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <Video size={13} />
              <span>Browse Video File</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-black/40 flex flex-col items-center p-3">
            <video
              ref={videoElemRef}
              src={videoPreview}
              controls
              playsInline
              className="max-h-[280px] w-auto rounded-xl object-contain shadow-md"
            />
            <div className="flex items-center justify-between w-full mt-3 px-1">
              <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                <Clock size={13} className="text-purple-400" />
                <span>
                  Duration: {videoDuration !== null ? `${videoDuration}s` : 'Analyzing...'}
                  {videoDuration && videoDuration > 120 && ' (Recommended < 2 mins)'}
                </span>
              </div>
              <button
                type="button"
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors"
                onClick={handleRemoveVideo}
                disabled={uploading}
              >
                <X size={14} />
                <span>Remove &amp; Replace</span>
              </button>
            </div>
          </div>
        )}

        {/* Caption Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--ink)] flex items-center justify-between">
            <span>Caption &amp; Scripture Tag</span>
            <span className="text-[11px] text-[var(--ink-muted)] font-normal">
              {caption.length} / 500
            </span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Share what God did, a sermon scripture quote, or praise testimony..."
            className="w-full rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3 text-xs text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60 focus:outline-none focus:border-purple-500 transition-colors resize-none"
          />
        </div>

        {/* Category Picker */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Tag size={13} className="text-purple-400" />
            <span>Select Channel Category:</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {REEL_CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-sm'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => {
                    setCategory(cat.id);
                    playSound('reaction');
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibility Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Globe size={13} className="text-purple-400" />
            <span>Who can watch this reel:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = visibility === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/15 text-[var(--ink)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                  onClick={() => {
                    setVisibility(opt.id);
                    playSound('reaction');
                  }}
                >
                  <Icon size={14} className={isSelected ? 'text-purple-400' : ''} />
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[11px] leading-tight">{opt.label}</strong>
                    <span className="text-[10px] text-[var(--ink-muted)] block truncate">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </PopupSheet>
  );
}
