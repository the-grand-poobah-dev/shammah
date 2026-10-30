'use client';
import ReelsFeed from './ReelsFeed';

/**
 * Upgraded ReelViewerModal
 * Shares the exact same implementation with the standalone /reels route,
 * providing the full-featured TikTok/Snapchat experience inside a modal popup.
 */
export default function ReelViewerModal({
  reels = [],
  initialIndex = 0,
  currentUser,
  session,
  onClose,
  openAuth,
}) {
  return (
    <div className="reel-viewer-modal-backdrop" role="dialog" aria-modal="true">
      <ReelsFeed
        initialReels={reels}
        initialIndex={initialIndex}
        currentUser={currentUser}
        session={session}
        isModal={true}
        onClose={onClose}
        openAuth={openAuth}
      />
    </div>
  );
}
