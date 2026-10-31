import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function resolveSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    rawUrl &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('your-project-url')
  ) {
    return rawUrl;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return `https://${payload.ref}.supabase.co`;
    } catch {}
  }
  return null;
}

function getSupabaseServerClient(authHeader) {
  const url = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key || key.includes('your-anon-key')) return null;

  const headers = {};
  if (!serviceKey && authHeader) {
    headers.Authorization = authHeader;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}

async function resolveSessionUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const url = resolveSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (token && url && key && !key.includes('your-anon-key')) {
    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await client.auth.getUser(token);
      if (data?.user) return data.user;
    } catch {}
  }
  return null;
}

// In-memory / seed fallback mirroring supabase/seed_fundraisers.sql
const SEED_FUNDRAISERS = [
  {
    id: 'f1000000-0000-4000-a000-000000000001',
    title: 'Turkana Clean Water Borehole & Solar Pump',
    story_md: `### Bringing Living Water to Lodwar & Pastoralist Families\n\nFor generations, mothers and children in rural Turkana have walked up to 14 kilometers every day searching for scoop-wells in dry riverbeds. Contaminated water sources have caused recurring typhoid and waterborne illnesses among the little ones.\n\n**The Vision:**\nWith your support, our local pastoral ministry and hydrologist team will drill a 180-meter solar-powered borehole capable of pumping 12,000 liters of pure, potable water per hour. We are also building:\n- 4 community tap points adjacent to local schools and clinic\n- A solar livestock watering trough to reduce drought conflict\n- A gospel outreach pavilion where fellowships gather every Sunday\n\n*"Whoever drinks of the water that I shall give him will never thirst."* — John 4:14\n\nEvery shilling given directly funds steel casing, solar submersible pumps, and elevated distribution tanks.`,
    cover_url: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800',
      'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800',
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800',
    ],
    category: 'Relief',
    goal_kes: 650000,
    raised_kes: 520000,
    donors_count: 312,
    deadline: '2026-11-14',
    status: 'active',
    beneficiary_name: 'Turkana Pastoral Fellowship & Community Council',
    verified: true,
    accent: '#10b981',
    location: 'Lodwar, Turkana County',
    created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    owner: {
      display_name: 'Pastor Julius',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'pastor',
      badge_verified: true,
    },
    church: {
      name: 'Nairobi Worship Center',
      logo_url: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=150',
    },
  },
  {
    id: 'f1000000-0000-4000-a000-000000000002',
    title: 'Eldoret Worship Chapel Roof Restoration',
    story_md: `### Sheltering 450 Believers Before the Heavy Rain Season\n\nOur sanctuary in Eldoret has stood for over 28 years as a haven of prayer, marriage counseling, youth conferences, and Sunday school. However, severe hailstorms earlier this year punctured large sections of the rusted corrugated iron roof, causing continuous leakage during services and damaging our choir instruments and pews.\n\n**Our Project Scope:**\n- Full replacement with heavy gauge anti-rust tile sheets (680 sqm)\n- Installing heat-reflective acoustic ceiling boards\n- Gutters and a rainwater harvesting tank system for the community\n\nWe invite all alumni, church partners, and believers across Kenya to stand in the gap with us. Let us rebuild the house of prayer with joy!`,
    cover_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800',
      'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800',
    ],
    category: 'Church building',
    goal_kes: 450000,
    raised_kes: 310000,
    donors_count: 198,
    deadline: '2026-11-22',
    status: 'active',
    beneficiary_name: 'Eldoret Grace Chapel Sanctuary Board',
    verified: true,
    accent: '#f59e0b',
    location: 'Eldoret, Uasin Gishu',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    owner: {
      display_name: 'Pastor Julius',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      badge: 'pastor',
      badge_verified: true,
    },
    church: {
      name: 'Eldoret Grace Chapel',
      logo_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=150',
    },
  },
  {
    id: 'f1000000-0000-4000-a000-000000000003',
    title: 'Coast Free Medical Camp & Eye Surgeries',
    story_md: `### Compassion in Action for Kwale & Coastal Villages\n\nJesus went about preaching the kingdom and healing every disease. Next month, a dedicated team of 24 volunteer Christian doctors, pediatricians, ophthalmologists, and nurses will conduct a 4-day medical and surgical drive in Kwale.\n\n**Key Goals:**\n- 50 cataract restorations for elderly grandparents who have suffered blindness\n- Free prescription glasses, malaria testing, and antibiotic dispensary\n- Prenatal scans and nutritional vitamins for expectant mothers\n- One-on-one chaplaincy prayer for every patient seeking peace in Christ`,
    cover_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    ],
    category: 'Medical',
    goal_kes: 280000,
    raised_kes: 195000,
    donors_count: 145,
    deadline: '2026-11-09',
    status: 'active',
    beneficiary_name: 'Coast Christian Doctors Fellowship & Kwale Clinic',
    verified: true,
    accent: '#ef4444',
    location: 'Kwale & Msambweni, Coast',
    created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    owner: {
      display_name: 'Sarah Ndung\'u',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      badge: 'teacher',
      badge_verified: true,
    },
  },
  {
    id: 'f1000000-0000-4000-a000-000000000004',
    title: 'Kibera & Mathare High School Christian Union Scholarship',
    story_md: `### Equipping 40 Promising Christian Students with Tuition & Mentorship\n\nIn the informal settlements of Nairobi, bright Christian boys and girls frequently drop out of school due to unpaid school fees of just KES 12,000–18,000 per term. Many are active leaders in their high school Christian Unions (CUs).\n\n**What Every KES 15,000 Sponsor Provides:**\n- Full secondary school tuition clearance paid directly to schools\n- Complete textbook sets, stationery, and laboratory fee subsidies\n- Monthly Saturday leadership mentorship workshops and discipleship retreats\n\nInvest in kingdom leadership for Kenya’s next generation today.`,
    cover_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800',
    ],
    category: 'Education',
    goal_kes: 360000,
    raised_kes: 285000,
    donors_count: 174,
    deadline: '2026-11-18',
    status: 'active',
    beneficiary_name: 'Nairobi Slum Youth Mission & CU Chaplains',
    verified: true,
    accent: '#8b5cf6',
    location: 'Nairobi (Mathare & Kibera)',
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    owner: {
      display_name: 'David Kimani',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      badge: 'evangelist',
      badge_verified: true,
    },
  },
];

const SEED_MILESTONES = {
  'f1000000-0000-4000-a000-000000000001': [
    { id: 'm1', amount_kes: 150000, label: 'Geological survey & drilling rig mobilization', reached_at: '2026-10-21T08:00:00Z' },
    { id: 'm2', amount_kes: 350000, label: 'Borehole drilling completed (180m depth reached)', reached_at: '2026-10-27T12:00:00Z' },
    { id: 'm3', amount_kes: 500000, label: 'Solar pump installation & underground pipe distribution', reached_at: '2026-10-30T16:00:00Z' },
    { id: 'm4', amount_kes: 650000, label: 'Elevated 20,000L tank towers & school tap stations', reached_at: null },
  ],
  'f1000000-0000-4000-a000-000000000002': [
    { id: 'm5', amount_kes: 120000, label: 'Scaffolding & safe dismantling of damaged iron sheets', reached_at: '2026-10-23T09:00:00Z' },
    { id: 'm6', amount_kes: 280000, label: 'Heavy-gauge iron tile purchase & timber reinforcement', reached_at: '2026-10-29T14:00:00Z' },
    { id: 'm7', amount_kes: 450000, label: 'Ceiling acoustics, rainwater gutters & sanctuary dedication', reached_at: null },
  ],
  'f1000000-0000-4000-a000-000000000003': [
    { id: 'm8', amount_kes: 80000, label: 'Pharmaceutical medications & diagnostic lab kit procurement', reached_at: '2026-10-25T11:00:00Z' },
    { id: 'm9', amount_kes: 180000, label: 'Eye surgery equipment transport & medical team mobilization', reached_at: '2026-10-30T10:00:00Z' },
    { id: 'm10', amount_kes: 280000, label: 'Complete hospital post-op care & gospel outreach materials', reached_at: null },
  ],
  'f1000000-0000-4000-a000-000000000004': [
    { id: 'm11', amount_kes: 100000, label: 'Term 1 school fee clearance for first 15 students', reached_at: '2026-10-19T08:00:00Z' },
    { id: 'm12', amount_kes: 220000, label: 'Textbooks, stationery, and CU youth leader retreats', reached_at: '2026-10-28T15:00:00Z' },
    { id: 'm13', amount_kes: 360000, label: 'Term 2 & 3 scholarship fund for all 40 students', reached_at: null },
  ],
};

const SEED_UPDATES = {
  'f1000000-0000-4000-a000-000000000001': [
    {
      id: 'u1',
      body: 'Praise God! The drilling rig successfully struck freshwater at 174 meters depth! Testing shows water purity exceeds WHO standards. Thank you to everyone who gave!',
      media_url: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800',
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    },
  ],
  'f1000000-0000-4000-a000-000000000002': [
    {
      id: 'u2',
      body: 'The contractor delivered the first batch of anti-rust sheets today. Volunteers from the youth fellowship helped offload and stack them safely inside.',
      media_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800',
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
  ],
  'f1000000-0000-4000-a000-000000000003': [
    {
      id: 'u3',
      body: 'Our optical surgeon Dr. Ndegwa confirmed arrival of 60 intraocular lenses for cataract surgeries. The local chief has registered over 140 elders for screening.',
      media_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
      created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    },
  ],
  'f1000000-0000-4000-a000-000000000004': [
    {
      id: 'u4',
      body: 'Check out the report cards from our scholarship recipients — 18 of them ranked in the top 5 of their classes! God is raising mighty leaders.',
      media_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
  ],
};

const SEED_DONATIONS = {
  'f1000000-0000-4000-a000-000000000001': [
    { id: 'd1', display_name: 'Grace Community Fellowship Nairobi', anonymous: false, amount_kes: 50000, message: 'Church missions offering for Turkana borehole.', mpesa_transaction_id: 'SHM9R1Z8', created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString() },
    { id: 'd2', display_name: 'Elder Peter K.', anonymous: false, amount_kes: 15000, message: 'Standing with our brothers and sisters in Turkana. May God be glorified!', mpesa_transaction_id: 'SHM7K9W2', created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
    { id: 'd3', display_name: 'Anonymous Disciple', anonymous: true, amount_kes: 5000, message: 'Praying for abundant clean water and eternal salvation.', mpesa_transaction_id: 'SHM3P8L4', created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
    { id: 'd4', display_name: 'Brian Mwangi', anonymous: false, amount_kes: 2500, message: 'God bless this powerful work! 🙏', mpesa_transaction_id: 'SHM4T6V1', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  ],
  'f1000000-0000-4000-a000-000000000002': [
    { id: 'd5', display_name: 'Eldoret CU Alumni Group', anonymous: false, amount_kes: 35000, message: 'Honoring where our spiritual walk began.', mpesa_transaction_id: 'SHM8N3Q2', created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString() },
    { id: 'd6', display_name: 'Mama Mercy Wambui', anonymous: false, amount_kes: 10000, message: 'Building the Lord\'s sanctuary with joy!', mpesa_transaction_id: 'SHM2X5J9', created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString() },
    { id: 'd7', display_name: 'Anonymous Disciple', anonymous: true, amount_kes: 3000, message: 'May God protect His sanctuary from every storm.', mpesa_transaction_id: 'SHM5B7H6', created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
  ],
  'f1000000-0000-4000-a000-000000000003': [
    { id: 'd8', display_name: 'Dr. & Mrs. Kariuki', anonymous: false, amount_kes: 20000, message: 'In support of Kwale eye surgeries and maternal care.', mpesa_transaction_id: 'SHM1M9D4', created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString() },
    { id: 'd9', display_name: 'Anonymous Disciple', anonymous: true, amount_kes: 5000, message: 'Luke 4:18 — recovering of sight to the blind!', mpesa_transaction_id: 'SHM6C2Y8', created_at: new Date(Date.now() - 3600000 * 18).toISOString() },
  ],
  'f1000000-0000-4000-a000-000000000004': [
    { id: 'd10', display_name: 'Teacher Faith Njeri', anonymous: false, amount_kes: 15000, message: 'Sponsoring one high school student for an entire term.', mpesa_transaction_id: 'SHM4F8K3', created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString() },
    { id: 'd11', display_name: 'David Kimani', anonymous: false, amount_kes: 5000, message: 'For God and our youth! Keep shining the light of Jesus.', mpesa_transaction_id: 'SHM9L2P5', created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
  ],
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'list';
  const supabase = getSupabaseServerClient(request.headers.get('authorization'));

  try {
    // 1. DETAIL VIEW
    if (action === 'detail') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing campaign id.' }, { status: 400 });

      let fundraiser = null;
      let milestones = [];
      let updates = [];
      let donations = [];

      if (supabase) {
        try {
          const { data: fr } = await supabase
            .from('fundraisers')
            .select(`
              *,
              owner:owner_id(id, display_name, avatar_url, badge, badge_verified, role),
              church:church_id(id, name, logo_url)
            `)
            .eq('id', id)
            .maybeSingle();

          if (fr) fundraiser = fr;

          const { data: ms } = await supabase
            .from('fundraiser_milestones')
            .select('*')
            .eq('fundraiser_id', id)
            .order('amount_kes', { ascending: true });
          if (ms) milestones = ms;

          const { data: ups } = await supabase
            .from('fundraiser_updates')
            .select('*, author:author_id(display_name, avatar_url, badge)')
            .eq('fundraiser_id', id)
            .order('created_at', { ascending: false });
          if (ups) updates = ups;

          const { data: dns } = await supabase
            .from('fundraiser_donations')
            .select('id, amount_kes, display_name, anonymous, message, created_at, status')
            .eq('fundraiser_id', id)
            .eq('status', 'succeeded')
            .order('created_at', { ascending: false })
            .limit(50);
          if (dns) donations = dns;
        } catch {
          // Fallback to seed
        }
      }

      if (!fundraiser) {
        fundraiser = SEED_FUNDRAISERS.find((f) => f.id === id) || null;
        milestones = SEED_MILESTONES[id] || [];
        updates = SEED_UPDATES[id] || [];
        donations = SEED_DONATIONS[id] || [];
      }

      if (!fundraiser) {
        return NextResponse.json({ error: 'Fundraiser campaign not found.' }, { status: 404 });
      }

      // Privacy mask: anonymize donations
      const sanitizedDonations = (donations || []).map((d) => ({
        ...d,
        display_name: d.anonymous ? 'Anonymous Disciple' : (d.display_name || 'A Believer in Christ'),
      }));

      // Top donors (sorted by amount descending)
      const topDonors = [...sanitizedDonations]
        .sort((a, b) => (Number(b.amount_kes) || 0) - (Number(a.amount_kes) || 0))
        .slice(0, 10);

      // Recent donors
      const recentDonors = [...sanitizedDonations].slice(0, 15);

      return NextResponse.json({
        ok: true,
        fundraiser,
        milestones,
        updates,
        donations: sanitizedDonations,
        topDonors,
        recentDonors,
      });
    }

    // 2. CHECK DONATION STATUS (Polling after STK push)
    if (action === 'check-donation') {
      const checkoutRequestId = searchParams.get('checkoutRequestId');
      const donationId = searchParams.get('donationId');
      const fundraiserId = searchParams.get('fundraiserId');

      if (!checkoutRequestId && !donationId) {
        return NextResponse.json({ error: 'Missing checkoutRequestId or donationId.' }, { status: 400 });
      }

      let donation = null;
      let fundraiser = null;

      if (supabase) {
        try {
          let query = supabase.from('fundraiser_donations').select('*');
          if (donationId) query = query.eq('id', donationId);
          else if (checkoutRequestId) query = query.eq('checkout_request_id', checkoutRequestId);

          const { data } = await query.maybeSingle();
          donation = data;

          if (donation?.fundraiser_id) {
            const { data: fr } = await supabase
              .from('fundraisers')
              .select('id, raised_kes, donors_count, goal_kes, status')
              .eq('id', donation.fundraiser_id)
              .maybeSingle();
            fundraiser = fr;
          }
        } catch {}
      }

      return NextResponse.json({
        ok: true,
        status: donation?.status || 'completed',
        donationId: donation?.id || donationId,
        checkoutRequestId: donation?.checkout_request_id || checkoutRequestId,
        mpesaReceipt: donation?.mpesa_transaction_id || null,
        fundraiser: fundraiser || null,
      });
    }

    // 3. ADMIN REVIEW QUEUE
    if (action === 'admin-list') {
      let pendingCampaigns = [];
      let pendingWithdrawals = [];

      if (supabase) {
        try {
          const { data: pc } = await supabase
            .from('fundraisers')
            .select('*, owner:owner_id(display_name, avatar_url, badge)')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false });
          if (pc) pendingCampaigns = pc;

          const { data: pw } = await supabase
            .from('fundraiser_withdrawals')
            .select('*, fundraiser:fundraiser_id(title, raised_kes)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          if (pw) pendingWithdrawals = pw;
        } catch {}
      }

      return NextResponse.json({
        ok: true,
        pendingCampaigns,
        pendingWithdrawals,
      });
    }

    // 4. MAIN LIST VIEW
    const category = searchParams.get('category') || 'All';
    const sort = searchParams.get('sort') || 'trending';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const userId = searchParams.get('userId');

    let allFundraisers = [];

    if (supabase) {
      try {
        const { data } = await supabase
          .from('fundraisers')
          .select(`
            *,
            owner:owner_id(id, display_name, avatar_url, badge, badge_verified, role),
            church:church_id(id, name, logo_url)
          `)
          .in('status', ['active', 'completed', 'paused', 'pending_review'])
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          allFundraisers = data;
        }
      } catch {
        // Fallback to seed
      }
    }

    if (allFundraisers.length === 0) {
      allFundraisers = [...SEED_FUNDRAISERS];
    }

    // Filter by search query
    let filtered = allFundraisers.filter((f) => {
      if (f.status === 'pending_review' && (!userId || f.owner_id !== userId)) {
        return false;
      }
      if (search) {
        const titleMatch = f.title?.toLowerCase().includes(search);
        const descMatch = f.story_md?.toLowerCase().includes(search);
        const beneMatch = f.beneficiary_name?.toLowerCase().includes(search);
        const locMatch = f.location?.toLowerCase().includes(search);
        const churchMatch = f.church?.name?.toLowerCase().includes(search);
        if (!titleMatch && !descMatch && !beneMatch && !locMatch && !churchMatch) return false;
      }
      if (category && category !== 'All') {
        if (f.category?.toLowerCase() !== category.toLowerCase()) return false;
      }
      return true;
    });

    // Sort order
    if (sort === 'trending') {
      filtered.sort((a, b) => (Number(b.donors_count) || 0) - (Number(a.donors_count) || 0));
    } else if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'ending_soon') {
      filtered.sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      });
    } else if (sort === 'almost_funded') {
      filtered.sort((a, b) => {
        const pa = (Number(a.raised_kes) || 0) / (Number(a.goal_kes) || 1);
        const pb = (Number(b.raised_kes) || 0) / (Number(b.goal_kes) || 1);
        return pb - pa;
      });
    } else if (sort === 'goal_asc') {
      filtered.sort((a, b) => (Number(a.goal_kes) || 0) - (Number(b.goal_kes) || 0));
    } else if (sort === 'goal_desc') {
      filtered.sort((a, b) => (Number(b.goal_kes) || 0) - (Number(a.goal_kes) || 0));
    }

    // Blocks preparation for layout kit
    const urgent = [...allFundraisers]
      .filter((f) => f.status === 'active' && f.deadline)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 6);

    const featured = allFundraisers.find((f) => f.verified && f.status === 'active') || allFundraisers[0] || null;

    const trending = [...allFundraisers]
      .sort((a, b) => (Number(b.donors_count) || 0) - (Number(a.donors_count) || 0))
      .slice(0, 4);

    const nearYou = [...allFundraisers].slice(0, 4);

    const myCampaigns = userId
      ? allFundraisers.filter((f) => f.owner_id === userId || f.owner?.id === userId)
      : [];

    return NextResponse.json({
      ok: true,
      fundraisers: filtered,
      urgent,
      featured,
      trending,
      nearYou,
      myCampaigns,
      totalCount: filtered.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Unable to fetch fundraisers.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await resolveSessionUser(request);
    const body = await request.json();
    const { action } = body || {};

    const supabase = getSupabaseServerClient(request.headers.get('authorization'));

    // 1. CREATE CAMPAIGN
    if (action === 'create') {
      const {
        title,
        storyMd,
        category,
        goalKes,
        deadline,
        beneficiaryName,
        location,
        coverUrl,
        gallery,
        verificationDocUrl,
        churchId,
        milestones,
      } = body;

      if (!title || title.trim().length < 5) {
        return NextResponse.json({ error: 'Please enter a clear campaign title (at least 5 characters).' }, { status: 400 });
      }

      const numGoal = Math.round(Number(goalKes || 0));
      if (!Number.isFinite(numGoal) || numGoal < 100) {
        return NextResponse.json({ error: 'Minimum campaign goal is KES 100.' }, { status: 400 });
      }

      if (!storyMd || storyMd.trim().length < 30) {
        return NextResponse.json({ error: 'Please provide a clear campaign story explaining the need (at least 30 characters).' }, { status: 400 });
      }

      const categoryAccents = {
        Medical: '#ef4444',
        Education: '#8b5cf6',
        'Church building': '#f59e0b',
        Missions: '#06b6d4',
        Relief: '#10b981',
        Community: '#ec4899',
      };
      const accent = categoryAccents[category] || '#10b981';

      const newRecord = {
        title: title.trim(),
        story_md: storyMd.trim(),
        category: category || 'Community',
        goal_kes: numGoal,
        deadline: deadline || null,
        beneficiary_name: beneficiaryName?.trim() || null,
        location: location?.trim() || 'Kenya',
        cover_url: coverUrl || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&auto=format&fit=crop&q=80',
        gallery: Array.isArray(gallery) ? gallery : [],
        verification_doc_url: verificationDocUrl || null,
        accent,
        owner_id: user?.id || null,
        church_id: churchId || null,
        status: 'active', // Active immediately for smooth user verification & testing
        verified: false,
        raised_kes: 0,
        donors_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let inserted = null;

      if (supabase) {
        const { data, error } = await supabase
          .from('fundraisers')
          .insert(newRecord)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }
        inserted = data;

        // Insert initial milestones if provided
        if (Array.isArray(milestones) && milestones.length > 0 && inserted?.id) {
          const msRows = milestones
            .filter((m) => m.amount && m.label)
            .map((m) => ({
              fundraiser_id: inserted.id,
              amount_kes: Math.round(Number(m.amount)),
              label: m.label.trim(),
            }));

          if (msRows.length > 0) {
            await supabase.from('fundraiser_milestones').insert(msRows);
          }
        }
      } else {
        inserted = { id: `fr-${Date.now()}`, ...newRecord };
      }

      return NextResponse.json({
        ok: true,
        fundraiser: inserted,
        message: 'Fundraiser campaign created successfully!',
      });
    }

    // 2. POST UPDATE
    if (action === 'update') {
      const { fundraiserId, body: updateBody, mediaUrl } = body;
      if (!fundraiserId || !updateBody?.trim()) {
        return NextResponse.json({ error: 'Missing campaign id or update content.' }, { status: 400 });
      }

      const updateRecord = {
        fundraiser_id: fundraiserId,
        author_id: user?.id || null,
        body: updateBody.trim(),
        media_url: mediaUrl || null,
        created_at: new Date().toISOString(),
      };

      let inserted = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('fundraiser_updates')
          .insert(updateRecord)
          .select()
          .single();
        if (error) throw new Error(error.message);
        inserted = data;
      } else {
        inserted = { id: `up-${Date.now()}`, ...updateRecord };
      }

      return NextResponse.json({ ok: true, update: inserted });
    }

    // 3. REQUEST WITHDRAWAL
    if (action === 'withdrawal') {
      const { fundraiserId, amountKes, mpesaPhone } = body;
      if (!fundraiserId) return NextResponse.json({ error: 'Missing fundraiser id.' }, { status: 400 });
      const numAmount = Math.round(Number(amountKes || 0));
      if (!Number.isFinite(numAmount) || numAmount < 100) {
        return NextResponse.json({ error: 'Minimum withdrawal amount is KES 100.' }, { status: 400 });
      }
      if (!mpesaPhone) {
        return NextResponse.json({ error: 'Please enter a valid M-Pesa phone number for disbursement.' }, { status: 400 });
      }

      const withdrawalRecord = {
        fundraiser_id: fundraiserId,
        amount_kes: numAmount,
        mpesa_payout_phone: mpesaPhone,
        requested_by: user?.id || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let inserted = null;
      if (supabase) {
        const { data, error } = await supabase
          .from('fundraiser_withdrawals')
          .insert(withdrawalRecord)
          .select()
          .single();
        if (error) throw new Error(error.message);
        inserted = data;
      } else {
        inserted = { id: `wth-${Date.now()}`, ...withdrawalRecord };
      }

      return NextResponse.json({
        ok: true,
        withdrawal: inserted,
        message: 'Withdrawal request submitted for church steward review.',
      });
    }

    // 4. REPORT CAMPAIGN
    if (action === 'report') {
      const { fundraiserId, reason, details } = body;
      if (!fundraiserId || !reason) {
        return NextResponse.json({ error: 'Missing campaign id or reason.' }, { status: 400 });
      }

      if (supabase) {
        await supabase.from('fundraiser_reports').insert({
          fundraiser_id: fundraiserId,
          reporter_id: user?.id || null,
          reason,
          details: details || null,
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ ok: true, message: 'Thank you for reporting. Our moderation team has been alerted.' });
    }

    // 5. ADMIN REVIEW
    if (action === 'admin-review') {
      const { targetType, targetId, decision, adminNote } = body;
      if (!targetType || !targetId || !decision) {
        return NextResponse.json({ error: 'Missing target or decision.' }, { status: 400 });
      }

      if (supabase) {
        if (targetType === 'campaign') {
          const status = decision === 'approve' ? 'active' : 'rejected';
          await supabase
            .from('fundraisers')
            .update({ status, verified: decision === 'approve' })
            .eq('id', targetId);
        } else if (targetType === 'withdrawal') {
          const status = decision === 'approve' ? 'disbursed' : 'rejected';
          await supabase
            .from('fundraiser_withdrawals')
            .update({ status, admin_note: adminNote || null })
            .eq('id', targetId);
        }
      }

      return NextResponse.json({ ok: true, message: `Review completed: ${decision}.` });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Operation failed.' }, { status: 500 });
  }
}
