'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import Avatar from '../../components/Avatar';
import MemberName from '../../components/MemberName';
import PageHeader from '../../components/PageHeader';
import PostList from '../../components/PostList';
import { CHURCH_FIELDS } from '../../lib/churchConfig';
import { initials } from '../../lib/postDisplay';
import { useSession } from '../../lib/useSession';

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'about', label: 'About' },
  { id: 'members', label: 'Members' },
];

export default function ChurchPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session, profile, reloadProfile, loading } = useSession();

  const [church, setChurch] = useState(undefined); // undefined = loading, null = not found
  const [memberCount, setMemberCount] = useState(null);
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState('posts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [imgFail, setImgFail] = useState(false);

  useEffect(() => {
    setImgFail(new URLSearchParams(window.location.search).get('imgfail') === '1');
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const [{ data }, { data: counts }] = await Promise.all([
        supabase.from('churches').select(CHURCH_FIELDS).eq('id', id).maybeSingle(),
        supabase.rpc('church_member_counts'),
      ]);
      if (cancelled) return;
      setChurch(data || null);
      const mine = (counts || []).find((r) => r.church_id === id);
      setMemberCount(mine ? Number(mine.total) : 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session?.user?.id]);

  // Load the member list the first time that tab is opened
  useEffect(() => {
    if (tab !== 'members' || members || !session) return;
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, badge, badge_verified')
      .eq('church_id', id)
      .order('display_name')
      .limit(50)
      .then(({ data }) => setMembers(data || []));
  }, [tab, id, session?.user?.id]);

  const isMember = !!profile && profile.church_id === id;
  const isOwner = !!church && !!session && (church.created_by === session.user.id || profile?.role === 'platform_admin');

  async function setMyChurch(nextChurchId) {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('profiles').update({ church_id: nextChurchId }).eq('id', session.user.id);
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    await reloadProfile(session.user.id);
    setMemberCount((n) => Math.max(0, (n ?? 0) + (nextChurchId ? 1 : -1)));
    setMembers(null); // refresh the list next time it's opened
    setBusy(false);
  }

  function handleJoin() {
    if (profile?.church_id && profile.church_id !== id) {
      if (!window.confirm('You already belong to another church. Switch to this one? Your old posts stay where they are.')) return;
    }
    setMyChurch(id);
  }

  function handleLeave() {
    if (window.confirm(`Leave ${church.name}? You can rejoin any time.`)) setMyChurch(null);
  }

  // ---------- Loading / signed-out / not found ----------
  if (loading || (session && church === undefined)) {
    return (
      <div className="shell">
        <PageHeader title="Church" backHref="/churches" />
        <p className="mut cx-loading">Loading…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="shell">
        <PageHeader title="Church" backHref="/churches" />
        <div className="empty-state">
          <h2>Sign in to view this church</h2>
          <Link href="/" className="signin-btn">Go to sign in</Link>
        </div>
      </div>
    );
  }
  if (church === null) {
    return (
      <div className="shell">
        <PageHeader title="Church" backHref="/churches" />
        <div className="empty-state">
          <h2>We couldn’t find that church</h2>
          <p>It may have been removed.</p>
          <Link href="/churches" className="signin-btn">Browse churches</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <PageHeader title={church.name} backHref="/churches" />

      <section className="cx-hero">
        <div className="cx-hero-cover" style={church.cover_url ? { backgroundImage: `url(${church.cover_url})` } : undefined} />
        <div className="cx-hero-row">
          <span className="avatar cx-hero-logo">
            {church.logo_url ? <img src={church.logo_url} alt="" className="avatar-img" /> : initials(church.name)}
          </span>
          <div className="cx-hero-actions">
            {isOwner && (
              <Link href={`/churches/${id}/edit`} className="cx-btn cx-btn-ghost">Edit</Link>
            )}
            {isMember ? (
              <button type="button" className="cx-btn cx-btn-ghost" onClick={handleLeave} disabled={busy}>Joined ✓</button>
            ) : (
              <button type="button" className="cx-btn cx-btn-primary" onClick={handleJoin} disabled={busy || !profile}>
                {busy ? 'Joining…' : 'Join church'}
              </button>
            )}
          </div>
        </div>

        <div className="cx-hero-text">
          <h2 className="cx-hero-name">{church.name}</h2>
          <p className="cx-hero-meta">
            {[church.denomination, church.location_label && `📍 ${church.location_label}`].filter(Boolean).join(' · ')}
          </p>
          <p className="cx-hero-count">
            <b>{memberCount ?? '…'}</b> member{memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        {error && <p className="auth-message">{error}</p>}
        {imgFail && isOwner && (
          <p className="auth-message">Your church was saved, but a picture couldn’t upload. Tap Edit to try again.</p>
        )}
      </section>

      <nav className="cx-tabs" aria-label="Church sections">
        {TABS.map((t) => (
          <button key={t.id} className={`cx-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="feed">
        {tab === 'posts' && (
          <PostList
            session={session}
            filter={{ column: 'church_id', value: id }}
            onRequireSignIn={() => router.push('/')}
            emptyTitle="No posts from this church yet"
            emptyText="When members of this church post on Shammah, their posts appear here automatically."
          />
        )}

        {tab === 'about' && (
          <div className="cx-about">
            {church.description ? <p className="cx-about-text">{church.description}</p> : <p className="mut">This church hasn’t added a description yet.</p>}
            <dl className="cx-facts">
              {church.denomination && (<><dt>Denomination</dt><dd>{church.denomination}</dd></>)}
              {church.location_label && (<><dt>Location</dt><dd>{church.location_label}</dd></>)}
              {church.website && (
                <>
                  <dt>Website</dt>
                  <dd><a href={church.website} target="_blank" rel="noopener noreferrer">{church.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd>
                </>
              )}
              <dt>On Shammah since</dt>
              <dd>{new Date(church.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</dd>
            </dl>
          </div>
        )}

        {tab === 'members' && (
          <>
            {members === null && <p className="mut cx-loading">Loading members…</p>}
            {members && members.length === 0 && (
              <div className="empty-state"><h2>No members yet</h2><p>Join to be the first.</p></div>
            )}
            {members && members.map((m) => (
              <div key={m.id} className="cx-member-row">
                <Avatar name={m.display_name} src={m.avatar_url} />
                <MemberName name={m.display_name} badge={m.badge} verified={m.badge_verified} nameClassName="post-author" />
                {church.created_by === m.id && <span className="category-chip">Owner</span>}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
