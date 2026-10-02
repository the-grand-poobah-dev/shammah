'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import UserProfileView from '../../components/UserProfileView';
import { getSampleFeedPosts } from '../../lib/pinnedPosts';

const KNOWN_COMMUNITY_MEMBERS = {
  'user-pastor-david': {
    id: 'user-pastor-david',
    name: 'Pastor David Mwangi',
    display_name: 'Pastor David Mwangi',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    cover_url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1200',
    badge: 'pastor',
    badge_verified: true,
    role: 'church_admin',
    church_name: 'Grace Cathedral Nairobi',
    about: 'Senior Pastor at Grace Cathedral. Walking in the power of the Holy Spirit, intercession, and discipleship. “The Lord is Here!”',
    followers_count: 248,
    following_count: 89,
  },
  'user-sister-mary': {
    id: 'user-sister-mary',
    name: 'Sister Mary Grace',
    display_name: 'Sister Mary Grace',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    cover_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200',
    badge: 'worship',
    badge_verified: true,
    role: 'member',
    church_name: 'Grace Cathedral Nairobi',
    about: 'Worship leader and songwriter. Passionate about bringing the presence of God into every gathering through authentic praise.',
    followers_count: 176,
    following_count: 112,
  },
  'user-elder-james': {
    id: 'user-elder-james',
    name: 'Elder James Ochieng',
    display_name: 'Elder James Ochieng',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    badge: 'elder',
    badge_verified: true,
    role: 'church_admin',
    church_name: 'Grace Cathedral Nairobi',
    about: 'Church elder, youth mentor, and Bible teacher. Dedicated to equipping the next generation with eternal truth.',
    followers_count: 132,
    following_count: 64,
  },
};

export default function MemberProfileDynamicPage() {
  const params = useParams();
  const userId = params?.id;
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('shammah-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');

    async function loadData() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      // Check known community profiles first
      if (userId && KNOWN_COMMUNITY_MEMBERS[userId]) {
        const mem = KNOWN_COMMUNITY_MEMBERS[userId];
        setProfile(mem);

        // Fetch their posts or filtered sample posts
        const sample = getSampleFeedPosts().map((p, idx) => ({
          ...p,
          id: `author-post-${userId}-${idx}`,
          author_id: userId,
          profiles: mem,
          is_pinned: idx === 0, // pin their first post
        }));
        setPosts(sample);
        setLoading(false);
        return;
      }

      // Try database fetch
      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (prof) {
          setProfile(prof);
          const { data: userPosts } = await supabase
            .from('posts')
            .select('*, profiles(name, display_name, avatar_url, badge, badge_verified, role)')
            .eq('author_id', userId);
          setPosts(userPosts || []);
          setLoading(false);
          return;
        }
      }

      // Fallback profile if id not found
      const fallback = {
        id: userId || 'fellowship-member',
        name: 'Fellowship Disciple',
        display_name: 'Fellowship Disciple',
        avatar_url: null,
        badge: 'believer',
        badge_verified: true,
        role: 'member',
        church_name: 'Shammah Church Community',
        about: 'Walking in faith, active in prayer, and serving one another in love.',
        followers_count: 45,
        following_count: 38,
      };
      setProfile(fallback);
      setPosts(getSampleFeedPosts());
      setLoading(false);
    }

    loadData();
  }, [userId]);

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
        <span className="profile-top-title">{profile?.name || 'Member Profile'}</span>
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
