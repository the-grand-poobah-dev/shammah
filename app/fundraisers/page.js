'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSession } from '../../lib/useSession';
import FundraisersView from '../components/FundraisersView';

export default function FundraisersPage() {
  const { session, profile } = useSession();

  function openAuth(mode = 'signin') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:open-auth', { detail: mode }));
    }
  }

  return (
    <main className="shell">
      <div className="subpage-nav-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to feed"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>Kingdom Fundraisers</h1>
              <span className="brand-subtext">Missions, Relief &amp; Community Building</span>
            </div>
          </div>
        </header>
      </div>

      <div style={{ marginTop: '12px' }}>
        <FundraisersView
          session={session}
          currentUser={profile}
          openAuth={openAuth}
        />
      </div>
    </main>
  );
}
