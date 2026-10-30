import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Category alias map so UI chips ("Sermons", "Teaching", "Kids & Family", "Youth & Gen-Z", "Testimonies")
// match both exact category names and seeded category names ("Sermon", "Theology", "Leadership", "Family", "Youth", "Missions").
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

// Seeded catalog mirroring supabase/seed_media.sql for seamless recovery if RLS grant 42501 is pending
const SEEDED_SERIES = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    title: 'Walking in Supernatural Faith',
    description: 'A transformative 6-part video sermon series unlocking victory, resilience, and spiritual depth in modern East Africa.',
    cover_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
    kind: 'video',
    accent: '#06b6d4',
    episodes: [{ count: 6 }],
  },
  {
    id: 'a2000000-0000-0000-0000-000000000002',
    title: 'Morning Manna: Daily Devotional Audio',
    description: 'Short 15-minute Scripture expositions and guided prayer sessions to anchor your day in the presence of God.',
    cover_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
    kind: 'audio',
    accent: '#8b5cf6',
    episodes: [{ count: 5 }],
  },
];

const SEEDED_MEDIA_ITEMS = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    kind: 'video',
    series_id: 'a1000000-0000-0000-0000-000000000001',
    episode_no: 1,
    title: 'The Unshakeable Covenant: Walking by Faith',
    description: 'Part 1: Exploring Abrahamic faith and how God honors persistent trust in the face of impossible circumstances.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2895,
    category: 'Theology',
    tags: ['faith', 'covenant', 'abraham', 'nairobi'],
    visibility: 'public',
    status: 'published',
    accent: '#06b6d4',
    view_count: 1420,
    like_count: 184,
    save_count: 52,
    published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    kind: 'video',
    series_id: 'a1000000-0000-0000-0000-000000000001',
    episode_no: 2,
    title: 'Overcoming the Giants: David in the Valley',
    description: 'Part 2: Practical spiritual weapons for facing anxiety, job loss, and sudden crises with holy courage.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2410,
    category: 'Sermon',
    tags: ['david', 'courage', 'victory', 'overcoming'],
    visibility: 'public',
    status: 'published',
    accent: '#10b981',
    view_count: 980,
    like_count: 142,
    save_count: 38,
    published_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    kind: 'video',
    title: 'Night of Miracles & Worship Live',
    description: 'Full worship service recorded live at Nairobi Worship Center featuring spontaneous praises and intercessory prayer.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 3780,
    category: 'Worship',
    tags: ['worship', 'live', 'praise', 'miracles'],
    visibility: 'public',
    status: 'published',
    accent: '#ec4899',
    view_count: 3240,
    like_count: 412,
    save_count: 129,
    published_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    kind: 'video',
    title: 'Youth Alive Conference: Purity in Babylon',
    description: 'A frank and empowering session for college students and young professionals on standing firm in culture.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2150,
    category: 'Youth',
    tags: ['youth', 'holiness', 'campus', 'kenya'],
    visibility: 'public',
    status: 'published',
    accent: '#f59e0b',
    view_count: 1890,
    like_count: 270,
    save_count: 64,
    published_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    kind: 'video',
    title: 'Kingdom Business Ethics & Wealth Creation',
    description: 'How Christian entrepreneurs can build clean, thriving enterprises while serving their community and glorifying God.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2760,
    category: 'Leadership',
    tags: ['business', 'integrity', 'finances', 'stewardship'],
    visibility: 'public',
    status: 'published',
    accent: '#0ea5e9',
    view_count: 1120,
    like_count: 95,
    save_count: 41,
    published_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    kind: 'video',
    title: 'The Mystery of the Secret Place: Psalm 91',
    description: 'Dwelling under the shadow of the Almighty during times of national distress and uncertainty.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2520,
    category: 'Prayer',
    tags: ['psalm91', 'protection', 'prayer', 'shelter'],
    visibility: 'public',
    status: 'published',
    accent: '#8b5cf6',
    view_count: 2100,
    like_count: 310,
    save_count: 88,
    published_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000007',
    kind: 'video',
    title: 'Building Christ-Centered Marriages',
    description: 'Biblical communication, conflict resolution, and mutual honor in modern African marriages.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 3120,
    category: 'Family',
    tags: ['marriage', 'family', 'counseling', 'love'],
    visibility: 'public',
    status: 'published',
    accent: '#be123c',
    view_count: 1650,
    like_count: 215,
    save_count: 76,
    published_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000008',
    kind: 'video',
    title: 'Turkana Outreach & Borehole Commissioning',
    description: 'A documentary recap of the medical camp and clean water initiative completed by Shammah community churches.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 1440,
    category: 'Missions',
    tags: ['missions', 'turkana', 'water', 'compassion'],
    visibility: 'public',
    status: 'published',
    accent: '#0d9488',
    view_count: 2890,
    like_count: 430,
    save_count: 110,
    published_at: new Date(Date.now() - 86400000 * 16).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000009',
    kind: 'video',
    title: 'Holy Spirit: The Comforter and Guide',
    description: 'Understanding the baptism, spiritual gifts, and daily sensitivity to the promptings of the Holy Spirit.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2700,
    category: 'Theology',
    tags: ['holyspirit', 'guidance', 'pentecost'],
    visibility: 'public',
    status: 'published',
    accent: '#f97316',
    view_count: 1340,
    like_count: 178,
    save_count: 49,
    published_at: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000010',
    kind: 'video',
    title: 'Generational Blessings: Breaking Negative Cycles',
    description: 'Releasing the blessing of the Lord across parents, children, and grandchildren through biblical declarations.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2940,
    category: 'Sermon',
    tags: ['blessings', 'lineage', 'deliverance', 'prayer'],
    visibility: 'public',
    status: 'published',
    accent: '#06b6d4',
    view_count: 1780,
    like_count: 220,
    save_count: 63,
    published_at: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000011',
    kind: 'video',
    title: 'Worship in the African Context: Cultural Expressions',
    description: 'Exploring African rhythms, instrumentation, and languages honoring God without syncretism.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 1980,
    category: 'Worship',
    tags: ['africanworship', 'swahili', 'indigenous', 'praise'],
    visibility: 'public',
    status: 'published',
    accent: '#10b981',
    view_count: 2450,
    like_count: 380,
    save_count: 94,
    published_at: new Date(Date.now() - 86400000 * 22).toISOString(),
  },
  {
    id: 'b1000000-0000-0000-0000-000000000012',
    kind: 'video',
    title: 'Endurance: Running the Race with Joy',
    description: 'Hebrews 12 exposition on stripping away every weight and fixing our eyes on Jesus.',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    thumb_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2610,
    category: 'Theology',
    tags: ['hebrews', 'perseverance', 'race', 'discipleship'],
    visibility: 'public',
    status: 'published',
    accent: '#8b5cf6',
    view_count: 1620,
    like_count: 190,
    save_count: 57,
    published_at: new Date(Date.now() - 86400000 * 24).toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    kind: 'audio',
    series_id: 'a2000000-0000-0000-0000-000000000002',
    episode_no: 1,
    title: 'Day 1: Finding Peace in the Secret Place',
    description: 'Morning devotion on Psalm 23. Starting your day conscious of the Shepherd who leads beside still waters.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg',
    thumb_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 900,
    category: 'Prayer',
    tags: ['devotion', 'morning', 'psalm23', 'peace'],
    visibility: 'public',
    status: 'published',
    accent: '#8b5cf6',
    view_count: 840,
    like_count: 120,
    save_count: 35,
    published_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    kind: 'audio',
    series_id: 'a2000000-0000-0000-0000-000000000002',
    episode_no: 2,
    title: 'Day 2: Guarding the Gate of Your Mind',
    description: 'Meditating on Philippians 4:8 and replacing negative thoughts with pure, noble, and praiseworthy truth.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    thumb_url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 850,
    category: 'Prayer',
    tags: ['devotion', 'mindset', 'philippians4'],
    visibility: 'public',
    status: 'published',
    accent: '#06b6d4',
    view_count: 620,
    like_count: 88,
    save_count: 27,
    published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    kind: 'audio',
    title: 'Sermon Audio: The Anointing that Breaks Every Yoke',
    description: 'An in-depth audio sermon from Sunday service on Isaiah 10:27 and spiritual freedom in Christ.',
    media_url: 'https://actions.google.com/sounds/v1/weather/thunderstorm.ogg',
    thumb_url: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2820,
    category: 'Sermon',
    tags: ['sermon', 'freedom', 'anointing', 'isaiah'],
    visibility: 'public',
    status: 'published',
    accent: '#10b981',
    view_count: 1420,
    like_count: 215,
    save_count: 72,
    published_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    kind: 'audio',
    title: 'Faith & Work Podcast: Navigating Nairobi Corporate Life',
    description: 'Panel discussion on ethics, office politics, staying faithful to your spouse, and shining as light at work.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    thumb_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2400,
    category: 'Leadership',
    tags: ['corporate', 'workplace', 'marketplace', 'ethics'],
    visibility: 'public',
    status: 'published',
    accent: '#f59e0b',
    view_count: 1980,
    like_count: 280,
    save_count: 89,
    published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    kind: 'audio',
    title: 'Soaking Worship & Prophetic Strings Vol. 1',
    description: '45 minutes of instrumental keyboard and acoustic strings recorded for private prayer, study, and meditation.',
    media_url: 'https://actions.google.com/sounds/v1/ambiences/forest_day.ogg',
    thumb_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
    duration_seconds: 2700,
    category: 'Worship',
    tags: ['instrumental', 'soaking', 'meditation', 'strings'],
    visibility: 'public',
    status: 'published',
    accent: '#ec4899',
    view_count: 3450,
    like_count: 520,
    save_count: 180,
    published_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const SEEDED_REELS = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    category_id: 'prayer',
    text_content: 'Never cease praying! When the enemy whispers you are defeated, declare: "No weapon formed against me shall prosper!" 🔥🙌 #PrayerWarrior #Faith',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    media_type: 'reel',
    sound_title: 'Grace & Power · Pastor David Mwangi',
    view_count: 840,
    like_count: 124,
    comment_count: 18,
    duration_seconds: 48,
    visibility: 'public',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'd1000000-0000-0000-0000-000000000002',
    category_id: 'worship',
    text_content: 'Live acoustic praise from morning fellowship: "You are the God who does wonders!" Drop an Amen if your soul is blessed today. 🎶🙏 #Praise #Worship',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    media_type: 'reel',
    sound_title: 'Morning Acoustic Praise · Sister Mary Grace',
    view_count: 1280,
    like_count: 210,
    comment_count: 34,
    duration_seconds: 58,
    visibility: 'public',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'd1000000-0000-0000-0000-000000000003',
    category_id: 'stories',
    text_content: 'Healed of chronic pain after 3 years! Testifying that Jesus Christ is the same yesterday, today and forever. 🌟✨ #Testimony #Miracle',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    media_type: 'reel',
    sound_title: 'Original Testimony Sound · Shammah Youth',
    view_count: 940,
    like_count: 178,
    comment_count: 22,
    duration_seconds: 42,
    visibility: 'public',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'd1000000-0000-0000-0000-000000000004',
    category_id: 'teen',
    text_content: 'Gen-Z Campus fellowship worshipping in one accord at University of Nairobi! Revival is here. ⚡🔥 #YouthRevival #GenZFaith',
    media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    media_type: 'reel',
    sound_title: 'Campus Worship Sound · UoN Christian Union',
    view_count: 2450,
    like_count: 385,
    comment_count: 56,
    duration_seconds: 52,
    visibility: 'public',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveDefaultAuthorAndChurch(supabase) {
  let author = {
    id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Shammah Ministry',
    avatar_url: null,
    role: 'member',
    badge: 'pastor',
    badge_verified: true,
  };
  let church = null;

  if (!supabase) return { author, church };

  try {
    const [profRes, churchRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role, badge, badge_verified')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('churches')
        .select('id, name, logo_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (profRes?.data) author = profRes.data;
    if (churchRes?.data) church = churchRes.data;
  } catch {}

  return { author, church };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const kind = searchParams.get('kind') || undefined;
    const category = searchParams.get('category') || undefined;
    const query = (searchParams.get('query') || '').trim();
    const sort = searchParams.get('sort') || 'recent';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const itemId = searchParams.get('id') || undefined;

    const supabase = getSupabaseServerClient();

    // 1. Handle 'series'
    if (action === 'series') {
      if (supabase) {
        let sq = supabase
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
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (kind) sq = sq.eq('kind', kind);
        const { data: sData, error: sErr } = await sq;
        if (!sErr && sData && sData.length > 0) {
          return NextResponse.json({
            data: sData.map((s) => ({ ...s, episodes: s.episodes || [{ count: 6 }] })),
            error: null,
          });
        }
      }

      const { author } = await resolveDefaultAuthorAndChurch(supabase);
      const filteredSeries = SEEDED_SERIES
        .filter((s) => !kind || s.kind === kind)
        .map((s) => ({ ...s, owner: author }));
      return NextResponse.json({ data: filteredSeries, error: null });
    }

    // 2. Handle 'reels'
    if (action === 'reels') {
      if (supabase) {
        const { data: rData, error: rErr } = await supabase
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
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!rErr && rData && rData.length > 0) {
          return NextResponse.json({ data: rData, count: rData.length, error: null });
        }
      }

      const { author, church } = await resolveDefaultAuthorAndChurch(supabase);
      const seededReels = SEEDED_REELS.slice(offset, offset + limit).map((r) => ({
        ...r,
        author_id: author.id,
        church_id: church?.id || null,
        profiles: author,
      }));
      return NextResponse.json({ data: seededReels, count: seededReels.length, error: null });
    }

    // 3. Handle single item 'get'
    if (action === 'get' && itemId) {
      if (supabase) {
        const { data: itemData, error: itemErr } = await supabase
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
          .eq('id', itemId)
          .maybeSingle();

        if (!itemErr && itemData) {
          return NextResponse.json({
            data: { ...itemData, is_liked: false, is_saved: false, watch_progress: null },
            error: null,
          });
        }
      }

      const { author, church } = await resolveDefaultAuthorAndChurch(supabase);
      const found = SEEDED_MEDIA_ITEMS.find((m) => m.id === itemId);
      if (found) {
        const seriesObj = SEEDED_SERIES.find((s) => s.id === found.series_id) || null;
        return NextResponse.json({
          data: {
            ...found,
            author_id: author.id,
            author,
            church,
            series: seriesObj,
            is_liked: false,
            is_saved: false,
            watch_progress: null,
          },
          error: null,
        });
      }
      return NextResponse.json({ data: null, error: { message: 'Media item not found.' } }, { status: 404 });
    }

    // 4. Handle 'list' and 'trending'
    if (supabase) {
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
        .eq('status', 'published')
        .eq('visibility', 'public');

      if (kind) q = q.eq('kind', kind);

      const cats = expandCategories(category);
      if (cats && cats.length > 0) {
        q = q.in('category', cats);
      }

      if (query) {
        q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (action === 'trending' || sort === 'trending' || sort === 'views') {
        q = q.order('view_count', { ascending: false }).order('like_count', { ascending: false }).order('published_at', { ascending: false });
      } else if (sort === 'likes') {
        q = q.order('like_count', { ascending: false }).order('published_at', { ascending: false });
      } else if (sort === 'duration') {
        q = q.order('duration_seconds', { ascending: false });
      } else {
        q = q.order('published_at', { ascending: false });
      }

      q = q.range(offset, offset + limit - 1);

      const { data, count, error } = await q;
      if (!error && data && data.length > 0) {
        return NextResponse.json({ data, count: count ?? data.length, error: null });
      }
    }

    // Fallback to seeded catalog hydrated with real author/church profile from Supabase
    const { author, church } = await resolveDefaultAuthorAndChurch(supabase);
    let items = SEEDED_MEDIA_ITEMS.map((item) => ({
      ...item,
      author_id: author.id,
      church_id: church?.id || null,
      author,
      church,
      series: SEEDED_SERIES.find((s) => s.id === item.series_id) || null,
    }));

    if (kind) {
      items = items.filter((i) => i.kind === kind);
    }

    const cats = expandCategories(category);
    if (cats && cats.length > 0) {
      items = items.filter((i) => cats.includes(i.category));
    }

    if (query) {
      const lq = query.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(lq) ||
          (i.description && i.description.toLowerCase().includes(lq)) ||
          (Array.isArray(i.tags) && i.tags.some((t) => t.toLowerCase().includes(lq)))
      );
    }

    if (action === 'trending' || sort === 'trending' || sort === 'views') {
      items.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (sort === 'likes') {
      items.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    } else if (sort === 'duration') {
      items.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    } else {
      items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    }

    const total = items.length;
    const paged = items.slice(offset, offset + limit);

    return NextResponse.json({ data: paged, count: total, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: [], count: 0, error: { message: err?.message || 'Internal media server error' } },
      { status: 500 }
    );
  }
}
