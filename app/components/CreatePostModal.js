'use client';
import { X, PenSquare, Sparkles } from 'lucide-react';
import CreatePostBox from './CreatePostBox';

export default function CreatePostModal({
  isOpen,
  onClose,
  session,
  profile,
  isAdmin,
  composeText,
  setComposeText,
  composeCategory,
  setComposeCategory,
  isPoll,
  setIsPoll,
  pollOptions,
  setPollOptions,
  mediaFile,
  setMediaFile,
  mediaPreview,
  setMediaPreview,
  mediaUploading,
  pollUploading,
  isPinnedAnnouncement,
  setIsPinnedAnnouncement,
  posting,
  postError,
  onSubmit,
  openAuth,
}) {
  if (!isOpen) return null;

  async function handleModalSubmit(e, visibility, identityMeta) {
    const success = await onSubmit(e, visibility, identityMeta);
    // If post is created without error, close modal
    if (!postError) {
      onClose();
    }
  }

  return (
    <div className="create-post-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="create-post-modal-card neon-glow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal-header">
          <div className="cp-header-title">
            <span className="cp-icon-wrap">
              <PenSquare size={18} className="cp-icon" />
            </span>
            <h3>Create Fellowship Post</h3>
          </div>
          <button
            type="button"
            className="create-post-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="create-post-modal-body">
          <CreatePostBox
            session={session}
            profile={profile}
            isAdmin={isAdmin}
            composeText={composeText}
            setComposeText={setComposeText}
            composeCategory={composeCategory}
            setComposeCategory={setComposeCategory}
            isPoll={isPoll}
            setIsPoll={setIsPoll}
            pollOptions={pollOptions}
            setPollOptions={setPollOptions}
            mediaFile={mediaFile}
            setMediaFile={setMediaFile}
            mediaPreview={mediaPreview}
            setMediaPreview={setMediaPreview}
            mediaUploading={mediaUploading}
            pollUploading={pollUploading}
            isPinnedAnnouncement={isPinnedAnnouncement}
            setIsPinnedAnnouncement={setIsPinnedAnnouncement}
            posting={posting}
            postError={postError}
            onSubmit={handleModalSubmit}
            openAuth={openAuth}
          />
        </div>
      </div>
    </div>
  );
}
