'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import PostCard from '../../components/PostCard';
import { getSampleFeedPosts, getUserCreatedPosts } from '../../lib/pinnedPosts';
import { canUserViewPost, getPostVisibility } from '../../lib/postInteractions';
import { getFollows } from '../../lib/profileManager';
import { getJoinedInstitutionIds, getFollowedInstitutionIds } from '../../lib/institutionManager';

export default function SinglePostPage({ params }) {
  const resolvedParams = typeof params?.then === 'function' ? use(params) : params;
  const postId = resolvedParams?.id;

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

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
        if (prof) setProfile(prof);
      }
    });
  }, []);

  useEffect(() => {
    if (!postId) return;
    async function fetchPost() {
      setLoading(true);
      const localList = [...getUserCreatedPosts(), ...getSampleFeedPosts()];
      const foundLocal = localList.find((p) => String(p.id) === String(postId));
      if (foundLocal) {
        setPost({
          ...foundLocal,
          visibility: getPostVisibility(foundLocal.id, foundLocal.visibility || 'public'),
        });
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(display_name, avatar_url, badge, badge_verified, role)')
          .eq('id', postId)
          .maybeSingle();
        if (data) {
          setPost({
            ...data,
            visibility: getPostVisibility(data.id, data.visibility || 'public'),
          });
        }
      } catch {}
      setLoading(false);
    }
    fetchPost();
  }, [postId]);

  const authorized = post
    ? canUserViewPost(
        post,
        session?.user,
        profile,
        getFollows(),
        Array.from(new Set([...getJoinedInstitutionIds(), ...getFollowedInstitutionIds()]))
      )
    : false;

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
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>Community Post</h1>
              <span className="brand-subtext">Discussion &amp; Thread</span>
            </div>
          </div>
        </header>
      </div>

      <div className="cx-page">
        {loading ? (
          <div className="post-card">Loading post…</div>
        ) : !post ? (
          <div className="post-card" style={{ textAlign: 'center', padding: 28 }}>
            <h3 style={{ margin: '0 0 6px' }}>Post Not Found</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-muted)' }}>
              This post may have been deleted or moved.
            </p>
            <Link href="/" className="inst-btn-primary" style={{ textDecoration: 'none' }}>
              Return to Home Feed
            </Link>
          </div>
        ) : !authorized ? (
          <div className="post-card" style={{ textAlign: 'center', padding: 28 }}>
            <Lock size={28} style={{ margin: '0 auto 8px', color: 'var(--teal)' }} />
            <h3 style={{ margin: '0 0 6px' }}>Restricted Post Privacy</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-muted)' }}>
              This post’s visibility is set to <strong>{post.visibility}</strong> and is not viewable with your current access permissions.
            </p>
            <Link href="/" className="inst-btn-primary" style={{ textDecoration: 'none' }}>
              Return to Home Feed
            </Link>
          </div>
        ) : (
          <PostCard post={post} session={session} />
        )}
      </div>
    </main>
  );
}
