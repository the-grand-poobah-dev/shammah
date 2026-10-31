'use client';
import { useRouter } from 'next/navigation';
import LiveViewerModal from '../../components/LiveViewerModal';
import { useSession } from '../../../lib/useSession';

export default function LiveStreamPage({ params }) {
  const router = useRouter();
  const { session, profile } = useSession();
  const streamId = params?.id;

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }

  return (
    <main className="fixed inset-0 z-50 bg-black">
      <LiveViewerModal
        streamId={streamId}
        isOpen={true}
        onClose={handleClose}
        session={session}
        profile={profile}
      />
    </main>
  );
}
