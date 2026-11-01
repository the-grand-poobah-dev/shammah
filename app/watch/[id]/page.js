'use client';
import { use } from 'react';
import VideoWatchView from '../../components/VideoWatchView';
import { useSession } from '../../../lib/useSession';

export default function WatchPage({ params }) {
  const unwrappedParams = typeof params?.then === 'function' ? use(params) : params;
  const videoId = unwrappedParams?.id;
  const { session, profile } = useSession();

  function openAuth(mode) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode || 'signin' }));
    }
  }

  function handleSelectVideo(item) {
    if (typeof window !== 'undefined') {
      window.location.href = `/watch/${item.id}`;
    }
  }

  return (
    <main className="watch-page-container">
      <VideoWatchView
        videoId={videoId}
        session={session}
        currentUser={profile}
        isOverlay={false}
        openAuth={openAuth}
        onSelectVideo={handleSelectVideo}
      />
    </main>
  );
}
