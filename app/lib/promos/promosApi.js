'use client';
import { supabase } from '../../lib/supabaseClient';

const PROMO_DISMISSALS_KEY = 'shammah_promo_dismissals_v1';
const PROMO_SESSION_SHOWN_KEY = 'shammah_promo_session_shown_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory 60-second cache for home_promos RPC
let cachedPromos = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Checks if a promo type is dismissed by user (persists for 7 days)
 */
export function isPromoDismissed(promoType) {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(PROMO_DISMISSALS_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    const dismissedAt = map[promoType];
    if (!dismissedAt) return false;
    if (Date.now() - dismissedAt < SEVEN_DAYS_MS) {
      return true;
    }
    // Expired - clean it up
    delete map[promoType];
    localStorage.setItem(PROMO_DISMISSALS_KEY, JSON.stringify(map));
    return false;
  } catch {
    return false;
  }
}

/**
 * Dismiss a promo type for 7 days
 */
export function dismissPromo(promoType) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PROMO_DISMISSALS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[promoType] = Date.now();
    localStorage.setItem(PROMO_DISMISSALS_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('shammah:promo-dismissed', { detail: { promoType } }));
    trackPromoEvent(promoType, 'dismiss');
  } catch (err) {
    console.error('Failed to dismiss promo:', err);
  }
}

/**
 * Get the list of promos shown in current session
 */
export function getSessionShownPromos() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(PROMO_SESSION_SHOWN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mark a promo as shown in this session (max 5 per session)
 */
export function recordSessionShownPromo(promoType) {
  if (typeof window === 'undefined') return;
  try {
    const list = getSessionShownPromos();
    if (!list.includes(promoType)) {
      list.push(promoType);
      sessionStorage.setItem(PROMO_SESSION_SHOWN_KEY, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Track promo impression, click, or dismissal in Supabase promo_events
 */
export async function trackPromoEvent(promoType, eventType, meta = {}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: {} }));
    const userId = sessionData?.session?.user?.id || null;

    supabase
      .from('promo_events')
      .insert({
        user_id: userId,
        promo_type: promoType,
        event_type: eventType,
        meta: {
          ...meta,
          timestamp: new Date().toISOString(),
          viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
        },
      })
      .then(() => {})
      .catch(() => {});
  } catch {}
}

/**
 * Default fallback promo candidates when database tables are empty
 */
const DEFAULT_FALLBACK_PROMOS = {
  reels: [
    {
      id: 'reel-grace-1',
      title: 'Walking in unmerited grace this season',
      media_url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-bible-41223-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=500',
      thumb_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=500',
      duration: '0:45',
      duration_seconds: 45,
      views: 1240,
      creator: 'Pastor Samuel',
      creator_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      sound_title: 'Original Sound · Grace Notes',
    },
    {
      id: 'reel-praise-2',
      title: 'Youth Sunday choir acoustic praise night',
      media_url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-praying-in-a-church-41221-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
      thumb_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
      duration: '1:12',
      duration_seconds: 72,
      views: 3820,
      creator: 'NWC Worship Team',
      creator_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
      sound_title: 'Worship Highlights 2026',
    },
    {
      id: 'reel-prayer-3',
      title: '30-second morning prayer for your family',
      media_url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-bible-41223-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=500',
      thumb_url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=500',
      duration: '0:32',
      duration_seconds: 32,
      views: 5410,
      creator: 'Mama Tabitha',
      creator_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
      sound_title: 'Morning Prayer Reflection',
    },
  ],
  live: null,
  course: {
    id: 'course-foundations',
    title: 'Biblical Foundations & Christian Discipleship',
    instructor: 'Rev. Dr. David Ochieng',
    instructor_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120',
    lessons_count: 8,
    duration_weeks: '4 weeks',
    cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
    tag: 'Popular Discipleship',
  },
  fundraiser: {
    id: 'fundraiser-sanctuary-roof',
    title: 'Nairobi Worship Center Children Center Roof Repair',
    church_name: 'Nairobi Worship Center',
    raised_kes: 385000,
    goal_kes: 650000,
    donors_count: 142,
    cover_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=600',
  },
  challenge: {
    id: 'challenge-psalms-21',
    title: '21-Day Psalms of Victory & Peace Challenge',
    participants_count: 512,
    current_day: 8,
    total_days: 21,
    streak_label: '🔥 Active Challenge',
  },
  verse: {
    reference: 'Joshua 1:9',
    text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
    theme: 'Courage & Faith',
  },
  audio: {
    id: 'audio-sermon-faith',
    title: 'Unwavering Faith in the Storms of Life',
    speaker: 'Bishop Arthur Kitonga',
    duration_label: '42 min',
    played_percent: 35,
  },
  poll: {
    id: 'poll-prayer-time',
    question: 'What time of day do you feel closest to God in prayer and meditation?',
    options: [
      { id: 'opt-1', label: 'Early Dawn (5:00 AM - 7:00 AM)', votes: 128 },
      { id: 'opt-2', label: 'Late Evening before sleep', votes: 194 },
    ],
    total_votes: 322,
  },
  arcade: {
    id: 'arcade-david-goliath',
    title: 'David vs. Goliath: Sling of Truth',
    game_slug: 'david',
    daily_title: 'Sling 5 Smooth Stones on Target',
    best_score: 450,
  },
};

/**
 * Lightweight fetch with 60-second in-memory cache and Supabase RPC fallback
 */
export async function fetchHomePromos(userId = null) {
  const now = Date.now();
  if (cachedPromos && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPromos;
  }

  try {
    // 1. Attempt RPC call
    const { data, error } = await supabase.rpc('home_promos', {
      p_user_id: userId || null,
    });

    if (!error && data && typeof data === 'object') {
      cachedPromos = {
        ...DEFAULT_FALLBACK_PROMOS,
        ...data,
      };
      cacheTimestamp = now;
      return cachedPromos;
    }
  } catch (rpcErr) {
    console.warn('[promosApi] RPC home_promos warning:', rpcErr?.message || rpcErr);
  }

  // 2. Fetch live stream & recent reels if RPC isn't deployed yet
  try {
    const [liveRes, reelsRes] = await Promise.all([
      supabase
        .from('live_streams')
        .select('*, host:profiles(id, display_name, avatar_url, badge)')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(1)
        .catch(() => ({ data: null })),
      supabase
        .from('posts')
        .select('*, author:profiles(id, display_name, avatar_url, badge, role)')
        .eq('media_type', 'reel')
        .order('created_at', { ascending: false })
        .limit(8)
        .catch(() => ({ data: null })),
    ]);

    const activeLive = liveRes?.data?.[0] || null;
    const dbReels = reelsRes?.data && reelsRes.data.length > 0
      ? reelsRes.data.map((r) => ({
          id: r.id,
          title: r.text_content || 'Faith Reel',
          media_url: r.media_url,
          thumbnail: r.thumb_url || r.media_thumbnail_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=500',
          thumb_url: r.thumb_url || r.media_thumbnail_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=500',
          duration_seconds: r.duration_seconds || r.media_duration_seconds || 45,
          duration: `${Math.floor((r.duration_seconds || 45) / 60)}:${String((r.duration_seconds || 45) % 60).padStart(2, '0')}`,
          views: r.view_count || 120,
          creator: r.author?.display_name || 'Disciple',
          creator_avatar: r.author?.avatar_url || null,
          sound_title: r.sound_title || 'Original Sound',
        }))
      : DEFAULT_FALLBACK_PROMOS.reels;

    cachedPromos = {
      ...DEFAULT_FALLBACK_PROMOS,
      reels: dbReels,
      live: activeLive,
    };
    cacheTimestamp = now;
    return cachedPromos;
  } catch {
    cachedPromos = DEFAULT_FALLBACK_PROMOS;
    cacheTimestamp = now;
    return cachedPromos;
  }
}
