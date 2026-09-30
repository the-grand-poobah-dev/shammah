'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PostCard from './PostCard';
import { sortPostsWithPinned, isUserAdmin } from '../lib/pinnedPosts';

const POST_FIELDS =
  'id, text_content, media_url, media_type, created_at, category_id, church_id, is_pinned, pinned_at, profiles(display_name, avatar_url, badge, badge_verified, role)';

// Loads and shows a list of posts (pinned announcements first, then newest). Used by the category and church pages.
//   filter: { column: 'category_id' | 'church_id', value }
// Handles polls the same way the home feed does, so poll posts look right here too.
export default function PostList({ session, profile, filter, onRequireSignIn, emptyTitle, emptyText }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [posts, setPosts] = useState([]);
  const [optionsByPost, setOptionsByPost] = useState({});
  const [countsByPost, setCountsByPost] = useState({});
  const [myVoteByPost, setMyVoteByPost] = useState({});

  const isAdmin = isUserAdmin(profile, session);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState('loading');
      const { data, error } = await supabase
        .from('posts')
        .select(POST_FIELDS)
        .eq(filter.column, filter.value)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) return setState('error');
      setPosts(sortPostsWithPinned(data || []));
      setState('ready');
      loadPolls((data || []).map((p) => p.id));
    }

    async function loadPolls(ids) {
      if (!ids.length) return;
      const { data: options } = await supabase
        .from('poll_options')
        .select('id, post_id, label, image_url, position')
        .in('post_id', ids)
        .order('position');
      if (cancelled || !options || !options.length) return;
      const byPost = {};
      options.forEach((o) => (byPost[o.post_id] ||= []).push(o));
      setOptionsByPost(byPost);

      const pollIds = Object.keys(byPost);
      const { data: results } = await supabase.rpc('poll_results', { p_post_ids: pollIds });
      const counts = {};
      (results || []).forEach((r) => ((counts[r.post_id] ||= {})[r.option_id] = r.votes));
      if (!cancelled) setCountsByPost(counts);

      if (session) {
        const { data: mine } = await supabase
          .from('poll_votes')
          .select('post_id, option_id')
          .eq('voter_id', session.user.id)
          .in('post_id', pollIds);
        const votes = {};
        (mine || []).forEach((v) => (votes[v.post_id] = v.option_id));
        if (!cancelled) setMyVoteByPost(votes);
      }
    }

    if (session) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.column, filter.value, session?.user?.id]);

  async function handleVote(postId, optionId) {
    if (!session) return onRequireSignIn();
    const { error } = await supabase
      .from('poll_votes')
      .upsert({ post_id: postId, option_id: optionId, voter_id: session.user.id }, { onConflict: 'post_id,voter_id' });
    if (error) return;
    setMyVoteByPost((v) => ({ ...v, [postId]: optionId }));
    const { data: results } = await supabase.rpc('poll_results', { p_post_ids: [postId] });
    const counts = {};
    (results || []).forEach((r) => (counts[r.option_id] = r.votes));
    setCountsByPost((c) => ({ ...c, [postId]: counts }));
  }

  async function handleTogglePin(post) {
    if (!isAdmin) return;
    const newPinned = !post.is_pinned;
    const pinnedAt = newPinned ? new Date().toISOString() : null;

    setPosts((prev) =>
      sortPostsWithPinned(
        prev.map((p) => (p.id === post.id ? { ...p, is_pinned: newPinned, pinned_at: pinnedAt } : p))
      )
    );

    try {
      await supabase
        .from('posts')
        .update({ is_pinned: newPinned, pinned_at: pinnedAt })
        .eq('id', post.id);
    } catch (err) {
      console.warn('Error updating post pin state:', err);
    }
  }

  if (!session) {
    return (
      <div className="empty-state">
        <h2>Sign in to see posts</h2>
        <p>Posts are shared with the Shammah community, so you’ll need to sign in first.</p>
        <button className="signin-btn" onClick={onRequireSignIn}>Go to sign in</button>
      </div>
    );
  }
  if (state === 'loading') return <p className="mut cx-loading">Loading posts…</p>;
  if (state === 'error') return <p className="auth-message">Couldn’t load posts. Please try again shortly.</p>;
  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <h2>{emptyTitle || 'Nothing here yet'}</h2>
        <p>{emptyText || 'Be the first to share something.'}</p>
      </div>
    );
  }
  return posts.map((p) => (
    <PostCard
      key={p.id}
      post={p}
      session={session}
      openAuth={onRequireSignIn}
      pollOptions={optionsByPost[p.id]}
      pollCounts={countsByPost[p.id] || {}}
      myVote={myVoteByPost[p.id]}
      onVote={(optionId) => handleVote(p.id, optionId)}
      isAdmin={isAdmin}
      onTogglePin={handleTogglePin}
    />
  ));
}
