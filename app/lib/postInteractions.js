'use client';
import { supabase } from '../../lib/supabaseClient';

export const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', icon: '🌍', desc: 'Anyone on Shammah can view' },
  { id: 'followers', label: 'Followers Only', icon: '👥', desc: 'Only your followers can view' },
  { id: 'church', label: 'My Church Only', icon: '⛪', desc: 'Members of your church can view' },
  { id: 'private', label: 'Only Me', icon: '🔒', desc: 'Only visible to you' },
];

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/* ==================== REPOSTS / RETWEET FUNCTIONALITY (SUPABASE) ==================== */

/**
 * Checks whether a given user has reposted a specific post in Supabase
 */
export async function isPostReposted(postId, userId) {
  if (!postId || !userId || !isValidUuid(postId) || !isValidUuid(userId)) {
    return false;
  }
  try {
    const { data, error } = await supabase
      .from('post_reposts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Gets the total repost count for a post from Supabase
 */
export async function getPostRepostCount(postId, fallbackCount = 0) {
  if (!postId || !isValidUuid(postId)) {
    return fallbackCount || 0;
  }
  try {
    const { data, error } = await supabase.rpc('repost_counts', {
      p_post_ids: [postId],
    });
    if (!error && Array.isArray(data) && data[0]) {
      return Number(data[0].count);
    }

    // Direct count fallback
    const { count, error: countErr } = await supabase
      .from('post_reposts')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (!countErr && count !== null && count !== undefined) {
      return count;
    }
    return fallbackCount || 0;
  } catch {
    return fallbackCount || 0;
  }
}

/**
 * Toggles a repost in Supabase: inserts row if not present, deletes row if already present
 */
export async function toggleRepost(postId, post, user, quoteText = null) {
  const userId = user?.id;
  const initialFallback = post?.reposts_count || 0;

  if (!userId || !postId) {
    return { reposted: false, count: initialFallback };
  }

  if (isValidUuid(postId) && isValidUuid(userId)) {
    try {
      // Check if user already reposted
      const { data: existing } = await supabase
        .from('post_reposts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      let isNowReposted = false;
      if (existing) {
        // Remove repost
        await supabase
          .from('post_reposts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        isNowReposted = false;
      } else {
        // Add repost
        await supabase
          .from('post_reposts')
          .insert({
            post_id: postId,
            user_id: userId,
            quote_text: quoteText || null,
          });
        isNowReposted = true;
      }

      const count = await getPostRepostCount(postId, initialFallback);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('shammah:reposts-updated', {
            detail: { postId, reposted: isNowReposted, count },
          })
        );
      }

      return { reposted: isNowReposted, count };
    } catch (err) {
      console.error('Failed to toggle repost in Supabase:', err);
    }
  }

  // Graceful fallback for non-UUID sample/offline posts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:reposts-updated'));
  }
  return { reposted: true, count: initialFallback + 1 };
}

/**
 * Returns total reposts received by a user's posts from Supabase
 */
export async function getUserRepostsCount(authorId) {
  if (!authorId || !isValidUuid(authorId)) return 0;
  try {
    const { data, error } = await supabase.rpc('user_reposts_received_count', {
      p_author_id: authorId,
    });
    if (!error && data !== null && data !== undefined) {
      return Number(data);
    }

    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', authorId);

    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map((p) => p.id);
      const { count } = await supabase
        .from('post_reposts')
        .select('id', { count: 'exact', head: true })
        .in('post_id', postIds);
      return count || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Kept for backwards compatibility
 */
export function getStoredReposts() {
  return [];
}

/* ==================== POST PRIVACY & VISIBILITY (SUPABASE) ==================== */

/**
 * Returns visibility of a post
 */
export function getPostVisibility(postId, defaultVisibility = 'public') {
  return defaultVisibility || 'public';
}

/**
 * Sets visibility for a specific post in Supabase
 */
export async function setPostVisibility(postId, visibility) {
  if (postId && isValidUuid(postId)) {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ visibility })
        .eq('id', postId);
      if (error) {
        console.error('Failed to update post visibility in Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to save post visibility', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:post-visibility-changed', {
        detail: { postId, visibility },
      })
    );
  }
}

/**
 * Batch updates visibility for all posts authored by a user in Supabase
 */
export async function batchSetAllPostsVisibility(userId, visibility, allPostIds = []) {
  try {
    if (userId && isValidUuid(userId)) {
      const { error } = await supabase
        .from('posts')
        .update({ visibility })
        .eq('author_id', userId);
      if (error) {
        console.error('Failed to batch update visibility by author_id:', error);
      }
    } else if (allPostIds && allPostIds.length > 0) {
      const validIds = allPostIds.filter(isValidUuid);
      if (validIds.length > 0) {
        await supabase
          .from('posts')
          .update({ visibility })
          .in('id', validIds);
      }
    }
  } catch (err) {
    console.error('Failed to batch update visibility in Supabase', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:batch-visibility-changed', {
        detail: { visibility },
      })
    );
  }
}
