'use client';
import { PenSquare } from 'lucide-react';
import PopupSheet from './PopupSheet';
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
  async function handleModalSubmit(e, visibility, identityMeta) {
    await onSubmit(e, visibility, identityMeta);
    if (!postError) {
      onClose();
    }
  }

  const modalTitle = (
    <div className="cp-header-title">
      <span className="cp-icon-wrap">
        <PenSquare size={18} className="cp-icon" />
      </span>
      <span>Create Post</span>
    </div>
  );

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
    >
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
    </PopupSheet>
  );
}
