'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { useSession } from '../../lib/useSession';
import FaithArcadeGamesView from '../components/FaithArcadeGamesView';

export default function ArcadePage() {
  const { session, profile } = useSession();

  return (
    <main className="shell">
      <div className="subpage-nav-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to home"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-5 h-5 text-amber-400" />
                <h1 className="brand-mark" style={{ fontSize: '18px' }}>Faith Champions Arcade</h1>
              </div>
              <span className="brand-subtext">Christian Games, Bible Quizzes &amp; High Scores</span>
            </div>
          </div>
        </header>
      </div>

      <div style={{ marginTop: '12px' }}>
        <FaithArcadeGamesView session={session} profile={profile} />
      </div>
    </main>
  );
}
