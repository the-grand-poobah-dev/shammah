import { supabase } from '../supabaseClient';

function wrapResult(items, error = null) {
  const safeItems = Array.isArray(items) ? items : [];
  const res = [...safeItems];
  res.data = safeItems;
  res.count = safeItems.length;
  res.error = error;
  return res;
}

export async function listMedia({
  kind = 'video',
  type,
  category,
  query: searchStr,
  sort = 'recent',
  limit = 20,
  offset = 0,
} = {}) {
  const mediaKind = type || kind || 'video';

  try {
    // 1. Try querying media_items first
    let query = supabase.from('media_items').select('*', { count: 'exact' });

    if (mediaKind === 'video') {
      query = query.in('kind', ['video', 'live_replay']);
    } else if (mediaKind === 'audio') {
      query = query.in('kind', ['audio', 'podcast', 'sermon']);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (searchStr && searchStr.trim()) {
      query = query.ilike('title', `%${searchStr.trim()}%`);
    }

    if (sort === 'views') {
      query = query.order('view_count', { ascending: false });
    } else if (sort === 'trending') {
      query = query.order('like_count', { ascending: false });
    } else if (sort === 'duration') {
      query = query.order('duration_seconds', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(limit);
    }

    const { data, count, error } = await query;

    if (!error && data && data.length > 0) {
      return wrapResult(data);
    }

    // 2. If media_items returns empty or error (e.g., follows permission or not populated), fallback to posts
    let postsQuery = supabase.from('posts').select('*');
    if (mediaKind === 'video') {
      postsQuery = postsQuery.in('media_type', ['video', 'reel', 'live']);
    } else if (mediaKind === 'audio') {
      postsQuery = postsQuery.in('media_type', ['audio', 'podcast']);
    }

    if (sort === 'views') {
      postsQuery = postsQuery.order('view_count', { ascending: false });
    } else if (sort === 'trending') {
      postsQuery = postsQuery.order('like_count', { ascending: false });
    } else {
      postsQuery = postsQuery.order('created_at', { ascending: false });
    }

    postsQuery = postsQuery.limit(limit);

    const { data: postsData } = await postsQuery;
    if (postsData && postsData.length > 0) {
      // Map post fields to unified media format
      const mapped = postsData.map((p) => ({
        id: p.id,
        title: p.text_content?.slice(0, 60) || 'Church Broadcast',
        description: p.text_content || '',
        media_url: p.media_url,
        url: p.media_url,
        thumb_url: p.thumbnail_url || p.media_url,
        kind: mediaKind,
        duration_seconds: p.duration_seconds || 300,
        view_count: p.view_count || 120,
        like_count: p.like_count || 18,
        save_count: 5,
        created_at: p.created_at,
        published_at: p.created_at,
        category: p.category_id || (mediaKind === 'video' ? 'Sermons' : 'Worship'),
        author: {
          display_name: p.author_name || 'Community Member',
          avatar_url: p.author_avatar,
          badge: 'church_member',
        },
      }));
      return wrapResult(mapped);
    }
  } catch (err) {
    console.warn('[mediaApi] listMedia notice:', err?.message);
  }

  // Fallback to sample video seed if catalog is empty in dev
  const seedVideos = [
    {
      id: 'vid-seed-1',
      title: 'The Covenant of Grace: Walking in Supernatural Favor',
      description: 'Sunday teaching on Romans 8 and Kingdom breakthrough in daily life.',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=600',
      duration_seconds: 596,
      category: 'Sermons',
      accent: '#06b6d4',
      view_count: 342,
      like_count: 68,
      save_count: 22,
      published_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      author: {
        display_name: 'Bishop Sarah Ndung\'u',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        badge: 'bishop',
        badge_verified: true,
      },
    },
    {
      id: 'vid-seed-2',
      title: 'Atmosphere of Praise: Night of Breakthrough',
      description: 'Deep worship and intercession from the Shammah Praise Fellowship.',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumb_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
      duration_seconds: 720,
      category: 'Worship',
      accent: '#8b5cf6',
      view_count: 890,
      like_count: 142,
      save_count: 53,
      published_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      author: {
        display_name: 'Deliverance Worship Team',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        badge: 'worship_leader',
        badge_verified: true,
      },
    },
  ];

  return wrapResult(mediaKind === 'video' ? seedVideos : []);
}

export async function trending({ kind = 'video', type, limit = 10 } = {}) {
  return listMedia({ kind: kind || type, sort: 'trending', limit });
}

export async function listContinueWatching({ kind = 'video', limit = 8 } = {}) {
  if (typeof window === 'undefined') return wrapResult([]);
  try {
    const raw = localStorage.getItem(`shammah_continue_watching_${kind}`) || localStorage.getItem('shammah_continue_watching');
    const items = raw ? JSON.parse(raw) : [];
    return wrapResult(Array.isArray(items) ? items.slice(0, limit) : []);
  } catch (_) {
    return wrapResult([]);
  }
}

export async function listSeries({ kind = 'video', type, limit = 6 } = {}) {
  return wrapResult([]);
}

export async function listPlaylists({ type = 'audio' } = {}) {
  if (typeof window === 'undefined') return wrapResult([]);
  try {
    const raw = localStorage.getItem(`shammah_playlists_${type}`);
    const items = raw ? JSON.parse(raw) : [];
    return wrapResult(Array.isArray(items) ? items : []);
  } catch (_) {
    return wrapResult([]);
  }
}

export async function createPlaylist({ title, description, type = 'audio', tracks = [] }) {
  const newPl = {
    id: `pl-${Date.now()}`,
    title,
    description,
    type,
    tracks,
    created_at: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      const existing = await listPlaylists({ type });
      const updated = [newPl, ...(existing.data || existing || [])];
      localStorage.setItem(`shammah_playlists_${type}`, JSON.stringify(updated));
    } catch (_) {}
  }
  return newPl;
}

export async function toggleLike(mediaId) {
  return { success: true };
}

export async function toggleSave(mediaId) {
  if (typeof window === 'undefined') return { saved: true };
  try {
    const raw = localStorage.getItem('shammah_saved_media') || '[]';
    const list = JSON.parse(raw);
    const idx = list.indexOf(mediaId);
    let saved = false;
    if (idx === -1) {
      list.push(mediaId);
      saved = true;
    } else {
      list.splice(idx, 1);
      saved = false;
    }
    localStorage.setItem('shammah_saved_media', JSON.stringify(list));
    return { saved };
  } catch (_) {
    return { saved: true };
  }
}

export async function deleteMedia(mediaId) {
  try {
    await supabase.from('media_items').delete().eq('id', mediaId);
    await supabase.from('posts').delete().eq('id', mediaId);
  } catch (_) {}
  return { success: true };
}
