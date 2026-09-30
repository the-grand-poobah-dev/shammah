'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import { useSession } from '../lib/useSession';
import { initials } from '../lib/postDisplay';

export default function ChurchDirectory() {
  const { session, profile, loading } = useSession();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [churches, setChurches] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const [{ data, error }, { data: c }] = await Promise.all([
        supabase.from('churches').select('id, name, denomination, logo_url, location_label').order('name'),
        supabase.rpc('church_member_counts'),
      ]);
      if (cancelled) return;
      if (error) return setState('error');
      setChurches(data || []);
      const map = {};
      (c || []).forEach((r) => (map[r.church_id] = Number(r.total)));
      setCounts(map);
      setState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const term = search.trim().toLowerCase();
  const shown = churches.filter(
    (c) =>
      !term ||
      c.name.toLowerCase().includes(term) ||
      (c.location_label || '').toLowerCase().includes(term) ||
      (c.denomination || '').toLowerCase().includes(term)
  );

  return (
    <div className="shell">
      <PageHeader
        title="Churches"
        action={session ? <Link href="/churches/new" className="cx-head-btn">+ Start</Link> : null}
      />
      <main className="feed">
        {!loading && !session && (
          <div className="empty-state">
            <h2>Sign in to explore churches</h2>
            <p>Find your church family on Shammah.</p>
            <Link href="/" className="signin-btn">Go to sign in</Link>
          </div>
        )}

        {session && (
          <>
            <input
              className="cx-search"
              type="search"
              placeholder="Search by name, town or denomination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search churches"
            />
            {state === 'loading' && <p className="mut cx-loading">Loading churches…</p>}
            {state === 'error' && <p className="auth-message">Couldn’t load churches. Please try again shortly.</p>}
            {state === 'ready' && churches.length === 0 && (
              <div className="empty-state">
                <h2>No churches yet</h2>
                <p>Be the first to put your church on Shammah.</p>
                <Link href="/churches/new" className="signin-btn">Start a church</Link>
              </div>
            )}
            {state === 'ready' && churches.length > 0 && shown.length === 0 && (
              <p className="mut">No churches match “{search}”.</p>
            )}

            {shown.map((c) => (
              <Link key={c.id} href={`/churches/${c.id}`} className="cx-church-row">
                <span className="avatar cx-church-logo">
                  {c.logo_url ? <img src={c.logo_url} alt="" className="avatar-img" /> : initials(c.name)}
                </span>
                <span className="cx-church-info">
                  <span className="cx-church-name">{c.name}</span>
                  <span className="cx-church-meta">
                    {[c.denomination, c.location_label].filter(Boolean).join(' · ') || 'Church'}
                  </span>
                </span>
                <span className="cx-church-side">
                  {profile?.church_id === c.id && <span className="category-chip">Your church</span>}
                  <span className="cx-church-count">{counts[c.id] || 0} member{(counts[c.id] || 0) !== 1 ? 's' : ''}</span>
                </span>
              </Link>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
