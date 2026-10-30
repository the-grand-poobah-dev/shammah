'use client';
import ReelsFeed from '../components/ReelsFeed';
import { useSession } from '../../lib/useSession';

export default function ReelsPage() {
  const { session, profile } = useSession();

  function openAuth(mode) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode || 'signin' }));
    }
  }

  return (
    <main className="reels-standalone-page">
      <ReelsFeed
        currentUser={profile}
        session={session}
        isModal={false}
        openAuth={openAuth}
      />
    </main>
  );
}
