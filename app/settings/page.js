'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import ProfileSettings from '../components/ProfileSettings';

export default function SettingsPage() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  // Use the same light/dark choice as the main app
  useEffect(() => {
    const saved = localStorage.getItem('shammah-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="st-page">
      <header className="st-topbar">
        <Link href="/" className="st-back" aria-label="Back to Shammah">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="st-title">Profile settings</h1>
      </header>

      {session === undefined && (
        <div className="st-wrap">
          <div className="st-skeleton st-skel-hero" />
        </div>
      )}
      {session === null && (
        <div className="st-wrap">
          <div className="st-card st-center">
            <h2 className="st-h">Please sign in</h2>
            <p className="st-sub">Sign in to edit your profile.</p>
            <Link href="/" className="st-btn st-btn-primary">Go to Shammah</Link>
          </div>
        </div>
      )}
      {session && <ProfileSettings session={session} />}
    </div>
  );
}
