import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
  Missions: ['Missions', 'Testimonies'],
};

function expandCategories(category) {
  if (!category || category === 'All') return null;
  return CATEGORY_ALIASES[category] || [category];
}

/**
 * This fallback endpoint is read-only and public-only. Never use a service-role
 * key here: that key bypasses RLS and could expose private media to callers.
 */
function getSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function errorResponse(message, status = 500) {
  return NextResponse.json({ data: [], count: 0, error: { message } }, { status });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const kind = searchParams.get('kind') || undefined;
    const category = searchParams.get('category') || undefined;
    const query = (searchParams.get('query') || '').trim().slice(0, 100);
    const sort = searchParams.get('sort') || 'recent';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const cursor = searchParams.get('cursor') || '';
    const itemId = searchParams.get('id') || undefined;
    const authorId = searchParams.get('authorId') || undefined;
    const seriesId = searchParams.get('seriesId') || undefined;
    const churchId = searchParams.get('churchId') || undefined;

    const supabase = getSupabasePublicClient();
    if (!supabase) {
      return errorResponse('Public Supabase configuration is missing.', 503);
    }

    if (action === 'series') {
      let q = supabase
        .from('media_series')
        .select(`
          id, title, description, cover_url, kind, accent, created_at,
          owner:profiles!owner_id (id, display_name, avatar_url),
          episodes:media_items (count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (kind) q = q.eq('kind', kind);
      const { data, count, error } = await q;
      if (error) return errorResponse(error.message);
      return NextResponse.json({ data: data || [], count: count || 0, error: null });
    }

    if (action === 'reels') {
      let q = supabase
        .from('posts')
        .select(`
          id, author_id, church_id, category_id, text_content, media_url, media_type,
          media_duration_seconds, media_thumbnail_url, sound_title, view_count,
          like_count, comment_count, duration_seconds, visibility, created_at,
          profiles:author_id (id, display_name, avatar_url, badge, badge_verified, role)
        `, { count: 'exact' })
        .eq('media_type', 'reel')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await q;
      if (error) return errorResponse(error.message);
      return NextResponse.json({ data: data || [], count: count || 0, error: null });
    }

    if (action === 'get') {
      if (!itemId) return errorResponse('Media item ID is required.', 400);

      const { data, error } = await supabase
        .from('media_items')
        .select(`
          *,
          author:profiles!author_id (id, display_name, avatar_url, role, badge, about),
          church:churches!church_id (id, name, logo_url),
          series:media_series!series_id (id, title, description, cover_url)
        `)
        .eq('id', itemId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .maybeSingle();

      if (error) return errorResponse(error.message);
      if (!data) return errorResponse('Media item not found.', 404);
      return NextResponse.json({
        data: { ...data, is_liked: false, is_saved: false, watch_progress: null },
        error: null,
      });
    }

    let q = supabase
      .from('media_items')
      .select(`
        *,
        author:profiles!author_id (id, display_name, avatar_url, role, badge),
        church:churches!church_id (id, name, logo_url),
        series:media_series!series_id (id, title, cover_url)
      `, { count: 'exact' })
      .eq('status', 'published')
      .eq('visibility', 'public');

    if (kind === 'video' || kind === 'audio') q = q.eq('kind', kind);
    if (authorId) q = q.eq('author_id', authorId);
    if (seriesId) q = q.eq('series_id', seriesId);
    if (churchId) q = q.eq('church_id', churchId);

    const cats = expandCategories(category);
    if (cats?.length) q = q.in('category', cats);

    if (query) q = q.ilike('title', '%' + query.replace(/[%_\\]/g, '') + '%');
    if (cursor && sort === 'recent') q = q.lt('published_at', cursor);

    if (action === 'trending' || sort === 'trending' || sort === 'views') {
      q = q.order('view_count', { ascending: false })
        .order('like_count', { ascending: false })
        .order('published_at', { ascending: false });
    } else if (sort === 'likes') {
      q = q.order('like_count', { ascending: false }).order('published_at', { ascending: false });
    } else if (sort === 'duration') {
      q = q.order('duration_seconds', { ascending: false }).order('published_at', { ascending: false });
    } else {
      q = q.order('published_at', { ascending: false });
    }

    q = q.range(offset, offset + limit - 1);
    const { data, count, error } = await q;
    if (error) return errorResponse(error.message);
    return NextResponse.json({ data: data || [], count: count || 0, error: null });
  } catch (err) {
    return errorResponse(err?.message || 'Internal media server error');
  }
}
