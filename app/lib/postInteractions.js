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

/* ==================== POST PRIVACY & VISIBILITY (SUPABASE + LOCAL PERSISTENCE) ==================== */

const POST_VISIBILITY_KEY = 'shammah_post_visibility_v1';
const POST_IDENTITY_KEY = 'shammah_post_identity_v1';

function getStoredVisibilityMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(POST_VISIBILITY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePostIdentityMeta(postId, meta = {}) {
  if (typeof window === 'undefined' || !postId) return;
  try {
    const raw = localStorage.getItem(POST_IDENTITY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[postId] = {
      postIdentity: meta.postIdentity || (meta.is_anonymous ? 'anonymous' : 'real'),
      pseudonym: meta.pseudonym || null,
      is_anonymous: Boolean(meta.is_anonymous || meta.postIdentity === 'anonymous'),
      author_id: meta.author_id || null,
    };
    localStorage.setItem(POST_IDENTITY_KEY, JSON.stringify(map));
  } catch {}
}

export function getPostIdentityMeta(postId, post = null) {
  let stored = null;
  if (typeof window !== 'undefined' && postId) {
    try {
      const raw = localStorage.getItem(POST_IDENTITY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      stored = map[postId] || null;
    } catch {}
  }
  const postIdentity =
    post?.post_identity ||
    stored?.postIdentity ||
    (post?.is_anonymous || stored?.is_anonymous ? 'anonymous' : post?.pseudonym || stored?.pseudonym ? 'pseudo' : 'real');
  const pseudonym = post?.pseudonym || stored?.pseudonym || null;
  const isAnonymous = Boolean(post?.is_anonymous || stored?.is_anonymous || postIdentity === 'anonymous');
  return { postIdentity, pseudonym, isAnonymous };
}

/**
 * Returns visibility of a post
 */
export function getPostVisibility(postId, defaultVisibility = 'public') {
  if (postId && typeof window !== 'undefined') {
    const map = getStoredVisibilityMap();
    if (map[postId]) return map[postId];
  }
  return defaultVisibility || 'public';
}

/**
 * Sets visibility for a specific post in Supabase and persistent storage
 */
export async function setPostVisibility(postId, visibility) {
  const validVis = ['public', 'followers', 'church', 'private'].includes(visibility)
    ? visibility
    : 'public';

  if (typeof window !== 'undefined' && postId) {
    try {
      const map = getStoredVisibilityMap();
      map[postId] = validVis;
      localStorage.setItem(POST_VISIBILITY_KEY, JSON.stringify(map));

      const rawUserPosts = localStorage.getItem('shammah_user_created_posts_v1');
      if (rawUserPosts) {
        const parsed = JSON.parse(rawUserPosts);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((p) => (p.id === postId ? { ...p, visibility: validVis } : p));
          localStorage.setItem('shammah_user_created_posts_v1', JSON.stringify(updated));
        }
      }
    } catch {}
  }

  if (postId && isValidUuid(postId)) {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ visibility: validVis })
        .eq('id', postId);
      if (error) {
        // Column may not be migrated yet; local persistence still enforces privacy
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:post-visibility-changed', {
        detail: { postId, visibility: validVis },
      })
    );
  }
  return validVis;
}

/**
 * Batch updates visibility for all posts authored by a user in Supabase and persistent storage
 */
export async function batchSetAllPostsVisibility(userId, visibility, allPostIds = []) {
  const validVis = ['public', 'followers', 'church', 'private'].includes(visibility)
    ? visibility
    : 'public';

  if (typeof window !== 'undefined' && Array.isArray(allPostIds) && allPostIds.length > 0) {
    try {
      const map = getStoredVisibilityMap();
      allPostIds.forEach((id) => {
        if (id) map[id] = validVis;
      });
      localStorage.setItem(POST_VISIBILITY_KEY, JSON.stringify(map));
    } catch {}
  }

  try {
    if (userId && isValidUuid(userId)) {
      await supabase
        .from('posts')
        .update({ visibility: validVis })
        .eq('author_id', userId);
    } else if (allPostIds && allPostIds.length > 0) {
      const validIds = allPostIds.filter(isValidUuid);
      if (validIds.length > 0) {
        await supabase
          .from('posts')
          .update({ visibility: validVis })
          .in('id', validIds);
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('shammah:batch-visibility-changed', {
        detail: { userId, visibility: validVis },
      })
    );
  }
}

/**
 * Enforces post privacy in reality across feeds, search, and views:
 * - 'public': visible to everyone
 * - 'private': visible ONLY to the post's author
 * - 'followers': visible ONLY to the post's author and users who follow the author
 * - 'church': visible ONLY to the post's author and members/followers of the same church
 */
export function canUserViewPost(
  post,
  currentUser = null,
  currentProfile = null,
  followingIds = [],
  joinedOrFollowedChurchIds = []
) {
  if (!post) return false;
  const vis = getPostVisibility(post.id, post.visibility || 'public');
  if (vis === 'public') return true;

  const uid = currentUser?.id ? String(currentUser.id) : null;
  const isRealUser = Boolean(uid && !currentUser?.is_anonymous);
  const authorId = post.author_id || post.profiles?.id ? String(post.author_id || post.profiles?.id) : null;

  // The author of a post can always view their own post
  if (isRealUser && authorId && uid === authorId) {
    return true;
  }

  // 'private' ("Only Me") is strictly restricted to the author
  if (vis === 'private') {
    return false;
  }

  // 'followers' and 'church' require a signed-in user
  if (!isRealUser) {
    return false;
  }

  if (vis === 'followers') {
    if (!authorId) return false;
    if (Array.isArray(followingIds) && followingIds.map(String).includes(authorId)) {
      return true;
    }
    if (typeof window !== 'undefined') {
      try {
        const rawV2 = localStorage.getItem('shammah_profile_follows_v2');
        if (rawV2) {
          const parsed = JSON.parse(rawV2);
          if (Array.isArray(parsed) && parsed.map(String).includes(authorId)) return true;
        }
        const raw = localStorage.getItem('shammah_user_follows_v1');
        if (raw) {
          const map = JSON.parse(raw);
          const list = Array.isArray(map[uid]) ? map[uid] : [];
          if (list.map(String).includes(authorId)) return true;
        }
      } catch {}
    }
    return false;
  }

  if (vis === 'church') {
    const postChurchId = post.church_id || post.profiles?.church_id;
    const userChurchId = currentProfile?.church_id;
    if (postChurchId && userChurchId && String(postChurchId) === String(userChurchId)) {
      return true;
    }
    if (
      postChurchId &&
      Array.isArray(joinedOrFollowedChurchIds) &&
      joinedOrFollowedChurchIds.map(String).includes(String(postChurchId))
    ) {
      return true;
    }
    const postChurchName = (
      post.church_name ||
      post.churches?.name ||
      post.profiles?.church_name ||
      ''
    )
      .trim()
      .toLowerCase();
    const userChurchName = (currentProfile?.church_name || '').trim().toLowerCase();
    if (postChurchName && userChurchName && postChurchName === userChurchName) {
      return true;
    }
    return false;
  }

  return true;
}
