// Helpers for Pinned Posts & Community Announcements

/**
 * Checks whether the user has administrator privileges
 * (either platform_admin or church_admin, or admin mode override for preview)
 */
export function isUserAdmin(profile, session, adminOverride = false) {
  if (adminOverride) return true;
  if (!profile) return false;
  return profile.role === 'platform_admin' || profile.role === 'church_admin';
}

/**
 * Sorts an array of posts so that pinned announcements are ALWAYS at the top.
 * Pinned posts are ordered by pinned_at (descending) or created_at (descending).
 * Unpinned posts follow in chronological order (newest first).
 */
export function sortPostsWithPinned(postList) {
  if (!Array.isArray(postList)) return [];

  return [...postList].sort((a, b) => {
    const aPinned = Boolean(a?.is_pinned);
    const bPinned = Boolean(b?.is_pinned);

    // Pinned posts always take precedence
    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }

    // Both are pinned: sort by pinned_at or created_at (most recently pinned first)
    if (aPinned && bPinned) {
      const aTime = new Date(a.pinned_at || a.created_at || 0).getTime();
      const bTime = new Date(b.pinned_at || b.created_at || 0).getTime();
      if (bTime !== aTime) return bTime - aTime;
    }

    // Unpinned posts: newest first
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();
    return bCreated - aCreated;
  });
}

const USER_POSTS_KEY = 'shammah_user_created_posts_v1';

export function getUserCreatedPosts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserCreatedPost(post) {
  if (typeof window === 'undefined' || !post?.id) return;
  try {
    const existing = getUserCreatedPosts().filter((p) => p.id !== post.id);
    localStorage.setItem(USER_POSTS_KEY, JSON.stringify([post, ...existing]));
  } catch {}
}

export function updateUserCreatedPost(postId, updates = {}) {
  if (typeof window === 'undefined' || !postId) return;
  try {
    const existing = getUserCreatedPosts();
    const idx = existing.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates };
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(existing));
    }
  } catch {}
}

/**
 * Default sample posts shown when the database has no posts or is initializing,
 * featuring a prominent pinned announcement at the top of the feed.
 */
export function getSampleFeedPosts(category = null) {
  const now = Date.now();
  const allSamples = [
    {
      id: 'pinned-announcement-official',
      author_id: 'pastor-thomas-id',
      church_id: 'inst-citam',
      church_name: 'CITAM Valley Road',
      visibility: 'public',
      text_content:
        '📌 CRITICAL COMMUNITY ANNOUNCEMENT: Welcome to our joint worship season! Please note that all mid-week Bible study groups will meet in the main auditorium this Wednesday at 6:30 PM for our special praise and prayer assembly. Community dinner will be served following the service. All ministry teams, youth leaders, and church families are warmly invited.',
      category_id: 'events',
      is_pinned: true,
      pinned_at: new Date(now - 1000 * 60 * 15).toISOString(), // 15 mins ago
      created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      profiles: {
        id: 'pastor-thomas-id',
        display_name: 'Pastor Thomas (Church Administrator)',
        avatar_url: null,
        badge: 'pastor',
        badge_verified: true,
        role: 'church_admin',
        church_id: 'inst-citam',
        church_name: 'CITAM Valley Road',
      },
    },
    {
      id: 'sample-prayer-1',
      author_id: 'sarah-wanjiku-id',
      church_id: 'inst-citam',
      church_name: 'CITAM Valley Road',
      visibility: 'public',
      text_content:
        'Please keep the Kamau family in your prayers this week following the birth of their baby girl Grace! Both mom and baby are doing wonderfully. Praise God for His continuous blessings!',
      category_id: 'prayer',
      is_pinned: false,
      pinned_at: null,
      created_at: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      profiles: {
        id: 'sarah-wanjiku-id',
        display_name: 'Sarah Wanjiku',
        avatar_url: null,
        badge: 'member',
        badge_verified: true,
        role: 'member',
        church_id: 'inst-citam',
        church_name: 'CITAM Valley Road',
      },
    },
    {
      id: 'sample-worship-2',
      author_id: 'david-omondi-id',
      church_id: 'inst-mavuno',
      church_name: 'Mavuno Church Hill City',
      visibility: 'public',
      text_content:
        'Youth Choir practice is confirmed for this Saturday at 2:00 PM. We will be rehearsing the anthems for the upcoming Sunday Thanksgiving Service. Sheet music is ready in the choir room!',
      category_id: 'worship',
      is_pinned: false,
      pinned_at: null,
      created_at: new Date(now - 1000 * 60 * 60 * 7).toISOString(),
      profiles: {
        id: 'david-omondi-id',
        display_name: 'David Omondi',
        avatar_url: null,
        badge: 'worship',
        badge_verified: true,
        role: 'member',
        church_id: 'inst-mavuno',
        church_name: 'Mavuno Church Hill City',
      },
    },
    {
      id: 'sample-testimony-3',
      author_id: 'grace-muthoni-id',
      church_id: 'inst-citam',
      church_name: 'CITAM Valley Road',
      visibility: 'public',
      text_content:
        '"The Lord is my strength and my shield; my heart trusted in Him, and I am helped." — Psalms 28:7. Truly grateful for how God came through in my medical tests this past Friday!',
      category_id: 'stories',
      is_pinned: false,
      pinned_at: null,
      created_at: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      profiles: {
        id: 'grace-muthoni-id',
        display_name: 'Grace Muthoni',
        avatar_url: null,
        badge: 'elder',
        badge_verified: true,
        role: 'member',
        church_id: 'inst-citam',
        church_name: 'CITAM Valley Road',
      },
    },
  ];

  const userPosts = getUserCreatedPosts();
  const userIds = new Set(userPosts.map((p) => p.id));
  let visMap = {};
  if (typeof window !== 'undefined') {
    try {
      const rawVis = localStorage.getItem('shammah_post_visibility_v1');
      if (rawVis) visMap = JSON.parse(rawVis) || {};
    } catch {}
  }
  const combined = [...userPosts, ...allSamples.filter((s) => !userIds.has(s.id))].map((p) => ({
    ...p,
    visibility: visMap[p.id] || p.visibility || 'public',
  }));

  if (!category) return sortPostsWithPinned(combined);
  return sortPostsWithPinned(combined.filter((p) => p.category_id === category || p.is_pinned));
}
