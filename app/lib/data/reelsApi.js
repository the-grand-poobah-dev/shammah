import { supabase } from '../supabaseClient';
import { SAMPLE_REELS } from '../../components/ReelsFeed';

export async function listReels({ limit = 20 } = {}) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('media_type', 'reel')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map((p) => ({
        id: p.id,
        video_url: p.media_url || p.video_url,
        thumb_url: p.thumb_url || p.media_thumb_url,
        title: p.text_content || p.title,
        scripture: p.scripture_tag || 'Philippians 4:13',
        audio_title: p.audio_title || 'Original Sound',
        likes_count: p.reaction_count || 12,
        comments_count: p.comment_count || 0,
        accent: p.accent_color || '#ec4899',
        creator: {
          id: p.user_id,
          display_name: p.user_display_name || 'Believer',
          avatar_url: p.user_avatar_url,
          badge: p.author_badge,
          badge_verified: Boolean(p.author_badge_verified),
        },
      }));
    }
  } catch (_) {}
  return SAMPLE_REELS;
}

export default listReels;
