'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import ChurchBilling from '../../components/ChurchBilling';
import { CHURCH_FIELDS } from '../../lib/churchConfig';

export default function BillingSettingsPage() {
  const [session, setSession] = useState(undefined);
  const [churches, setChurches] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('shammah-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadChurches(data.session.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadChurches(s.user.id);
      else setChurches([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadChurches(userId) {
    const { data } = await supabase
      .from('churches')
      .select(CHURCH_FIELDS)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    setChurches(data || []);
  }

  return (
    <div className="st-page">
      <header className="st-topbar">
        <Link href="/settings" className="st-back" aria-label="Back to settings">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="st-title">Billing</h1>
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
            <p className="st-sub">Sign in to manage church subscriptions.</p>
            <Link href="/" className="st-btn st-btn-primary">
              Go to Shammah
            </Link>
          </div>
        </div>
      )}

      {session && (
        <div className="st-wrap">
          {churches === null && <p className="mut-light">Loading your churches…</p>}
          {churches && churches.length === 0 && (
            <div className="st-card st-center">
              <h2 className="st-h">No churches yet</h2>
              <p className="st-sub">Create a church first, then come back to subscribe.</p>
              <Link href="/churches/new" className="st-btn st-btn-primary">
                Create a church
              </Link>
            </div>
          )}
          {churches &&
            churches.map((c) => (
              <div key={c.id} style={{ marginBottom: '1rem' }}>
                <ChurchBilling church={c} session={session} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
