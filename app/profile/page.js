'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import UserProfileView from '../components/UserProfileView';
import { getSampleFeedPosts } from '../lib/pinnedPosts';

export default function CurrentUserProfilePage() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Theme consistency
    const saved = localStorage.getItem('shammah-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');

    async function init() {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        const activeProfile = prof || {
          id: currentSession.user.id,
          name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || 'Church Member',
          display_name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || 'Church Member',
          avatar_url: currentSession.user.user_metadata?.avatar_url || null,
          badge: 'believer',
          badge_verified: true,
          role: 'member',
          church_name: 'Grace Community Church',
          about: 'Devoted follower of Jesus Christ. Walking in grace, faith, and community fellowship.',
          followers_count: 34,
          following_count: 51,
        };
        setProfile(activeProfile);

        // Fetch posts created by this user
        const { data: userPosts } = await supabase
          .from('posts')
          .select('*, profiles(name, display_name, avatar_url, badge, badge_verified, role)')
          .eq('author_id', currentSession.user.id);

        if (userPosts && userPosts.length > 0) {
          setPosts(userPosts);
        } else {
          // Provide sample posts for this user
          const sample = getSampleFeedPosts().map((p, i) => ({
            ...p,
            id: `my-post-${i}`,
            author_id: currentSession.user.id,
            profiles: activeProfile,
          }));
          setPosts(sample);
        }
      } else {
        // Guest mode demonstration
        const guestProfile = {
          id: 'guest-profile',
          name: 'Pastor David Mwangi',
          display_name: 'Pastor David Mwangi',
          avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
          badge: 'pastor',
          badge_verified: true,
          role: 'church_admin',
          church_name: 'Shammah Assembly of Saints',
          about: 'Shepherd at Shammah Assembly. Preaching the uncompromised Word of God, prayer, and kingdom fellowship.',
          followers_count: 142,
          following_count: 68,
        };
        setProfile(guestProfile);
        setPosts(getSampleFeedPosts());
      }
      setLoading(false);
    }

    init();
  }, []);

  if (loading) {
    return (
      <div className="profile-loading-screen">
        <div className="st-skeleton st-skel-hero" />
        <div className="st-skeleton st-skel-card" style={{ marginTop: 16 }} />
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <header className="profile-top-nav-bar">
        <Link href="/" className="profile-back-arrow" aria-label="Back to feed">
          <ArrowLeft size={18} />
          <span>Home Feed</span>
        </Link>
        <span className="profile-top-title">{profile?.name || 'Profile'}</span>
        <div className="profile-top-spacer" />
      </header>

      <main className="profile-main-content">
        <UserProfileView
          targetProfile={profile}
          currentUser={session?.user}
          session={session}
          userPosts={posts}
        />
      </main>
    </div>
  );
}
