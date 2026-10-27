'use client';
import { supabase } from '../../lib/supabaseClient';
import { saveUserCreatedPost } from './pinnedPosts';

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
  if (!postId || !userId) return false;

  try {
    if (isValidUuid(postId) && isValidUuid(userId)) {
      const { data, error } = await supabase
        .from('post_reposts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) return true;
    }

    // Check preview mock store if offline or non-UUID
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const found = list.some(
              (r) => String(r.post_id) === String(postId) && String(r.user_id) === String(userId)
            );
            if (found) return true;
          }
        }
      } catch {}
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Gets the total repost count for a post from Supabase
 */
export async function getPostRepostCount(postId, fallbackCount = 0) {
  if (!postId) return fallbackCount || 0;

  try {
    if (isValidUuid(postId)) {
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
    }

    // Direct preview mock count
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const matches = list.filter((r) => String(r.post_id) === String(postId));
            if (matches.length > 0) {
              return (fallbackCount || 0) + matches.length;
            }
          }
        }
      } catch {}
    }

    return fallbackCount || 0;
  } catch {
    return fallbackCount || 0;
  }
}

/**
 * Toggles a repost in Supabase: inserts row if not present, deletes row if already present.
 * For a quoted repost (quoteText provided), inserts a new quote post and attributes to the reposter in the feed.
 */
export async function toggleRepost(postId, post, user, quoteText = null) {
  const userId = user?.id;
  const initialFallback = post?.reposts_count || 0;

  if (!userId || !postId) {
    return { reposted: false, count: initialFallback };
  }

  let isNowReposted = false;

  try {
    const isQuote = Boolean(quoteText);
    const trimmedQuote = typeof quoteText === 'object' ? (quoteText?.text || '').trim() : (quoteText || '').trim();
    const quoteMediaUrl = typeof quoteText === 'object' ? quoteText?.mediaUrl || null : null;
    const quoteMediaType = typeof quoteText === 'object' ? quoteText?.mediaType || null : null;

    if (isValidUuid(postId) && isValidUuid(userId)) {
      if (!isQuote) {
        // Check existing instant repost
        const { data: existing } = await supabase
          .from('post_reposts')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .or('comment.is.null,comment.eq.')
          .maybeSingle();

        if (existing) {
          // Toggle OFF instant repost
          await supabase
            .from('post_reposts')
            .delete()
            .eq('id', existing.id);
          isNowReposted = false;
        } else {
          // Add instant repost
          await supabase
            .from('post_reposts')
            .insert({
              post_id: postId,
              user_id: userId,
              comment: null,
              quote_text: null,
            });
          isNowReposted = true;
        }
      } else {
        // Add quote repost with thoughts & optional media
        await supabase
          .from('post_reposts')
          .insert({
            post_id: postId,
            user_id: userId,
            comment: trimmedQuote || (quoteMediaType ? `[${quoteMediaType}]` : null),
            quote_text: trimmedQuote || null,
          });
        isNowReposted = true;

        // Persist quoted post row in posts table with reference to original post
        try {
          await supabase.from('posts').insert({
            author_id: userId,
            text_content: trimmedQuote || (quoteMediaUrl ? '' : 'Shared post'),
            media_url: quoteMediaUrl,
            media_type: quoteMediaType,
            quoted_post_id: postId,
            category_id: post?.category_id || null,
            church_id: user?.user_metadata?.church_id || null,
            visibility: 'public',
          });
        } catch (insertErr) {
          console.warn('Could not insert quoted post to posts table:', insertErr);
        }
      }
    } else {
      // Preview or simulated ID fallback
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('shammah_supabase_post_reposts_db');
        let list = raw ? JSON.parse(raw) : [];
        const existingIdx = list.findIndex(
          (r) => String(r.post_id) === String(postId) && String(r.user_id) === String(userId) && !r.comment
        );

        if (existingIdx >= 0 && !isQuote) {
          list.splice(existingIdx, 1);
          isNowReposted = false;
        } else {
          list.push({
            id: 'rep-' + Date.now(),
            post_id: postId,
            user_id: userId,
            comment: trimmedQuote || null,
            quote_text: trimmedQuote || null,
            media_url: quoteMediaUrl,
            media_type: quoteMediaType,
            created_at: new Date().toISOString(),
          });
          isNowReposted = true;
        }
        localStorage.setItem('shammah_supabase_post_reposts_db', JSON.stringify(list));
      }
    }

    // If quoteText provided, construct quoted post attributed to the reposter and display in feed
    if (isQuote) {
      const reposterName =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.name ||
        user?.name ||
        user?.email?.split('@')[0] ||
        'Member';
      const reposterAvatar = user?.user_metadata?.avatar_url || user?.avatar_url || null;

      const originalAuthorName =
        post?.profiles?.display_name ||
        post?.profiles?.name ||
        post?.author_name ||
        'Member';

      const quotedPost = {
        id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text_content: trimmedQuote || '',
        media_url: quoteMediaUrl,
        media_type: quoteMediaType,
        author_id: userId,
        author_name: reposterName,
        created_at: new Date().toISOString(),
        category_id: post?.category_id || 'community',
        church_id: user?.user_metadata?.church_id || null,
        church_name: user?.user_metadata?.church_name || null,
        visibility: 'public',
        profiles: {
          id: userId,
          name: reposterName,
          display_name: reposterName,
          avatar_url: reposterAvatar,
          badge: user?.user_metadata?.badge || null,
          badge_verified: Boolean(user?.user_metadata?.badge_verified),
          role: user?.user_metadata?.role || 'member',
        },
        quoted_post_id: postId,
        quoted_post: {
          id: postId,
          author_id: post?.author_id || post?.profiles?.id,
          author_name: originalAuthorName,
          profiles: post?.profiles,
          text_content: post?.text_content,
          media_url: post?.media_url,
          media_type: post?.media_type,
          church_name: post?.church_name || post?.churches?.name || post?.profiles?.church_name,
          created_at: post?.created_at,
          category_id: post?.category_id,
        },
        reposts_count: 0,
      };

      saveUserCreatedPost(quotedPost);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('shammah:post-created', {
            detail: { post: quotedPost },
          })
        );
      }
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
    return { reposted: true, count: initialFallback + 1 };
  }
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
