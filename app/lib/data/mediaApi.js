import { supabase } from '../supabaseClient';

export async function listMedia({ type = 'video', category, sort = 'recent', limit = 20 } = {}) {
  try {
    let query = supabase.from('posts').select('*');
    if (type === 'video') {
      query = query.in('media_type', ['video', 'reel', 'live_replay']);
    } else if (type === 'audio') {
      query = query.in('media_type', ['audio', 'podcast', 'voice_note']);
    }
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (sort === 'views') {
      query = query.order('view_count', { ascending: false });
    } else if (sort === 'trending') {
      query = query.order('reaction_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    const { data, error } = await query.limit(limit);
    if (!error && data) return data;
  } catch (_) {}
  return [];
}

export async function trending({ type = 'video', limit = 10 } = {}) {
  return listMedia({ type, sort: 'trending', limit });
}

export async function listContinueWatching() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('shammah_continue_watching');
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export async function listSeries({ type = 'video' } = {}) {
  return [];
}

export async function listPlaylists({ type = 'audio' } = {}) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`shammah_playlists_${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
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
      const updated = [newPl, ...existing];
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
    await supabase.from('posts').delete().eq('id', mediaId);
  } catch (_) {}
  return { success: true };
}
