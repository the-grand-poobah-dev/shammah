import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const DEFAULT_PLANS = [
  {
    id: 'bible-year',
    title: 'Bible in a Year',
    description: 'Read through the entire canon of Scripture in 365 days with balanced Old and New Testament portions.',
    days: 365,
    kind: 'chronological',
    accent: '#eab308',
  },
  {
    id: 'nt-90',
    title: 'New Testament in 90 Days',
    description: 'Journey through the life of Jesus, Acts of the Apostles, and Apostolic Epistles in one quarter.',
    days: 90,
    kind: 'testament',
    accent: '#06b6d4',
  },
  {
    id: 'psalms-proverbs',
    title: 'Psalms and Proverbs',
    description: 'Daily devotional wisdom and worship from Israel’s hymnal and Solomon’s proverbs.',
    days: 60,
    kind: 'wisdom',
    accent: '#10b981',
  },
  {
    id: 'gospels-30',
    title: 'Gospels in 30 Days',
    description: 'Walk with Christ through Matthew, Mark, Luke, and John and witness His ministry, miracles, and resurrection.',
    days: 30,
    kind: 'thematic',
    accent: '#ec4899',
  },
  {
    id: 'advent-hope',
    title: 'Advent & Prophecy',
    description: 'Messianic prophecies fulfilled in Jesus Christ, from Isaiah to Bethlehem to the throne of God.',
    days: 25,
    kind: 'seasonal',
    accent: '#8b5cf6',
  },
  {
    id: 'prayer-power',
    title: 'Power of Biblical Prayer',
    description: 'Study the transformative prayers of Abraham, Moses, David, Elijah, Paul, and Jesus Himself.',
    days: 21,
    kind: 'devotional',
    accent: '#f97316',
  },
];

const DEFAULT_PLAN_DAYS = {
  'bible-year': [
    { day: 1, refs: [{ book: 'Genesis', chapter: 1 }, { book: 'Matthew', chapter: 1 }] },
    { day: 2, refs: [{ book: 'Genesis', chapter: 2 }, { book: 'Matthew', chapter: 2 }] },
    { day: 3, refs: [{ book: 'Genesis', chapter: 3 }, { book: 'Matthew', chapter: 3 }] },
  ],
  'nt-90': [
    { day: 1, refs: [{ book: 'Matthew', chapter: 1 }, { book: 'Matthew', chapter: 2 }] },
    { day: 2, refs: [{ book: 'Matthew', chapter: 3 }, { book: 'Matthew', chapter: 4 }] },
  ],
  'psalms-proverbs': [
    { day: 1, refs: [{ book: 'Psalms', chapter: 1 }, { book: 'Proverbs', chapter: 1 }] },
    { day: 2, refs: [{ book: 'Psalms', chapter: 23 }, { book: 'Proverbs', chapter: 3 }] },
    { day: 3, refs: [{ book: 'Psalms', chapter: 91 }, { book: 'Proverbs', chapter: 4 }] },
  ],
  'gospels-30': [
    { day: 1, refs: [{ book: 'John', chapter: 1 }] },
    { day: 2, refs: [{ book: 'John', chapter: 2 }, { book: 'John', chapter: 3 }] },
    { day: 3, refs: [{ book: 'John', chapter: 4 }] },
  ],
  'advent-hope': [
    { day: 1, refs: [{ book: 'Isaiah', chapter: 9 }, { book: 'Isaiah', chapter: 11 }] },
    { day: 2, refs: [{ book: 'Micah', chapter: 5 }, { book: 'Luke', chapter: 1 }] },
  ],
  'prayer-power': [
    { day: 1, refs: [{ book: 'Matthew', chapter: 6 }] },
    { day: 2, refs: [{ book: 'Philippians', chapter: 4 }] },
    { day: 3, refs: [{ book: 'Ephesians', chapter: 3 }] },
  ],
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const supabase = getServerSupabase();

    let plans = DEFAULT_PLANS;
    let daysMap = { ...DEFAULT_PLAN_DAYS };
    let userProgress = {};

    if (supabase) {
      try {
        const { data: dbPlans } = await supabase.from('reading_plans').select('*');
        if (dbPlans && dbPlans.length > 0) {
          plans = dbPlans;
        }

        const { data: dbDays } = await supabase.from('reading_plan_days').select('*');
        if (dbDays && dbDays.length > 0) {
          dbDays.forEach((d) => {
            if (!daysMap[d.plan_id]) daysMap[d.plan_id] = [];
            daysMap[d.plan_id].push({ day: d.day, refs: d.refs });
          });
        }

        if (userId) {
          const { data: progressData } = await supabase
            .from('reading_plan_progress')
            .select('plan_id, day, completed_on')
            .eq('user_id', userId);

          if (progressData) {
            progressData.forEach((p) => {
              if (!userProgress[p.plan_id]) userProgress[p.plan_id] = [];
              userProgress[p.plan_id].push(p.day);
            });
          }
        }
      } catch (dbErr) {
        console.warn('DB reading plans query fallback:', dbErr?.message);
      }
    }

    return NextResponse.json({
      plans,
      daysMap,
      userProgress,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, planId, day, completed } = body;

    if (!planId || !day) {
      return NextResponse.json({ error: 'Missing planId or day' }, { status: 400 });
    }

    const supabase = getServerSupabase();
    if (supabase && userId) {
      try {
        if (completed) {
          await supabase.from('reading_plan_progress').upsert({
            user_id: userId,
            plan_id: planId,
            day,
            completed_on: new Date().toISOString(),
          });
        } else {
          await supabase
            .from('reading_plan_progress')
            .delete()
            .eq('user_id', userId)
            .eq('plan_id', planId)
            .eq('day', day);
        }
      } catch (dbErr) {
        console.warn('DB plan progress update skipped:', dbErr?.message);
      }
    }

    return NextResponse.json({ ok: true, planId, day, completed: Boolean(completed) });
  } catch (err) {
    return NextResponse.json({ error: err?.message }, { status: 400 });
  }
}
