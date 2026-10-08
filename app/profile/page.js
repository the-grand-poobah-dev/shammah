'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, MapPin, Church, Shield, Lock, PenSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Avatar from '../components/Avatar';
import MemberName from '../components/MemberName';
import PostCard from '../components/PostCard';
import { getSampleFeedPosts, getUserCreatedPosts } from '../lib/pinnedPosts';
import { canUserViewPost, getPostVisibility } from '../lib/postInteractions';
import { getFollows, fetchFollowStats } from '../lib/profileManager';
import { getJoinedInstitutionIds, getFollowedInstitutionIds } from '../lib/institutionManager';

export default function MyProfilePage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      setSession(s);
      if (s?.user?.id) {
        const uid = s.user.id;
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        if (prof) setProfile(prof);

        const followStats = await fetchFollowStats(uid);
        setStats(followStats);

        const { data: dbPosts } = await supabase
          .from('posts')
          .select('*, profiles(display_name, avatar_url, badge, badge_verified, role)')
          .eq('author_id', uid)
          .order('created_at', { ascending: false });

        const localPosts = getUserCreatedPosts().filter(
          (p) => !p.author_id || String(p.author_id) === String(uid)
        );
        const remoteIds = new Set((dbPosts || []).map((d) => d.id));
        const combined = [
          ...localPosts.filter((lp) => !remoteIds.has(lp.id)),
          ...(dbPosts || []),
        ].map((p) => ({
          ...p,
          visibility: getPostVisibility(p.id, p.visibility || 'public'),
        }));

        setPosts(combined.length > 0 ? combined : getSampleFeedPosts().slice(0, 2));
      } else {
        setPosts(getSampleFeedPosts().slice(0, 2));
      }
    });
  }, []);

  const displayName = profile?.display_name || session?.user?.email || 'My Profile';
  const visiblePosts = posts.filter((p) =>
    canUserViewPost(
      p,
      session?.user,
      profile,
      getFollows(),
      Array.from(new Set([...getJoinedInstitutionIds(), ...getFollowedInstitutionIds()]))
    )
  );

  return (
    <main className="shell">
      <div className="sticky-header">
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
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>{displayName}</h1>
              <span className="brand-subtext">Member Profile</span>
            </div>
          </div>

          <Link href="/settings" className="inst-action-pill" style={{ textDecoration: 'none' }}>
            <Settings size={14} />
            <span>Edit Settings</span>
          </Link>
        </header>
      </div>

      <div className="cx-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Avatar name={displayName} src={profile?.avatar_url} className="avatar-lg" />
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                <MemberName name={displayName} badge={profile?.badge} verified={profile?.badge_verified} />
              </h2>
              {session?.user?.email && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{session.user.email}</div>
              )}
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12.5, color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
                {profile?.location_label && (
                  <span>
                    <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {profile.location_label}
                  </span>
                )}
                {profile?.church_name && (
                  <span>
                    <Church size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {profile.church_name}
                  </span>
                )}
                {profile?.is_locked && (
                  <span style={{ color: 'var(--teal)' }}>
                    <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Locked Profile
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile?.about && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{profile.about}</p>
          )}

          <div style={{ display: 'flex', gap: 18, borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 13 }}>
            <span>
              <strong>{visiblePosts.length}</strong> Posts
            </span>
            <span>
              <strong>{stats.followersCount}</strong> Followers
            </span>
            <span>
              <strong>{stats.followingCount || getFollows().length}</strong> Following
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Your Activity &amp; Posts</h3>
          <Link href="/?compose=1" className="inst-action-pill" style={{ textDecoration: 'none' }}>
            <PenSquare size={14} />
            <span>New Post</span>
          </Link>
        </div>

        {visiblePosts.map((p) => (
          <PostCard key={p.id} post={p} session={session} />
        ))}
      </div>
    </main>
  );
}
