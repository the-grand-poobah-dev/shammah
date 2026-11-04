import { supabase } from '../../lib/supabaseClient';

const PROMO_CACHE = new Map();
const PROMO_CACHE_MS = 60_000;

async function cached(key, loader) {
  const current = PROMO_CACHE.get(key);
  if (current && current.expiresAt > Date.now()) return current.value;
  const value = await loader();
  PROMO_CACHE.set(key, { value, expiresAt: Date.now() + PROMO_CACHE_MS });
  return value;
}

const KJV_VERSES = [
  { reference: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { reference: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { reference: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles.' },
  { reference: 'Matthew 5:16', text: 'Let your light so shine before men, that they may see your good works.' },
  { reference: 'John 15:5', text: 'I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit.' },
  { reference: 'Romans 12:12', text: 'Rejoicing in hope; patient in tribulation; continuing instant in prayer.' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { reference: 'Micah 6:8', text: 'What doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?' },
  { reference: '1 Corinthians 16:14', text: 'Let all your things be done with charity.' },
  { reference: 'Joshua 1:9', text: 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { reference: 'Psalm 119:105', text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { reference: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God.' },
  { reference: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { reference: 'Galatians 6:9', text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.' },
  { reference: 'Psalm 34:8', text: 'O taste and see that the LORD is good: blessed is the man that trusteth in him.' },
  { reference: 'Hebrews 11:1', text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { reference: '1 Peter 5:7', text: 'Casting all your care upon him; for he careth for you.' },
  { reference: 'John 8:12', text: 'I am the light of the world: he that followeth me shall not walk in darkness.' },
  { reference: 'Psalm 37:4', text: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.' },
  { reference: 'Colossians 3:23', text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.' },
  { reference: '2 Timothy 1:7', text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.' },
  { reference: 'Psalm 121:1-2', text: 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD.' },
  { reference: 'Ephesians 2:10', text: 'For we are his workmanship, created in Christ Jesus unto good works.' },
  { reference: 'James 1:5', text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally.' },
  { reference: 'John 14:27', text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you.' },
  { reference: 'Psalm 19:14', text: 'Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD.' },
  { reference: 'Romans 15:13', text: 'Now the God of hope fill you with all joy and peace in believing.' },
  { reference: '1 Thessalonians 5:16-18', text: 'Rejoice evermore. Pray without ceasing. In every thing give thanks.' },
  { reference: 'Psalm 133:1', text: 'Behold, how good and how pleasant it is for brethren to dwell together in unity!' },
];

function safeResult(result) {
  if (result?.error) return null;
  return result?.data ?? null;
}

export async function fetchPromoReels(limit = 8) {
  return cached('reels', async () => {
  try {
    const result = await supabase.from('posts')
      .select('id,text_content,media_url,created_at,profiles(display_name,avatar_url)')
      .eq('media_type', 'reel').not('media_url', 'is', null)
      .order('created_at', { ascending: false }).limit(limit);
    return safeResult(result) || [];
  } catch { return []; }
  });
}

export async function fetchFeaturedCourse() {
  try {
    const response = await fetch('/api/courses?action=list', { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json();
    const course = (result.courses || []).find(item => item.status === 'published') || result.courses?.[0];
    return course || null;
  } catch { return null; }
}

export async function fetchActiveFundraiser() {
  try {
    const result = await supabase.from('fundraisers')
      .select('id,title,description,goal_kes,raised_kes,status')
      .in('status', ['active', 'open']).order('created_at', { ascending: false }).limit(1);
    return safeResult(result)?.[0] || null;
  } catch { return null; }
}

export async function fetchActiveChallenge() {
  try {
    const result = await supabase.from('challenges')
      .select('id,title,description,starts_at,ends_at,status')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(1);
    return safeResult(result)?.[0] || null;
  } catch { return null; }
}

export async function fetchLiveNow() {
  try {
    const result = await supabase.from('live_streams')
      .select('id,title,host_id,status,started_at')
      .eq('status', 'live').order('started_at', { ascending: false }).limit(1);
    return safeResult(result)?.[0] || null;
  } catch { return null; }
}

export async function fetchFeaturedAudio() {
  try {
    const result = await supabase.from('media_items')
      .select('id,title,description,kind,media_url,thumb_url,created_at')
      .eq('kind', 'audio').eq('status', 'published')
      .order('published_at', { ascending: false }).limit(1);
    return safeResult(result)?.[0] || null;
  } catch { return null; }
}

export async function fetchDailyVerse() {
  try {
    const result = await supabase.from('verse_of_day')
      .select('ref,text,day')
      .order('day', { ascending: false }).limit(1);
    const row = safeResult(result)?.[0];
    if (row) return { reference: row.ref || '', text: row.text || '' };
  } catch { /* optional table: use the public-domain fallback */ }
  const day = Math.floor(Date.now() / 86400000);
  return KJV_VERSES[((day % KJV_VERSES.length) + KJV_VERSES.length) % KJV_VERSES.length];
}

export async function fetchTrendingPoll() {
  try {
    const result = await supabase.from('posts')
      .select('id,text_content,created_at')
      .eq('media_type', 'poll').order('created_at', { ascending: false }).limit(1);
    return safeResult(result)?.[0] || null;
  } catch { return null; }
}

export async function fetchArcadeDaily() {
  try {
    const result = await supabase.from('arcade_daily')
      .select('game_slug,day,seed')
      .order('day', { ascending: false }).limit(1);
    return safeResult(result)?.[0] || null;
  } catch { return null; }
}

export async function fetchPromoCandidates() {
  return cached('candidates', async () => {
  const types = [
    ['live', fetchLiveNow],
    ['course', fetchFeaturedCourse],
    ['fundraiser', fetchActiveFundraiser],
    ['challenge', fetchActiveChallenge],
    ['verse', fetchDailyVerse],
    ['audio', fetchFeaturedAudio],
    ['poll', fetchTrendingPoll],
    ['arcade', fetchArcadeDaily],
  ];
  const settled = await Promise.all(types.map(async ([type, fetcher]) => ({ type, data: await fetcher() })));
  return settled.filter(item => item.data);
  });
}

export async function recordPromoEvent({ promoType, promoId = null, eventType }) {
  try {
    await supabase.from('promo_events').insert({
      promo_type: promoType,
      promo_id: promoId ? String(promoId) : null,
      event_type: eventType,
    });
  } catch { /* promo analytics must never block the feed */ }
}

export function rankPromoCandidates(candidates, dismissed = [], seen = []) {
  return [...(candidates || [])]
    .filter(item => !dismissed.includes(item.type))
    .sort((a, b) => {
      const aScore = (seen.includes(a.type) ? 0 : 3) + (a.type === 'live' ? 2 : 0);
      const bScore = (seen.includes(b.type) ? 0 : 3) + (b.type === 'live' ? 2 : 0);
      return bScore - aScore;
    });
}
