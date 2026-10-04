'use client';
import { supabase } from '../../lib/supabaseClient';

const RSS_FEEDS_KEY = 'shammah_rss_feeds_v2';
const RSS_BROADCAST_KEY = 'shammah_developer_broadcast_rss_v1';

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// Curated faith, church, and scripture RSS presets for quick one-click discovery
export const PRESET_RSS_FEEDS = [
  {
    id: 'desiring-god',
    name: 'Desiring God Articles',
    category: 'lessons',
    sourceName: 'Desiring God',
    sourceUrl: 'https://www.desiringgod.org',
    feedUrl: 'https://www.desiringgod.org/rss',
    description: 'Biblical truth, sermons, and theological meditations on Christ supreme in all things.',
    icon: '📖',
    mediaType: 'text',
    items: [
      {
        id: 'dg-1',
        title: 'He Restores My Soul: Finding Rest in Christ in a Restless World',
        author: 'John Piper',
        source: 'Desiring God',
        sourceUrl: 'https://www.desiringgod.org/articles/he-restores-my-soul',
        pubDate: '2 hours ago',
        description: 'When the noise of life depletes our spiritual strength, Christ invites us beside the still waters of His promises and righteousness.',
        mediaType: 'text',
        imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600',
        likesCount: 38,
        commentsCount: 9,
        repostsCount: 14,
      },
      {
        id: 'dg-2',
        title: 'Morning Mercies: Why Lamentations 3 Still Changes Everything',
        author: 'David Mathis',
        source: 'Desiring God',
        sourceUrl: 'https://www.desiringgod.org/articles/morning-mercies',
        pubDate: 'Yesterday',
        description: 'The steadfast love of the Lord never ceases; His mercies never come to an end; they are new every morning. Great is Your faithfulness.',
        mediaType: 'text',
        imageUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600',
        likesCount: 52,
        commentsCount: 12,
        repostsCount: 21,
      },
    ],
  },
  {
    id: 'christianity-today',
    name: 'Christianity Today Feed',
    category: 'stories',
    sourceName: 'Christianity Today',
    sourceUrl: 'https://www.christianitytoday.com',
    feedUrl: 'https://www.christianitytoday.com/feed',
    description: 'Thoughtful journalism and global testimonies shaping the church community worldwide.',
    icon: '⛪',
    mediaType: 'text',
    items: [
      {
        id: 'ct-1',
        title: 'Revival Across African Youth Fellowships: A Generation Hungry for the Word',
        author: 'Sarah Ouma',
        source: 'Christianity Today',
        sourceUrl: 'https://www.christianitytoday.com/news/african-youth-fellowship',
        pubDate: '4 hours ago',
        description: 'From Nairobi to Lagos, thousands of young believers are gathering before dawn for prayer, scripture memorization, and street evangelism.',
        mediaType: 'text',
        imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600',
        likesCount: 76,
        commentsCount: 18,
        repostsCount: 31,
      },
      {
        id: 'ct-2',
        title: 'How Local Churches are Providing Clean Water and Gospel Hope',
        author: 'Daniel Mwangi',
        source: 'Christianity Today',
        sourceUrl: 'https://www.christianitytoday.com/news/water-ministry-hope',
        pubDate: '2 days ago',
        description: 'Faith in action: congregations partner with local communities to drill boreholes and plant fellowship centers.',
        mediaType: 'text',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600',
        likesCount: 64,
        commentsCount: 11,
        repostsCount: 19,
      },
    ],
  },
  {
    id: 'daily-audio-bible',
    name: 'Daily Scripture & Worship Podcast',
    category: 'worship',
    sourceName: 'Daily Word Fellowship',
    sourceUrl: 'https://dailyaudiobible.com',
    feedUrl: 'https://dailyaudiobible.com/podcast/feed',
    description: 'Listen to the living Word of God read daily with reflective worship instrumentation.',
    icon: '🎙️',
    mediaType: 'audio',
    items: [
      {
        id: 'dab-1',
        title: 'Daily Audio Scripture: Psalm 91 & Romans 8 (Victory in Christ)',
        author: 'Pastor Brian Hardin',
        source: 'Daily Word Fellowship',
        sourceUrl: 'https://dailyaudiobible.com/audio/psalm-91-romans-8',
        pubDate: 'Today',
        description: 'He who dwells in the secret place of the Most High shall abide under the shadow of the Almighty. Immerse in scripture and prayer.',
        mediaType: 'audio',
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain.ogg',
        duration: '18:42',
        imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        likesCount: 94,
        commentsCount: 23,
        repostsCount: 42,
      },
      {
        id: 'dab-2',
        title: 'Spiritual Warfare and the Full Armor of God (Ephesians 6 Audio)',
        author: 'Pastor David Mwangi',
        source: 'Daily Word Fellowship',
        sourceUrl: 'https://dailyaudiobible.com/audio/ephesians-6',
        pubDate: '3 days ago',
        description: 'Put on the whole armor of God, that you may be able to stand against the wiles of the enemy. A powerful guided audio devotional.',
        mediaType: 'audio',
        audioUrl: 'https://actions.google.com/sounds/v1/ambiences/gentle_stream.ogg',
        duration: '22:15',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
        likesCount: 88,
        commentsCount: 19,
        repostsCount: 35,
      },
    ],
  },
  {
    id: 'gospel-coalition',
    name: 'The Gospel Coalition Video Teachings',
    category: 'lessons',
    sourceName: 'The Gospel Coalition',
    sourceUrl: 'https://www.thegospelcoalition.org',
    feedUrl: 'https://www.thegospelcoalition.org/feed',
    description: 'Gospel-centered theological essays, video sermons, and biblical leadership resources.',
    icon: '🎥',
    mediaType: 'video',
    items: [
      {
        id: 'tgc-1',
        title: 'How to Read the Bible for All Its Worth: Hermeneutics Workshop',
        author: 'Dr. Timothy Keller',
        source: 'The Gospel Coalition',
        sourceUrl: 'https://www.thegospelcoalition.org/video/reading-bible-worth',
        pubDate: '5 hours ago',
        description: 'A masterclass on discerning historical context, biblical genres, and the covenantal grace woven throughout every chapter of scripture.',
        mediaType: 'video',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: '28:10',
        imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
        likesCount: 120,
        commentsCount: 34,
        repostsCount: 56,
      },
    ],
  },
];

export function getSubscribedFeeds() {
  if (typeof window === 'undefined') return PRESET_RSS_FEEDS.slice(0, 2);
  try {
    const raw = localStorage.getItem(RSS_FEEDS_KEY);
    if (!raw) return PRESET_RSS_FEEDS.slice(0, 2);
    return JSON.parse(raw);
  } catch {
    return PRESET_RSS_FEEDS.slice(0, 2);
  }
}

export function saveSubscribedFeeds(feeds) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RSS_FEEDS_KEY, JSON.stringify(feeds));
    window.dispatchEvent(new CustomEvent('shammah:rss-feeds-updated'));
  } catch (err) {
    console.error('Failed to save RSS feeds', err);
  }
}

export function addSubscribedFeed(feed) {
  const current = getSubscribedFeeds();
  const exists = current.some((f) => f.id === feed.id || f.feedUrl === feed.feedUrl);
  if (!exists) {
    const next = [feed, ...current];
    saveSubscribedFeeds(next);
    return next;
  }
  return current;
}

export function removeSubscribedFeed(feedId) {
  const current = getSubscribedFeeds();
  const next = current.filter((f) => f.id !== feedId);
  saveSubscribedFeeds(next);
  return next;
}

/**
 * Fetches community-wide RSS feeds from the real Supabase `rss_feeds` table.
 */
export async function fetchCommunityRssFeeds() {
  try {
    const { data, error } = await supabase
      .from('rss_feeds')
      .select('id, church_id, title, feed_url, keywords, category_id, is_active, created_by, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return getDeveloperBroadcastFeeds();
    }

    const mapped = data.map((row) => {
      const presetMatch = PRESET_RSS_FEEDS.find((p) => p.feedUrl === row.feed_url);
      return {
        id: presetMatch?.id || row.id,
        dbId: row.id,
        name: row.title,
        category: row.category_id || presetMatch?.category || 'resources',
        sourceName: presetMatch?.sourceName || row.title,
        sourceUrl: presetMatch?.sourceUrl || row.feed_url,
        feedUrl: row.feed_url,
        description: presetMatch?.description || `Active community RSS feed (${row.feed_url})`,
        icon: presetMatch?.icon || '🌐',
        mediaType: presetMatch?.mediaType || 'text',
        items: presetMatch?.items || [],
      };
    });

    if (typeof window !== 'undefined' && mapped.length > 0) {
      localStorage.setItem(RSS_BROADCAST_KEY, JSON.stringify(mapped));
    }
    return mapped;
  } catch {
    return getDeveloperBroadcastFeeds();
  }
}

// Developer-only: Broadcast RSS feed items into the community homefeed (backed by Supabase rss_feeds)
export function getDeveloperBroadcastFeeds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RSS_BROADCAST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeveloperBroadcastFeeds(feeds) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RSS_BROADCAST_KEY, JSON.stringify(feeds));
    window.dispatchEvent(new CustomEvent('shammah:rss-broadcast-updated'));
  } catch (err) {
    console.error('Failed to save broadcast feeds', err);
  }
}

export async function toggleDeveloperBroadcast(feed, shouldBroadcast, userId = null) {
  const current = getDeveloperBroadcastFeeds();
  let next;
  if (shouldBroadcast) {
    if (!current.some((f) => f.id === feed.id || f.feedUrl === feed.feedUrl)) {
      next = [...current, feed];
    } else {
      next = current;
    }
  } else {
    next = current.filter((f) => f.id !== feed.id && f.feedUrl !== feed.feedUrl);
  }
  saveDeveloperBroadcastFeeds(next);

  // Sync with real Supabase `rss_feeds` table
  try {
    let activeUserId = userId;
    if (!isValidUuid(activeUserId)) {
      const { data: sessionData } = await supabase.auth.getSession();
      activeUserId = sessionData?.session?.user?.id;
    }

    if (isValidUuid(activeUserId) && feed?.feedUrl) {
      if (shouldBroadcast) {
        await supabase.from('rss_feeds').insert({
          title: feed.name || feed.sourceName || 'Community RSS Feed',
          feed_url: feed.feedUrl,
          category_id: feed.category || 'resources',
          is_active: true,
          created_by: activeUserId,
        });
      } else {
        await supabase
          .from('rss_feeds')
          .delete()
          .eq('feed_url', feed.feedUrl)
          .eq('created_by', activeUserId);
      }
    }
  } catch (err) {
    console.warn('Could not sync RSS feed to Supabase rss_feeds:', err);
  }

  return next;
}

/**
 * Searches feeds by keyword or registers a custom RSS URL without fabricating fake articles
 */
export function searchFeedsByQuery(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return PRESET_RSS_FEEDS;

  // Check if it's a URL
  if (q.startsWith('http://') || q.startsWith('https://')) {
    let hostname = q;
    try {
      hostname = new URL(q).hostname;
    } catch {}
    return [
      {
        id: `custom-feed-${hostname}`,
        name: `RSS Feed (${hostname})`,
        category: 'resources',
        sourceName: hostname,
        sourceUrl: q,
        feedUrl: q,
        description: `External RSS feed URL (${q}). When added by an admin, new items are ingested into the feed via the server RSS cron job (/api/rss/fetch).`,
        icon: '🌐',
        mediaType: 'text',
        items: [],
      },
    ];
  }

  // Filter presets by keyword
  return PRESET_RSS_FEEDS.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.sourceName.toLowerCase().includes(q) ||
      f.items.some((it) => it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q))
  );
}

/**
 * Merges developer-broadcasted RSS feed items and user-subscribed RSS feed items
 * into the homefeed.
 */
export function getHomefeedPostsWithRss(posts = [], developerUser = null) {
  if (typeof window === 'undefined' || !Array.isArray(posts) || posts.length === 0) return posts;

  const broadcastFeeds = getDeveloperBroadcastFeeds();
  const subscribedFeeds = getSubscribedFeeds();

  const developerName =
    developerUser?.user_metadata?.display_name ||
    developerUser?.user_metadata?.name ||
    developerUser?.email?.split('@')[0] ||
    'Julius Thandi (App Developer)';

  const developerAvatar =
    developerUser?.user_metadata?.avatar_url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  // Build developer broadcasted posts
  const broadcastPosts = [];
  broadcastFeeds.forEach((feed) => {
    (feed.items || []).forEach((item, itemIdx) => {
      broadcastPosts.push({
        id: `rss-broadcast-${item.id || itemIdx}`,
        text_content: `${item.title}\n\n${item.description || ''}`,
        created_at: item.pubDate || new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        category_id: feed.category || 'lessons',
        media_url:
          item.imageUrl ||
          (item.mediaType === 'audio' ? item.audioUrl : null) ||
          (item.mediaType === 'video' ? item.videoUrl : null),
        media_type:
          item.mediaType === 'audio'
            ? 'audio'
            : item.mediaType === 'video'
            ? 'video'
            : item.imageUrl
            ? 'image'
            : 'text',
        rss_source: item.source || feed.sourceName || feed.name,
        rss_link: item.sourceUrl || feed.feedUrl,
        is_rss: true,
        is_developer_broadcast: true,
        profiles: {
          name: developerName,
          display_name: developerName,
          avatar_url: developerAvatar,
          badge: 'developer',
          badge_verified: true,
          role: 'developer',
        },
      });
    });
  });

  // Build user-subscribed RSS posts
  const userRssPosts = [];
  subscribedFeeds.forEach((feed) => {
    (feed.items || []).forEach((item, itemIdx) => {
      userRssPosts.push({
        id: `rss-sub-${item.id || itemIdx}`,
        text_content: `${item.title}\n\n${item.description || ''}`,
        created_at: item.pubDate || new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        category_id: feed.category || 'resources',
        media_url:
          item.imageUrl ||
          (item.mediaType === 'audio' ? item.audioUrl : null) ||
          (item.mediaType === 'video' ? item.videoUrl : null),
        media_type:
          item.mediaType === 'audio'
            ? 'audio'
            : item.mediaType === 'video'
            ? 'video'
            : item.imageUrl
            ? 'image'
            : 'text',
        rss_source: item.source || feed.sourceName || feed.name,
        rss_link: item.sourceUrl || feed.feedUrl,
        is_rss: true,
        profiles: {
          name: `${item.source || feed.sourceName || feed.name} (RSS)`,
          display_name: `${item.source || feed.sourceName || feed.name} (RSS)`,
          avatar_url: null,
          badge: 'partner',
          badge_verified: true,
          role: 'rss_source',
        },
      });
    });
  });

  if (broadcastPosts.length === 0 && userRssPosts.length === 0) {
    return posts;
  }

  const pinned = posts.filter((p) => p.is_pinned);
  const unpinned = posts.filter((p) => !p.is_pinned);

  const combined = [];
  let userRssIdx = 0;
  let broadcastIdx = 0;

  if (unpinned.length > 0) {
    combined.push(unpinned[0]);
  }

  while (broadcastIdx < broadcastPosts.length) {
    combined.push(broadcastPosts[broadcastIdx++]);
  }

  for (let i = 1; i < unpinned.length; i++) {
    combined.push(unpinned[i]);
    if (i % 2 === 0 && userRssIdx < userRssPosts.length) {
      combined.push(userRssPosts[userRssIdx++]);
    }
  }

  while (userRssIdx < userRssPosts.length) {
    combined.push(userRssPosts[userRssIdx++]);
  }

  return [...pinned, ...combined];
}
