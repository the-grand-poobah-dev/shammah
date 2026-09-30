'use client';
import Link from 'next/link';
import ChurchForm from '../../components/ChurchForm';
import PageHeader from '../../components/PageHeader';
import { useSession } from '../../lib/useSession';

export default function NewChurchPage() {
  const { session, profile, reloadProfile, loading } = useSession();
  const ready = !loading && session && profile;

  return (
    <div className="shell">
      <PageHeader title="Start a church" backHref="/churches" />
      <main className="feed">
        {loading && <p className="mut cx-loading">Loading…</p>}

        {!loading && !session && (
          <div className="empty-state">
            <h2>Please sign in</h2>
            <p>Sign in to add your church to Shammah.</p>
            <Link href="/" className="signin-btn">Go to sign in</Link>
          </div>
        )}

        {ready && !profile.onboarding_completed_at && (
          <div className="empty-state">
            <h2>Finish your profile first</h2>
            <p>Complete the quick welcome steps on the home page, then come back to start a church.</p>
            <Link href="/" className="signin-btn">Continue setup</Link>
          </div>
        )}

        {ready && profile.onboarding_completed_at && (
          <>
            <p className="cx-intro">Create a home for your congregation. Members can join, see the church’s posts and learn about you.</p>
            <ChurchForm session={session} profile={profile} onProfileChanged={() => reloadProfile(session.user.id)} />
          </>
        )}
      </main>
    </div>
  );
}
