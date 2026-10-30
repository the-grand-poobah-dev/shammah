/**
 * Shammah Reels API Data Layer
 * Handles TikTok/Snapchat-style shortform vertical videos
 * backed by Supabase with Row Level Security.
 */

import { supabase } from '../../../lib/supabaseClient';

/**
 * Lists reels with ranking and author profile joins.
 * 
 * @param {Object} params
 * @param {'foryou'|'following'} [params.feed='foryou']
 * @param {number} [params.limit=15]
 * @param {number} [params.offset=0]
 * @returns {Promise<{ data: Array, count: number, error: any }>}
 */
export async function listReels({ feed = 'foryou', limit = 15, offset = 0 } = {}) {
  try {
    const rpcName = feed === 'following' ? 'following_reels' : 'for_you_reels';
    const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, {
      p_limit: limit,
      p_offset: offset,
    });

    let rawReels = rpcData;

    // Fallback if RPC is missing or fails
    if (rpcError || !rawReels) {
      let q = supabase
        .from('posts')
        .select(`
          id,
          author_id,
          church_id,
          category_id,
          text_content,
          media_url,
          media_type,
          media_duration_seconds,
          media_thumbnail_url,
          sound_title,
          view_count,
          like_count,
          comment_count,
          duration_seconds,
          visibility,
          created_at,
          profiles:author_id (
            id,
            display_name,
            avatar_url,
            badge,
            badge_verified,
            role
          )
        `)
        .eq('media_type', 'reel')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: fallbackData, error: fallbackError } = await q;
      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        if (typeof window !== 'undefined') {
          try {
            const res = await fetch(`/api/media?action=reels&limit=${limit}&offset=${offset}`);
            if (res.ok) {
              const fb = await res.json();
              if (fb && Array.isArray(fb.data) && (fb.data.length > 0 || fallbackError)) {
                return { data: fb.data, count: fb.count ?? fb.data.length, error: null };
              }
            }
          } catch {}
        }
        if (fallbackError) {
          return { data: [], count: 0, error: fallbackError };
        }
      }
      return { data: fallbackData || [], count: (fallbackData || []).length, error: null };
    }

    // Fetch author profiles for RPC results
    const authorIds = [...new Set(rawReels.map((r) => r.author_id).filter(Boolean))];
    let profileMap = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, badge, badge_verified, role')
        .in('id', authorIds);

      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });
    }

    // Merge profiles and format duration
    const formatted = rawReels.map((reel) => {
      const durationSec = reel.duration_seconds || reel.media_duration_seconds || 45;
      const mins = Math.floor(durationSec / 60);
      const secs = (durationSec % 60).toString().padStart(2, '0');
      return {
        ...reel,
        duration_label: `${mins}:${secs}`,
        profiles: profileMap[reel.author_id] || {
          display_name: 'Believer',
          avatar_url: null,
          badge: null,
          badge_verified: false,
          role: 'member',
        },
      };
    });

    return { data: formatted, count: formatted.length, error: null };
  } catch (err) {
    console.error('[reelsApi] listReels error:', err);
    return { data: [], count: 0, error: err };
  }
}

/**
 * Toggles like on a reel post.
 */
export async function toggleReelLike(reelId) {
  if (!reelId) return { liked: false, likeCount: 0, error: new Error('Reel ID required') };

  try {
    const { data, error } = await supabase.rpc('toggle_reel_like', {
      p_reel_id: reelId,
    });

    if (error) {
      // Fallback: direct table interaction
      const sessionRes = await supabase.auth.getSession().catch(() => null);
      const uid = sessionRes?.data?.session?.user?.id;
      if (!uid) return { liked: false, likeCount: 0, error: new Error('Sign-in required') };

      const { data: existing } = await supabase
        .from('reactions')
        .select('id')
        .eq('target_id', reelId)
        .eq('user_id', uid)
        .maybeSingle();

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id);
        return { liked: false, likeCount: 0, error: null };
      } else {
        await supabase.from('reactions').insert({
          target_id: reelId,
          target_type: 'post',
          user_id: uid,
          emoji: '❤️',
        });
        return { liked: true, likeCount: 1, error: null };
      }
    }

    return {
      liked: Boolean(data?.liked),
      likeCount: data?.like_count || 0,
      error: null,
    };
  } catch (err) {
    return { liked: false, likeCount: 0, error: err };
  }
}

/**
 * Records a reel view.
 */
export async function recordReelView(reelId) {
  if (!reelId) return { viewCount: 0, error: null };

  try {
    const { data, error } = await supabase.rpc('record_reel_view', {
      p_reel_id: reelId,
    });

    return {
      viewCount: data || 0,
      error,
    };
  } catch (err) {
    return { viewCount: 0, error: err };
  }
}

/**
 * Checks if current user is following an author.
 */
export async function checkIsFollowing(authorId) {
  if (!authorId) return false;
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const uid = sessionRes?.data?.session?.user?.id;
    if (!uid) return false;

    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', uid)
      .eq('followed_id', authorId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Toggles follow/unfollow for an author.
 */
export async function toggleFollowAuthor(authorId) {
  if (!authorId) return { following: false, error: new Error('Author ID required') };

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const uid = sessionRes?.data?.session?.user?.id;
    if (!uid) return { following: false, error: new Error('Sign-in required to follow') };

    const { data: existing } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', uid)
      .eq('followed_id', authorId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', uid)
        .eq('followed_id', authorId);
      return { following: false, error };
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: uid,
          followed_id: authorId,
        });
      return { following: true, error };
    }
  } catch (err) {
    return { following: false, error: err };
  }
}
