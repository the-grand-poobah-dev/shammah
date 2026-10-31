'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame } from 'lucide-react';
import { useSession } from '../../lib/useSession';
import FaithChallengesView from '../components/FaithChallengesView';

export default function ChallengesPage() {
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
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h1 className="brand-mark" style={{ fontSize: '18px' }}>Faith Challenges</h1>
              </div>
              <span className="brand-subtext">Daily Habits, Streaks &amp; Community Praise</span>
            </div>
          </div>
        </header>
      </div>

      <div style={{ marginTop: '12px' }}>
        <FaithChallengesView session={session} profile={profile} />
      </div>
    </main>
  );
}
