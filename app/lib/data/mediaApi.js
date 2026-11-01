/**
 * Shammah Media API Data Layer
 * Handles videos, audio, series, playlists, watch progress, and engagement
 * using Supabase with Row Level Security. SSR-safe.
 */

import { supabase } from '../../../lib/supabaseClient';

const CATEGORY_ALIASES = {
  Sermons: ['Sermons', 'Sermon'],
  Sermon: ['Sermon', 'Sermons'],
  Worship: ['Worship'],
  Testimonies: ['Testimonies', 'Missions'],
  Teaching: ['Teaching', 'Theology', 'Leadership'],
  Theology: ['Theology', 'Teaching'],
  Leadership: ['Leadership', 'Teaching'],
  'Kids & Family': ['Kids & Family', 'Family'],
  Family: ['Family', 'Kids & Family'],
  'Youth & Gen-Z': ['Youth & Gen-Z', 'Youth'],
  Youth: ['Youth', 'Youth & Gen-Z'],
  'Live Replays': ['Live Replays', 'Live'],
  Prayer: ['Prayer'],
  Devotionals: ['Devotionals', 'Prayer'],
  Missions: ['Missions', 'Testimonies'],
};

function expandCategories(category) {
  if (!category || category === 'All') return null;
  return CATEGORY_ALIASES[category] || [category];
}

async function fetchMediaFallback(params = {}) {
  if (typeof window === 'undefined') return null;
  try {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        search.set(k, String(v));
      }
    });
    const res = await fetch(`/api/media?${search.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Lists media items with category filtering, search, sorting, and pagination.
 * 
 * @param {Object} params
 * @param {'video'|'audio'} [params.kind]
 * @param {string} [params.category]
 * @param {string} [params.query]
 * @param {'trending'|'recent'|'views'|'likes'|'duration'} [params.sort='recent']
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
  cursor = null,
  authorId,
  seriesId,
  churchId,
} = {}) {
  try {
    // If text query provided, use the search_media RPC with trigram ranking
    if (query && query.trim() && !cursor) {
      const { data, error } = await supabase.rpc('search_media', {
        q: query.trim(),
        p_kind: kind || null,
        p_category: category && category !== 'All' ? category : null,
        p_limit: limit,
        p_offset: cursor ? 0 : offset,
      });

      if (error) {
        console.warn('[mediaApi] search_media RPC fallback:', error.message);
      } else if (data && data.length > 0) {
        if (kind === 'audio') {
          const { data: transcriptRows } = await supabase
            .from('media_items')
            .select('id, transcript_url')
            .in('id', data.map((item) => item.id));
          const transcriptById = new Map((transcriptRows || []).map((row) => [row.id, row.transcript_url]));
          const enriched = data.map((item) => ({ ...item, transcript_url: transcriptById.get(item.id) || null }));
          return { data: enriched, count: enriched.length, error: null };
        }
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

    if (query && query.trim()) {
      q = q.ilike('title', '%' + query.trim().replace(/[%_\\\\]/g, '') + '%');
    }

    const cats = expandCategories(category);
    if (cats && cats.length > 0) {
      if (cats.length === 1) {
        q = q.eq('category', cats[0]);
      } else {
        q = q.in('category', cats);
      }
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
    if (sort === 'trending' || sort === 'views') {
      q = q.order('view_count', { ascending: false }).order('like_count', { ascending: false }).order('published_at', { ascending: false });
    } else if (sort === 'likes') {
      q = q.order('like_count', { ascending: false }).order('published_at', { ascending: false });
    } else if (sort === 'duration') {
      q = q.order('duration_seconds', { ascending: false });
    } else {
      // Default: recent
      q = q.order('published_at', { ascending: false });
    }

    // Cursor is the last published_at ISO timestamp. Keep offset pagination for
    // older callers while recent-feed consumers can use keyset pagination.
    if (sort === 'recent' && typeof cursor === 'string' && cursor) {
      q = q.lt('published_at', cursor).order('id', { ascending: false }).limit(limit);
    } else {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, count, error } = await q;

    if (error || !data || (data.length === 0 && offset === 0 && !authorId && !seriesId && !churchId)) {
      const fb = await fetchMediaFallback({
        action: 'list',
        kind,
        category,
        query: query?.trim(),
        sort,
        limit,
        offset,
        cursor,
      });
      if (fb && Array.isArray(fb.data) && (fb.data.length > 0 || error)) {
        return {
          data: fb.data,
          count: fb.count ?? fb.data.length,
          error: null,
        };
      }
    }

    return {
      data: data || [],
      count: count || 0,
      error: error || null,
    };
  } catch (err) {
    const fb = await fetchMediaFallback({
      action: 'list',
      kind,
      category,
      query: query?.trim(),
      sort,
      limit,
      offset,
      cursor,
    });
    if (fb && Array.isArray(fb.data)) {
      return { data: fb.data, count: fb.count ?? fb.data.length, error: null };
    }
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

    if (error || !data) {
      const fb = await fetchMediaFallback({ action: 'get', id });
      if (fb?.data) {
        return { data: fb.data, error: null };
      }
      if (error) return { data: null, error };
      return { data: null, error: new Error('Media item not found.') };
    }

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
    const fb = await fetchMediaFallback({ action: 'get', id });
    if (fb?.data) {
      return { data: fb.data, error: null };
    }
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
      transcript_url: payload.transcript_url || null,
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
  if (!id) return { data: null, error: new Error('ID required for deletion.') };

  try {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    return { data: null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Atomically toggles like status using the RPC toggle_media_like.
 */
export async function toggleLike(itemId) {
  if (!itemId) return { data: null, liked: false, likeCount: 0, error: new Error('Item ID required.') };

  try {
    const { data, error } = await supabase.rpc('toggle_media_like', {
      p_item_id: itemId,
    });

    if (error) {
      return { data: null, liked: false, likeCount: 0, error };
    }

    return {
      data: data || null,
      liked: Boolean(data?.liked),
      likeCount: data?.like_count || 0,
      error: null,
    };
  } catch (err) {
    return { data: null, liked: false, likeCount: 0, error: err };
  }
}

/**
 * Atomically toggles save/bookmark status using the RPC toggle_media_save.
 */
export async function toggleSave(itemId) {
  if (!itemId) return { data: null, saved: false, saveCount: 0, error: new Error('Item ID required.') };

  try {
    const { data, error } = await supabase.rpc('toggle_media_save', {
      p_item_id: itemId,
    });

    if (error) {
      return { data: null, saved: false, saveCount: 0, error };
    }

    return {
      data: data || null,
      saved: Boolean(data?.saved),
      saveCount: data?.save_count || 0,
      error: null,
    };
  } catch (err) {
    return { data: null, saved: false, saveCount: 0, error: err };
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
    return { data: null, viewCount: 0, error: err };
  }
}

/**
 * Saves cross-device playback progress.
 */
export async function saveProgress(itemId, positionSeconds, durationSeconds) {
  if (!itemId) return { data: null, error: null };

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { data: null, error: null }; // Guests do not write to watch_progress table

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

    return { data: null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Fetches playback progress for an item.
 */
export async function getProgress(itemId) {
  if (!itemId) return { data: { position: 0, duration: 0, completed: false }, position: 0, duration: 0, completed: false, error: null };

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { data: { position: 0, duration: 0, completed: false }, position: 0, duration: 0, completed: false, error: null };

    const { data, error } = await supabase
      .from('watch_progress')
      .select('position_seconds, duration_seconds, completed')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    const progress = {
      position: data?.position_seconds || 0,
      duration: data?.duration_seconds || 0,
      completed: data?.completed || false,
    };
    return { data: progress, ...progress, error };
  } catch (err) {
    return { data: { position: 0, duration: 0, completed: false }, position: 0, duration: 0, completed: false, error: err };
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
      // Include public community playlists plus the current user's private playlists.
      q = q.or(`owner_id.eq.${ownerId},is_public.eq.true`);
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
 * Updates a playlist owned by the signed-in user. RLS remains authoritative.
 */
export async function updatePlaylist(playlistId, changes = {}) {
  if (!playlistId) return { data: null, error: new Error('Playlist ID required.') };
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const userId = sessionRes?.data?.session?.user?.id;
  if (!userId) return { data: null, error: new Error('Sign-in required.') };

  const update = {};
  if (typeof changes.title === 'string') {
    const title = changes.title.trim();
    if (!title) return { data: null, error: new Error('Playlist title is required.') };
    update.title = title.slice(0, 120);
  }
  if (typeof changes.description === 'string') update.description = changes.description.trim() || null;
  if (typeof changes.isPublic === 'boolean') update.is_public = changes.isPublic;
  if (typeof changes.coverUrl === 'string' || changes.coverUrl === null) update.cover_url = changes.coverUrl;

  if (Object.keys(update).length === 0) return { data: null, error: new Error('No playlist changes supplied.') };
  try {
    const { data, error } = await supabase
      .from('playlists')
      .update(update)
      .eq('id', playlistId)
      .eq('owner_id', userId)
      .select()
      .maybeSingle();
    if (error) return { data: null, error };
    if (!data) return { data: null, error: new Error('Playlist not found or you do not own it.') };
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Deletes a playlist owned by the signed-in user. RLS remains authoritative.
 */
export async function deletePlaylist(playlistId) {
  if (!playlistId) return { data: null, error: new Error('Playlist ID required.') };
  const sessionRes = await supabase.auth.getSession().catch(() => null);
  const userId = sessionRes?.data?.session?.user?.id;
  if (!userId) return { data: null, error: new Error('Sign-in required.') };
  try {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .eq('owner_id', userId);
    return { data: null, error: error || null };
  } catch (error) {
    return { data: null, error };
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

    return { data: null, error };
  } catch (err) {
    return { data: null, error: err };
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

    if (error || !data || data.length === 0 || !data[0]?.author) {
      // Fallback to top views with full author/church/series joins
      return listMedia({ kind, sort: 'views', limit });
    }

    return { data: data || [], error: null };
  } catch (err) {
    return listMedia({ kind, sort: 'views', limit });
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

    if (!current) {
      const fb = await fetchMediaFallback({ action: 'list', kind: 'video', limit: limit + 1 });
      if (fb?.data) {
        return { data: fb.data.filter((i) => i.id !== itemId).slice(0, limit), error: null };
      }
      return { data: [], error: null };
    }

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
    if (error) {
      const fb = await fetchMediaFallback({ action: 'list', kind: current.kind, limit: limit + 1 });
      if (fb?.data) {
        return { data: fb.data.filter((i) => i.id !== itemId).slice(0, limit), error: null };
      }
    }
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

    if (error) return { data: [], error: null };

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
    return { data: [], error: null };
  }
}

/**
 * Creates a media series owned by the signed-in user.
 */
export async function createMediaSeries({ title, description = null, kind = 'video', churchId = null, coverUrl = null, accent = null } = {}) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!cleanTitle) return { data: null, error: new Error('Series title is required.') };
  if (cleanTitle.length > 160) return { data: null, error: new Error('Series title must be 160 characters or fewer.') };
  if (!['video', 'audio'].includes(kind)) return { data: null, error: new Error('Series kind must be video or audio.') };

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { data: null, error: new Error('Sign in to create a media series.') };

    const { data, error } = await supabase
      .from('media_series')
      .insert({
        owner_id: userId,
        church_id: churchId || null,
        title: cleanTitle,
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        kind,
        cover_url: coverUrl || null,
        accent: accent || null,
      })
      .select()
      .single();

    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Checks whether the signed-in user follows an audio series.
 */
export async function checkSeriesFollow(seriesId) {
  if (!seriesId) return { following: false, error: new Error('Series ID required.') };
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { following: false, error: null };
    const { data, error } = await supabase
      .from('media_series_follows')
      .select('series_id')
      .eq('user_id', userId)
      .eq('series_id', seriesId)
      .maybeSingle();
    return { following: Boolean(data), error: error || null };
  } catch (error) {
    return { following: false, error };
  }
}

/**
 * Follows or unfollows a series using the authenticated user's own row.
 */
export async function toggleSeriesFollow(seriesId) {
  if (!seriesId) return { following: false, error: new Error('Series ID required.') };
  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { following: false, error: new Error('Sign in to follow this series.') };

    const existing = await supabase
      .from('media_series_follows')
      .select('series_id')
      .eq('user_id', userId)
      .eq('series_id', seriesId)
      .maybeSingle();
    if (existing.error) return { following: false, error: existing.error };

    if (existing.data) {
      const { error } = await supabase
        .from('media_series_follows')
        .delete()
        .eq('user_id', userId)
        .eq('series_id', seriesId);
      return { following: false, error: error || null };
    }

    const { error } = await supabase
      .from('media_series_follows')
      .insert({ user_id: userId, series_id: seriesId });
    return { following: !error, error: error || null };
  } catch (error) {
    return { following: false, error };
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
    if (error || !data || data.length === 0) {
      const fb = await fetchMediaFallback({ action: 'series', kind, limit });
      if (fb && Array.isArray(fb.data) && (fb.data.length > 0 || error)) {
        return { data: fb.data, error: null };
      }
    }
    return { data: data || [], error };
  } catch (err) {
    const fb = await fetchMediaFallback({ action: 'series', kind, limit });
    if (fb && Array.isArray(fb.data)) {
      return { data: fb.data, error: null };
    }
    return { data: [], error: err };
  }
}

/**
 * Lists comments attached to a published media item.
 * Cursor is the last comment's created_at ISO timestamp; offset remains available
 * for callers that still use page-number pagination.
 */
export async function listMediaComments(itemId, { limit = 30, cursor = null, offset = 0 } = {}) {
  if (!itemId) return { data: [], error: new Error('Media item ID required.') };

  try {
    const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 100);
    let query = supabase
      .from('media_comments')
      .select(`
        id, item_id, user_id, parent_id, body, media_url, media_type, created_at,
        author:profiles!user_id (id, display_name, avatar_url, badge, badge_verified)
      `, { count: 'exact' })
      .eq('item_id', itemId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(pageSize);

    if (cursor) query = query.gt('created_at', cursor);
    else if (offset > 0) query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    return { data: data || [], count: count || 0, error: error || null };
  } catch (error) {
    return { data: [], count: 0, error };
  }
}

/**
 * Creates a media comment using the signed-in user's identity and table RLS.
 */
export async function createMediaComment({ itemId, body, parentId = null, mediaUrl = null, mediaType = null } = {}) {
  const text = typeof body === 'string' ? body.trim() : '';
  if (!itemId) return { data: null, error: new Error('Media item ID required.') };
  if (!text && !mediaUrl) return { data: null, error: new Error('Add text or media to your comment.') };
  if (text.length > 2000) return { data: null, error: new Error('Comments must be 2,000 characters or fewer.') };
  if (mediaType && !['image', 'video', 'audio', 'gif'].includes(mediaType)) {
    return { data: null, error: new Error('Unsupported comment media type.') };
  }

  try {
    const sessionRes = await supabase.auth.getSession().catch(() => null);
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return { data: null, error: new Error('Sign in to comment.') };

    const { data, error } = await supabase
      .from('media_comments')
      .insert({
        item_id: itemId, user_id: userId, parent_id: parentId || null,
        body: text || '', media_url: mediaUrl || null, media_type: mediaType || null,
      })
      .select(`
        id, item_id, user_id, parent_id, body, media_url, media_type, created_at,
        author:profiles!user_id (id, display_name, avatar_url, badge, badge_verified)
      `)
      .single();

    return { data: data || null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
}
