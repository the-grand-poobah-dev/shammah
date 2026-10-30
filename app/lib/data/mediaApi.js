/**
 * Shammah Media API Data Layer
 * Handles videos, audio, series, playlists, watch progress, and engagement
 * using Supabase with Row Level Security. SSR-safe.
 */

import { supabase } from '../../../lib/supabaseClient';

/**
 * Lists media items with category filtering, search, sorting, and pagination.
 * 
 * @param {Object} params
 * @param {'video'|'audio'} [params.kind]
 * @param {string} [params.category]
 * @param {string} [params.query]
 * @param {'recent'|'views'|'likes'|'duration'} [params.sort='recent']
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {string} [params.authorId]
 * @param {string} [params.seriesId]
 * @param {string} [params.churchId]
 * @returns {Promise<{ data: Array, count: number, error: any }>}
 */
export async function listMedia({
  kind,
  category,
  query,
  sort = 'recent',
  limit = 20,
  offset = 0,
  authorId,
  seriesId,
  churchId,
} = {}) {
  try {
    // If text query provided, use the search_media RPC with trigram ranking
    if (query && query.trim()) {
      const { data, error } = await supabase.rpc('search_media', {
        q: query.trim(),
        p_kind: kind || null,
        p_category: category && category !== 'All' ? category : null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        // Fallback to standard query if RPC fails
        console.warn('[mediaApi] search_media RPC fallback:', error.message);
      } else if (data) {
        return { data, count: data.length, error: null };
      }
    }

    let q = supabase
      .from('media_items')
      .select(`
        *,
        author:profiles!author_id (
          id,
          display_name,
          avatar_url,
          role,
          badge
        ),
        church:churches!church_id (
          id,
          name,
          logo_url
        ),
        series:media_series!series_id (
          id,
          title,
          cover_url
        )
      `, { count: 'exact' })
      .eq('status', 'published');

    if (kind) {
      q = q.eq('kind', kind);
    }

    if (category && category !== 'All') {
      q = q.eq('category', category);
    }

    if (authorId) {
      q = q.eq('author_id', authorId);
    }

    if (seriesId) {
      q = q.eq('series_id', seriesId);
    }

    if (churchId) {
      q = q.eq('church_id', churchId);
    }

    // Sort order
    if (sort === 'views') {
      q = q.order('view_count', { ascending: false }).order('published_at', { ascending: false });
    } else if (sort === 'likes') {
      q = q.order('like_count', { ascending: false }).order('published_at', { ascending: false });
    } else if (sort === 'duration') {
      q = q.order('duration_seconds', { ascending: false });
    } else {
      // Default: recent
      q = q.order('published_at', { ascending: false });
    }

    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;

    return {
      data: data || [],
      count: count || 0,
      error: error || null,
    };
  } catch (err) {
    return { data: [], count: 0, error: err };
  }
}

/**
 * Fetches a single media item by ID with full engagement state for the session user.
 */
export async function getMedia(id) {
  if (!id) return { data: null, error: new Error('Media ID required.') };

  try {
    const { data, error } = await supabase
      .from('media_items')
      .select(`
        *,
        author:profiles!author_id (
          id,
          display_name,
          avatar_url,
          role,
          badge,
          about
        ),
        church:churches!church_id (
          id,
          name,
          logo_url
        ),
        series:media_series!series_id (
          id,
          title,
          description,
          cover_url
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: new Error('Media item not found.') };

    // Fetch user engagement (liked, saved) and watch progress if signed in
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;

    let userEngagement = { liked: false, saved: false };
    let userProgress = null;

    if (userId) {
      const [engRes, progRes] = await Promise.all([
        supabase
          .from('media_engagement')
          .select('liked, saved')
          .eq('user_id', userId)
          .eq('item_id', id)
          .maybeSingle(),
        supabase
          .from('watch_progress')
          .select('position_seconds, duration_seconds, completed')
          .eq('user_id', userId)
          .eq('item_id', id)
          .maybeSingle(),
      ]);

      if (engRes.data) userEngagement = engRes.data;
      if (progRes.data) userProgress = progRes.data;
    }

    return {
      data: {
        ...data,
        is_liked: Boolean(userEngagement.liked),
        is_saved: Boolean(userEngagement.saved),
        watch_progress: userProgress,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Creates a new media item record.
 */
export async function createMedia(payload) {
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) {
      return { data: null, error: new Error('You must be signed in to publish media.') };
    }

    const record = {
      author_id: userId,
      title: payload.title?.trim(),
      description: payload.description?.trim() || null,
      kind: payload.kind || 'video',
      media_url: payload.media_url,
      thumb_url: payload.thumb_url || null,
      duration_seconds: payload.duration_seconds || 0,
      category: payload.category || 'General',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      series_id: payload.series_id || null,
      episode_no: payload.episode_no || null,
      language: payload.language || 'en',
      visibility: payload.visibility || 'public',
      status: payload.status || 'published',
      accent: payload.accent || null,
      church_id: payload.church_id || null,
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('media_items')
      .insert(record)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Updates an existing media item.
 */
export async function updateMedia(id, payload) {
  if (!id) return { data: null, error: new Error('ID required for update.') };

  try {
    const { data, error } = await supabase
      .from('media_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Deletes a media item (RLS ensures only owner can delete).
 */
export async function deleteMedia(id) {
  if (!id) return { error: new Error('ID required for deletion.') };

  try {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Atomically toggles like status using the RPC toggle_media_like.
 */
export async function toggleLike(itemId) {
  if (!itemId) return { liked: false, likeCount: 0, error: new Error('Item ID required.') };

  try {
    const { data, error } = await supabase.rpc('toggle_media_like', {
      p_item_id: itemId,
    });

    if (error) {
      return { liked: false, likeCount: 0, error };
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
 * Atomically toggles save/bookmark status using the RPC toggle_media_save.
 */
export async function toggleSave(itemId) {
  if (!itemId) return { saved: false, saveCount: 0, error: new Error('Item ID required.') };

  try {
    const { data, error } = await supabase.rpc('toggle_media_save', {
      p_item_id: itemId,
    });

    if (error) {
      return { saved: false, saveCount: 0, error };
    }

    return {
      saved: Boolean(data?.saved),
      saveCount: data?.save_count || 0,
      error: null,
    };
  } catch (err) {
    return { saved: false, saveCount: 0, error: err };
  }
}

/**
 * Records a media view with daily viewer deduplication.
 */
export async function recordView(itemId, watchedSeconds = 0) {
  if (!itemId) return { viewCount: 0, error: null };

  try {
    // Generate simple persistent local viewer key if anonymous
    let viewerKey = null;
    if (typeof window !== 'undefined') {
      try {
        viewerKey = localStorage.getItem('shammah_viewer_key');
        if (!viewerKey) {
          viewerKey = 'v-' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
          localStorage.setItem('shammah_viewer_key', viewerKey);
        }
      } catch {}
    }

    const { data, error } = await supabase.rpc('record_media_view', {
      p_item_id: itemId,
      p_watched_seconds: Math.round(watchedSeconds),
      p_viewer_key: viewerKey,
    });

    return {
      viewCount: data?.view_count || 0,
      viewCounted: data?.view_counted || false,
      error,
    };
  } catch (err) {
    return { viewCount: 0, error: err };
  }
}

/**
 * Saves cross-device playback progress.
 */
export async function saveProgress(itemId, positionSeconds, durationSeconds) {
  if (!itemId) return { error: null };

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { error: null }; // Guests do not write to watch_progress table

    const completed = positionSeconds >= (durationSeconds * 0.92);

    const { error } = await supabase
      .from('watch_progress')
      .upsert({
        user_id: userId,
        item_id: itemId,
        position_seconds: Math.round(positionSeconds),
        duration_seconds: Math.round(durationSeconds),
        completed,
        updated_at: new Date().toISOString(),
      });

    return { error };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Fetches playback progress for an item.
 */
export async function getProgress(itemId) {
  if (!itemId) return { position: 0, completed: false, error: null };

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { position: 0, completed: false, error: null };

    const { data, error } = await supabase
      .from('watch_progress')
      .select('position_seconds, duration_seconds, completed')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    return {
      position: data?.position_seconds || 0,
      duration: data?.duration_seconds || 0,
      completed: data?.completed || false,
      error,
    };
  } catch (err) {
    return { position: 0, completed: false, error: err };
  }
}

/**
 * Lists user or public playlists.
 */
export async function listPlaylists({ kind, ownerId } = {}) {
  try {
    let q = supabase
      .from('playlists')
      .select(`
        *,
        owner:profiles!owner_id (
          id,
          display_name,
          avatar_url
        ),
        items:playlist_items (count)
      `)
      .order('created_at', { ascending: false });

    if (ownerId) {
      q = q.eq('owner_id', ownerId);
    } else {
      q = q.eq('is_public', true);
    }

    if (kind && kind !== 'mixed') {
      q = q.or(`kind.eq.${kind},kind.eq.mixed`);
    }

    const { data, error } = await q;
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Creates a new playlist.
 */
export async function createPlaylist({ title, description, kind = 'mixed', isPublic = true, coverUrl }) {
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { data: null, error: new Error('Sign-in required.') };

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        owner_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        kind,
        is_public: isPublic,
        cover_url: coverUrl || null,
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Adds an item to a playlist.
 */
export async function addPlaylistItem(playlistId, itemId, position = 0) {
  try {
    const { data, error } = await supabase
      .from('playlist_items')
      .upsert({
        playlist_id: playlistId,
        item_id: itemId,
        position,
        added_at: new Date().toISOString(),
      })
      .select()
      .single();

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Removes an item from a playlist.
 */
export async function removePlaylistItem(playlistId, itemId) {
  try {
    const { error } = await supabase
      .from('playlist_items')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('item_id', itemId);

    return { error };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Fetches a playlist and its items in order.
 */
export async function getPlaylist(playlistId) {
  try {
    const { data: playlist, error: plErr } = await supabase
      .from('playlists')
      .select(`
        *,
        owner:profiles!owner_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('id', playlistId)
      .single();

    if (plErr) return { data: null, error: plErr };

    const { data: items, error: itErr } = await supabase
      .from('playlist_items')
      .select(`
        position,
        added_at,
        media:media_items!item_id (
          id,
          title,
          description,
          media_url,
          thumb_url,
          duration_seconds,
          kind,
          category,
          accent,
          view_count,
          author:profiles!author_id (display_name)
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    return {
      data: {
        ...playlist,
        items: (items || []).map((i) => ({ ...i.media, position: i.position })),
      },
      error: itErr || null,
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Fetches trending media using velocity decay scoring.
 */
export async function trending({ kind, days = 7, limit = 12 } = {}) {
  try {
    const { data, error } = await supabase.rpc('trending_media', {
      p_kind: kind || null,
      p_days: days,
      p_limit: limit,
    });

    if (error) {
      // Fallback to top views
      return listMedia({ kind, sort: 'views', limit });
    }

    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Fetches related media items based on category or series.
 */
export async function relatedMedia(itemId, { limit = 6 } = {}) {
  if (!itemId) return { data: [], error: null };

  try {
    // 1. Get current item's category and series
    const { data: current } = await supabase
      .from('media_items')
      .select('category, series_id, kind')
      .eq('id', itemId)
      .maybeSingle();

    if (!current) return { data: [], error: null };

    let q = supabase
      .from('media_items')
      .select(`
        id,
        title,
        thumb_url,
        duration_seconds,
        kind,
        category,
        accent,
        view_count,
        published_at,
        author:profiles!author_id (display_name, avatar_url)
      `)
      .eq('status', 'published')
      .eq('kind', current.kind)
      .neq('id', itemId)
      .limit(limit);

    if (current.series_id) {
      q = q.eq('series_id', current.series_id);
    } else {
      q = q.eq('category', current.category);
    }

    const { data, error } = await q;
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Lists unfinished videos for the signed-in user from watch_progress.
 */
export async function listContinueWatching({ kind = 'video', limit = 10 } = {}) {
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { data: [], error: null };

    const { data, error } = await supabase
      .from('watch_progress')
      .select(`
        position_seconds,
        duration_seconds,
        completed,
        updated_at,
        media:media_items!item_id (
          id,
          title,
          description,
          media_url,
          thumb_url,
          duration_seconds,
          kind,
          category,
          accent,
          view_count,
          published_at,
          author:profiles!author_id (
            id,
            display_name,
            avatar_url,
            badge,
            badge_verified
          )
        )
      `)
      .eq('user_id', userId)
      .eq('completed', false)
      .gt('position_seconds', 5)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], error };

    const items = (data || [])
      .filter((row) => row.media && (!kind || row.media.kind === kind))
      .map((row) => ({
        ...row.media,
        playback_position: row.position_seconds,
        playback_duration: row.duration_seconds || row.media.duration_seconds,
        playback_percent: Math.min(
          100,
          Math.round((row.position_seconds / (row.duration_seconds || row.media.duration_seconds || 1)) * 100)
        ),
      }));

    return { data: items, error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Lists published video/audio series.
 */
export async function listSeries({ kind = 'video', limit = 12 } = {}) {
  try {
    let q = supabase
      .from('media_series')
      .select(`
        id,
        title,
        description,
        cover_url,
        kind,
        accent,
        created_at,
        owner:profiles!owner_id (
          id,
          display_name,
          avatar_url
        ),
        episodes:media_items (count)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kind) {
      q = q.eq('kind', kind);
    }

    const { data, error } = await q;
    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
}

