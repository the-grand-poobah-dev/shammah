'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  MessageCircle,
  MapPin,
  Church,
  Lock,
  Ban,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import Avatar from '../../components/Avatar';
import MemberName from '../../components/MemberName';
import PostCard from '../../components/PostCard';
import { getSampleFeedPosts, getUserCreatedPosts } from '../../lib/pinnedPosts';
import { canUserViewPost, getPostVisibility } from '../../lib/postInteractions';
import {
  getFollows,
  isFollowing,
  toggleFollow,
  isBlocked,
  toggleBlock,
  getProfileSettings,
} from '../../lib/profileManager';
import { getJoinedInstitutionIds, getFollowedInstitutionIds } from '../../lib/institutionManager';

export default function MemberProfilePage({ params }) {
  const router = useRouter();
  const resolvedParams = typeof params?.then === 'function' ? use(params) : params;
  const memberId = resolvedParams?.id;

  const [session, setSession] = useState(null);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [member, setMember] = useState(null);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      setSession(s);
      if (s?.user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .maybeSingle();
        if (prof) setViewerProfile(prof);
      }
    });
  }, []);

  useEffect(() => {
    if (!memberId) return;
    setFollowing(isFollowing(memberId));
    setBlocked(isBlocked(memberId));

    async function loadMemberData() {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', memberId)
        .maybeSingle();

      const allPosts = [...getUserCreatedPosts(), ...getSampleFeedPosts()];
      const authorPosts = allPosts
        .filter((p) => String(p.author_id || p.profiles?.id) === String(memberId))
        .map((p) => ({
          ...p,
          visibility: getPostVisibility(p.id, p.visibility || 'public'),
        }));

      if (prof) {
        setMember(prof);
      } else if (authorPosts.length > 0 && authorPosts[0].profiles) {
        setMember({
          id: memberId,
          display_name: authorPosts[0].profiles.display_name || 'Community Member',
          avatar_url: authorPosts[0].profiles.avatar_url || null,
          badge: authorPosts[0].profiles.badge || 'member',
          badge_verified: authorPosts[0].profiles.badge_verified || false,
          role: authorPosts[0].profiles.role || 'member',
          church_name: authorPosts[0].church_name || 'Shammah Community',
          about: 'Walking by faith, sharing scripture, prayer, and encouragement.',
        });
      } else {
        setMember({
          id: memberId,
          display_name: 'Community Member',
          badge: 'member',
          badge_verified: true,
          role: 'member',
          church_name: 'Shammah Community',
          about: 'Member of the Shammah community.',
        });
      }

      setPosts(authorPosts);
    }

    loadMemberData();
  }, [memberId]);

  const isMe = Boolean(session?.user?.id && String(session.user.id) === String(memberId));
  const localPrivacy = getProfileSettings(memberId);
  const profileLocked = Boolean((member?.is_locked ?? localPrivacy?.isLocked) && !isMe && !following);

  // Enforce real post privacy options ('public', 'followers', 'church', 'private')
  const visiblePosts = posts.filter((p) =>
    canUserViewPost(
      p,
      session?.user,
      viewerProfile,
      getFollows(),
      Array.from(new Set([...getJoinedInstitutionIds(), ...getFollowedInstitutionIds()]))
    )
  );

  const displayName = member?.display_name || 'Member';

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
        </header>
      </div>

      <div className="cx-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={displayName} src={member?.avatar_url} className="avatar-lg" />
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  <MemberName name={displayName} badge={member?.badge} verified={member?.badge_verified} />
                </h2>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12.5, color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
                  {member?.location_label && (
                    <span>
                      <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {member.location_label}
                    </span>
                  )}
                  {member?.church_name && (
                    <span>
                      <Church size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {member.church_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isMe && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`inst-action-pill${following ? ' followed' : ''}`}
                  onClick={async () => {
                    const next = await toggleFollow(memberId, session?.user?.id);
                    setFollowing(next);
                  }}
                >
                  {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  <span>{following ? 'Following' : 'Follow'}</span>
                </button>

                <button
                  type="button"
                  className="inst-action-pill"
                  onClick={() => router.push('/?tab=messages')}
                >
                  <MessageCircle size={14} />
                  <span>Message</span>
                </button>

                <button
                  type="button"
                  className="inst-action-icon-btn"
                  onClick={async () => {
                    const next = await toggleBlock(memberId, session?.user?.id);
                    setBlocked(next);
                  }}
                  title={blocked ? 'Unblock user' : 'Block user'}
                >
                  <Ban size={15} />
                </button>
              </div>
            )}
          </div>

          {member?.about && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{member.about}</p>
          )}
        </div>

        {profileLocked ? (
          <div className="post-card" style={{ textAlign: 'center', padding: 28 }}>
            <Lock size={28} style={{ margin: '0 auto 8px', color: 'var(--teal)' }} />
            <h3 style={{ margin: '0 0 6px' }}>This Profile is Locked</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
              Follow {displayName} to view their followers-only posts and activity.
            </p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="post-card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-muted)' }}>
              No visible posts to display based on privacy settings.
            </p>
          </div>
        ) : (
          visiblePosts.map((p) => <PostCard key={p.id} post={p} session={session} />)
        )}
      </div>
    </main>
  );
}
