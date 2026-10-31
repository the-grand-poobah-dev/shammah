-- =============================================================================
-- Shammah Seed File: supabase/seed_fundraisers.sql
-- Purpose: 4 realistic, inspiring faith & community campaigns across Kenya:
--          1. Turkana Clean Water Borehole & Solar Pump (Relief / Missions)
--          2. Eldoret Worship Chapel Roof Restoration (Church building)
--          3. Coast Free Medical Camp & Eye Surgeries (Medical)
--          4. Kibera & Mathare High School Christian Union Scholarship (Education)
-- Safe to run multiple times (100% idempotent).
-- =============================================================================

DO $$
DECLARE
  v_owner_id uuid;
  v_church_id uuid;
  v_f1_id uuid := 'f1000000-0000-4000-a000-000000000001';
  v_f2_id uuid := 'f1000000-0000-4000-a000-000000000002';
  v_f3_id uuid := 'f1000000-0000-4000-a000-000000000003';
  v_f4_id uuid := 'f1000000-0000-4000-a000-000000000004';
BEGIN
  SELECT id, church_id INTO v_owner_id, v_church_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  -- 1. SEED CAMPAIGNS
  INSERT INTO public.fundraisers (
    id, owner_id, church_id, title, story_md, cover_url, gallery,
    category, goal_kes, raised_kes, donors_count, deadline,
    status, beneficiary_name, verified, accent, location
  ) VALUES
  (
    v_f1_id,
    v_owner_id,
    v_church_id,
    'Turkana Clean Water Borehole & Solar Pump',
    E'### Bringing Living Water to Lodwar & Pastoralist Families\n\nFor generations, mothers and children in rural Turkana have walked up to 14 kilometers every day searching for scoop-wells in dry riverbeds. Contaminated water sources have caused recurring typhoid and waterborne illnesses among the little ones.\n\n**The Vision:**\nWith your support, our local pastoral ministry and hydrologist team will drill a 180-meter solar-powered borehole capable of pumping 12,000 liters of pure, potable water per hour. We are also building:\n- 4 community tap points adjacent to local schools and clinic\n- A solar livestock watering trough to reduce drought conflict\n- A gospel outreach pavilion where fellowships gather every Sunday\n\n*"Whoever drinks of the water that I shall give him will never thirst."* — John 4:14\n\nEvery shilling given directly funds steel casing, solar submersible pumps, and elevated distribution tanks.',
    'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&auto=format&fit=crop&q=80',
    '["https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800", "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800", "https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800"]'::jsonb,
    'Relief',
    650000,
    520000,
    312,
    CURRENT_DATE + INTERVAL '14 days',
    'active',
    'Turkana Pastoral Fellowship & Community Council',
    true,
    '#10b981',
    'Lodwar, Turkana County'
  ),
  (
    v_f2_id,
    v_owner_id,
    v_church_id,
    'Eldoret Worship Chapel Roof Restoration',
    E'### Sheltering 450 Believers Before the Heavy Rain Season\n\nOur sanctuary in Eldoret has stood for over 28 years as a haven of prayer, marriage counseling, youth conferences, and Sunday school. However, severe hailstorms earlier this year punctured large sections of the rusted corrugated iron roof, causing continuous leakage during services and damaging our choir instruments and pews.\n\n**Our Project Scope:**\n- Full replacement with heavy gauge anti-rust tile sheets (680 sqm)\n- Installing heat-reflective acoustic ceiling boards\n- Gutters and a rainwater harvesting tank system for the community\n\nWe invite all alumni, church partners, and believers across Kenya to stand in the gap with us. Let us rebuild the house of prayer with joy!',
    'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1200&auto=format&fit=crop&q=80',
    '["https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800", "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800"]'::jsonb,
    'Church building',
    450000,
    310000,
    198,
    CURRENT_DATE + INTERVAL '22 days',
    'active',
    'Eldoret Grace Chapel Sanctuary Board',
    true,
    '#f59e0b',
    'Eldoret, Uasin Gishu'
  ),
  (
    v_f3_id,
    v_owner_id,
    v_church_id,
    'Coast Free Medical Camp & Eye Surgeries',
    E'### Compassion in Action for Kwale & Coastal Villages\n\nJesus went about preaching the kingdom and healing every disease. Next month, a dedicated team of 24 volunteer Christian doctors, pediatricians, ophthalmologists, and nurses will conduct a 4-day medical and surgical drive in Kwale.\n\n**Key Goals:**\n- 50 cataract restorations for elderly grandparents who have suffered blindness\n- Free prescription glasses, malaria testing, and antibiotic dispensary\n- Prenatal scans and nutritional vitamins for expectant mothers\n- One-on-one chaplaincy prayer for every patient seeking peace in Christ',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=80',
    '["https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"]'::jsonb,
    'Medical',
    280000,
    195000,
    145,
    CURRENT_DATE + INTERVAL '9 days',
    'active',
    'Coast Christian Doctors Fellowship & Kwale Clinic',
    true,
    '#ef4444',
    'Kwale & Msambweni, Coast'
  ),
  (
    v_f4_id,
    v_owner_id,
    v_church_id,
    'Kibera & Mathare High School Christian Union Scholarship',
    E'### Equipping 40 Promising Christian Students with Tuition & Mentorship\n\nIn the informal settlements of Nairobi, bright Christian boys and girls frequently drop out of school due to unpaid school fees of just KES 12,000–18,000 per term. Many are active leaders in their high school Christian Unions (CUs).\n\n**What Every KES 15,000 Sponsor Provides:**\n- Full secondary school tuition clearance paid directly to schools\n- Complete textbook sets, stationery, and laboratory fee subsidies\n- Monthly Saturday leadership mentorship workshops and discipleship retreats\n\nInvest in kingdom leadership for Kenya’s next generation today.',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
    '["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800", "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800"]'::jsonb,
    'Education',
    360000,
    285000,
    174,
    CURRENT_DATE + INTERVAL '18 days',
    'active',
    'Nairobi Slum Youth Mission & CU Chaplains',
    true,
    '#8b5cf6',
    'Nairobi (Mathare & Kibera)'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    story_md = EXCLUDED.story_md,
    cover_url = EXCLUDED.cover_url,
    category = EXCLUDED.category,
    goal_kes = EXCLUDED.goal_kes,
    raised_kes = EXCLUDED.raised_kes,
    donors_count = EXCLUDED.donors_count,
    deadline = EXCLUDED.deadline,
    beneficiary_name = EXCLUDED.beneficiary_name,
    verified = EXCLUDED.verified,
    accent = EXCLUDED.accent,
    location = EXCLUDED.location;

  -- 2. SEED MILESTONES
  INSERT INTO public.fundraiser_milestones (fundraiser_id, amount_kes, label, reached_at)
  VALUES
    (v_f1_id, 150000, 'Geological survey & drilling rig mobilization', now() - INTERVAL '10 days'),
    (v_f1_id, 350000, 'Borehole drilling completed (180m depth reached)', now() - INTERVAL '4 days'),
    (v_f1_id, 500000, 'Solar pump installation & underground pipe distribution', now() - INTERVAL '1 day'),
    (v_f1_id, 650000, 'Elevated 20,000L tank towers & school tap stations', null),

    (v_f2_id, 120000, 'Scaffolding & safe dismantling of damaged iron sheets', now() - INTERVAL '8 days'),
    (v_f2_id, 280000, 'Heavy-gauge iron tile purchase & structural timber reinforcement', now() - INTERVAL '2 days'),
    (v_f2_id, 450000, 'Ceiling acoustics, rainwater gutters & sanctuary dedication', null),

    (v_f3_id, 80000, 'Pharmaceutical medications & diagnostic lab kit procurement', now() - INTERVAL '6 days'),
    (v_f3_id, 180000, 'Eye surgery equipment transport & medical team mobilization', now() - INTERVAL '1 day'),
    (v_f3_id, 280000, 'Complete hospital post-op care & gospel outreach materials', null),

    (v_f4_id, 100000, 'Term 1 school fee clearance for first 15 students', now() - INTERVAL '12 days'),
    (v_f4_id, 220000, 'Textbooks, stationery, and CU youth leader retreats', now() - INTERVAL '3 days'),
    (v_f4_id, 360000, 'Term 2 & 3 scholarship fund for all 40 students', null)
  ON CONFLICT DO NOTHING;

  -- 3. SEED UPDATES
  INSERT INTO public.fundraiser_updates (fundraiser_id, author_id, body, media_url, created_at)
  VALUES
    (
      v_f1_id,
      v_owner_id,
      'Praise God! The drilling rig successfully struck freshwater at 174 meters depth! Testing shows water purity exceeds WHO standards. Thank you to everyone who gave!',
      'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800',
      now() - INTERVAL '3 days'
    ),
    (
      v_f2_id,
      v_owner_id,
      'The contractor delivered the first batch of anti-rust sheets today. Volunteers from the youth fellowship helped offload and stack them safely inside.',
      'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800',
      now() - INTERVAL '2 days'
    ),
    (
      v_f3_id,
      v_owner_id,
      'Our optical surgeon Dr. Ndegwa confirmed arrival of 60 intraocular lenses for cataract surgeries. The local chief has registered over 140 elders for screening.',
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
      now() - INTERVAL '1 day'
    ),
    (
      v_f4_id,
      v_owner_id,
      'Check out the report cards from our scholarship recipients — 18 of them ranked in the top 5 of their classes! God is raising mighty leaders.',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
      now() - INTERVAL '2 days'
    )
  ON CONFLICT DO NOTHING;

  -- 4. SEED SAMPLE SUCCEEDED DONATIONS
  INSERT INTO public.fundraiser_donations (
    fundraiser_id, donor_id, display_name, anonymous,
    amount_kes, message, mpesa_transaction_id, status, created_at
  ) VALUES
    (v_f1_id, null, 'Elder Peter K.', false, 15000, 'Standing with our brothers and sisters in Turkana. May God be glorified!', 'SHM7K9W2', 'succeeded', now() - INTERVAL '5 days'),
    (v_f1_id, null, 'Anonymous Sister in Christ', true, 5000, 'Praying for abundant clean water and eternal salvation.', 'SHM3P8L4', 'succeeded', now() - INTERVAL '3 days'),
    (v_f1_id, null, 'Grace Community Fellowship Nairobi', false, 50000, 'Church missions offering for Turkana borehole.', 'SHM9R1Z8', 'succeeded', now() - INTERVAL '2 days'),
    (v_f1_id, null, 'Brian Mwangi', false, 2500, 'God bless this powerful work! 🙏', 'SHM4T6V1', 'succeeded', now() - INTERVAL '4 hours'),

    (v_f2_id, null, 'Mama Mercy Wambui', false, 10000, 'Building the Lord''s sanctuary with joy!', 'SHM2X5J9', 'succeeded', now() - INTERVAL '4 days'),
    (v_f2_id, null, 'Eldoret CU Alumni Group', false, 35000, 'Honoring where our spiritual walk began.', 'SHM8N3Q2', 'succeeded', now() - INTERVAL '1 day'),
    (v_f2_id, null, 'Disciple in Faith', true, 3000, 'May God protect His sanctuary from every storm.', 'SHM5B7H6', 'succeeded', now() - INTERVAL '6 hours'),

    (v_f3_id, null, 'Dr. & Mrs. Kariuki', false, 20000, 'In support of Kwale eye surgeries and maternal care.', 'SHM1M9D4', 'succeeded', now() - INTERVAL '3 days'),
    (v_f3_id, null, 'Anonymous Believer', true, 5000, 'Luke 4:18 — recovering of sight to the blind!', 'SHM6C2Y8', 'succeeded', now() - INTERVAL '18 hours'),

    (v_f4_id, null, 'Teacher Faith Njeri', false, 15000, 'Sponsoring one high school student for an entire term.', 'SHM4F8K3', 'succeeded', now() - INTERVAL '2 days'),
    (v_f4_id, null, 'David Kimani', false, 5000, 'For God and our youth! Keep shining the light of Jesus.', 'SHM9L2P5', 'succeeded', now() - INTERVAL '8 hours')
  ON CONFLICT DO NOTHING;

END $$;
