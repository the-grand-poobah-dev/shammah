-- =============================================================================
-- Shammah Seed File: supabase/seed_faith_challenges.sql
-- Purpose: 6 diverse, engaging Christian community challenges:
--          1. 7-Day Secret Place Prayer Sprint (Prayer)
--          2. Romans 8 Scripture Memory Mastery (Scripture memory)
--          3. 21-Day Daniel Fast & Spiritual Clarity (Fasting)
--          4. 30 Days of Unspoken Kingdom Gratitude (Prayer)
--          5. Random Acts of Christlike Kindness (Service)
--          6. Raw Acoustic & Acapella Worship Cover (Worship)
-- Safe to run multiple times (100% idempotent).
-- =============================================================================

DO $$
DECLARE
  v_creator_id uuid;
  v_church_id uuid;
  v_c1 uuid := 'c1000000-0000-4000-a000-000000000001';
  v_c2 uuid := 'c1000000-0000-4000-a000-000000000002';
  v_c3 uuid := 'c1000000-0000-4000-a000-000000000003';
  v_c4 uuid := 'c1000000-0000-4000-a000-000000000004';
  v_c5 uuid := 'c1000000-0000-4000-a000-000000000005';
  v_c6 uuid := 'c1000000-0000-4000-a000-000000000006';
BEGIN
  SELECT id, church_id INTO v_creator_id, v_church_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  -- 1. SEED 6 CHALLENGES
  INSERT INTO public.challenges (
    id, creator_id, church_id, title, description, rules_md, cover_url,
    kind, category, starts_at, ends_at, duration_days, points, accent, visibility, status, participants_count
  ) VALUES
  (
    v_c1,
    v_creator_id,
    v_church_id,
    '7-Day Secret Place Prayer Sprint',
    'Set your alarm 20 minutes earlier each morning for uninterrupted communion with the Father (Matthew 6:6).',
    E'### Rules & Daily Posture:\n- Spend at least 20 minutes in focused, silent prayer before opening social media.\n- Use the SOAP devotional model (Scripture, Observation, Application, Prayer).\n- Check in daily to track your flame streak and share a brief prayer reflection.',
    'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=900&auto=format&fit=crop&q=80',
    'daily',
    'Prayer',
    now() - INTERVAL '3 days',
    now() + INTERVAL '4 days',
    7,
    70,
    '#06b6d4',
    'public',
    'active',
    412
  ),
  (
    v_c2,
    v_creator_id,
    v_church_id,
    'Romans 8 Scripture Memory Mastery',
    'Hide God’s word in your heart by memorizing 1 verse per day from the greatest chapter in the New Testament.',
    E'### Rules & Daily Posture:\n- Memorize the verse of the day word-for-word.\n- Record a 30-60 second recitation video with the hashtag #ScriptureIn60s.\n- Review previous days to build your full chapter recitation.',
    'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=900&auto=format&fit=crop&q=80',
    'streak',
    'Scripture memory',
    now() - INTERVAL '5 days',
    now() + INTERVAL '9 days',
    14,
    140,
    '#8b5cf6',
    'public',
    'active',
    286
  ),
  (
    v_c3,
    v_creator_id,
    v_church_id,
    '21-Day Daniel Fast & Spiritual Clarity',
    'Consecrate your appetite for deep spiritual breakthrough, physical renewal, and discerning God’s will.',
    E'### Rules & Daily Posture:\n- Abstain from meats, refined sugars, and carbonated beverages.\n- Focus on vegetables, fruits, whole grains, nuts, and pure water.\n- Pair fasting with intercession for church revival and national unity.',
    'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=900&auto=format&fit=crop&q=80',
    'daily',
    'Fasting',
    now() - INTERVAL '7 days',
    now() + INTERVAL '14 days',
    21,
    210,
    '#10b981',
    'public',
    'active',
    530
  ),
  (
    v_c4,
    v_creator_id,
    v_church_id,
    '30 Days of Unspoken Kingdom Gratitude',
    'Shift your spiritual atmosphere by recording 3 specific answered prayers or daily blessings without complaining.',
    E'### Rules & Daily Posture:\n- Post 3 unique blessings each day.\n- No complaining or cynical talk allowed for 30 consecutive days (Philippians 2:14).\n- Notice the supernatural peace that guards your heart.',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=80',
    'daily',
    'Prayer',
    now() - INTERVAL '10 days',
    now() + INTERVAL '20 days',
    30,
    300,
    '#f59e0b',
    'public',
    'active',
    195
  ),
  (
    v_c5,
    v_creator_id,
    v_church_id,
    'Random Acts of Christlike Kindness',
    'Be the hands and feet of Jesus: pay a matatu fare, buy lunch for a security guard, or visit an elderly neighbor.',
    E'### Rules & Daily Posture:\n- Complete 1 intentional act of servant love daily without seeking personal acclaim.\n- Encourage others by sharing a short praise testimony or note.',
    'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=900&auto=format&fit=crop&q=80',
    'daily',
    'Service',
    now() - INTERVAL '2 days',
    now() + INTERVAL '5 days',
    7,
    100,
    '#ec4899',
    'public',
    'active',
    320
  ),
  (
    v_c6,
    v_creator_id,
    v_church_id,
    'Raw Acoustic & Acapella Worship Cover',
    'Share a pure 60-90 second acoustic, piano, or vocal worship chorus honoring the name of Jesus.',
    E'### Rules & Daily Posture:\n- High sound clarity, zero autotune, pure heart of adoration.\n- Tag your local fellowship or campus Christian Union.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80',
    'one_off',
    'Worship',
    now() - INTERVAL '4 days',
    now() + INTERVAL '10 days',
    14,
    150,
    '#ef4444',
    'public',
    'active',
    215
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    rules_md = EXCLUDED.rules_md,
    cover_url = EXCLUDED.cover_url,
    category = EXCLUDED.category,
    accent = EXCLUDED.accent;

  -- 2. SEED PARTICIPANTS & STREAKS
  IF v_creator_id IS NOT NULL THEN
    INSERT INTO public.challenge_participants (challenge_id, user_id, joined_at, streak_current, streak_best, last_checkin_on, points)
    VALUES
      (v_c1, v_creator_id, now() - INTERVAL '3 days', 4, 7, CURRENT_DATE, 75),
      (v_c2, v_creator_id, now() - INTERVAL '5 days', 5, 5, CURRENT_DATE, 90),
      (v_c3, v_creator_id, now() - INTERVAL '7 days', 7, 10, CURRENT_DATE, 140)
    ON CONFLICT (challenge_id, user_id) DO UPDATE SET
      streak_current = EXCLUDED.streak_current,
      streak_best = EXCLUDED.streak_best,
      last_checkin_on = EXCLUDED.last_checkin_on,
      points = EXCLUDED.points;

    -- Seed checkins
    INSERT INTO public.challenge_checkins (challenge_id, user_id, day, note, points_awarded)
    VALUES
      (v_c1, v_creator_id, CURRENT_DATE, 'Woke up at 5:30 AM. Deep stillness in Psalm 23. Felt overwhelming peace.', 10),
      (v_c1, v_creator_id, CURRENT_DATE - 1, 'Day 3 done: Prayed for our campus Christian Union mission outreach.', 10),
      (v_c1, v_creator_id, CURRENT_DATE - 2, 'Day 2: Psalm 91 over my family and workplace.', 10),
      (v_c2, v_creator_id, CURRENT_DATE, 'Memorized Romans 8:37: "In all these things we are more than conquerors!"', 15)
    ON CONFLICT (challenge_id, user_id, day) DO NOTHING;

    -- Seed submissions
    INSERT INTO public.challenge_submissions (
      id, challenge_id, user_id, media_url, thumb_url, caption, hashtag, scripture, audio_title, like_count, comment_count, status
    ) VALUES
    (
      'd1000000-0000-4000-b000-000000000001',
      v_c2,
      v_creator_id,
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
      'Romans 8:31-39 in one continuous breath! If God is for us, who can be against us?! 🔥',
      '#ScriptureIn60s',
      'Romans 8:37',
      'Deep Worship Beat · Original Praise Sound',
      842,
      67,
      'approved'
    ),
    (
      'd1000000-0000-4000-b000-000000000002',
      v_c6,
      v_creator_id,
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
      'Way Maker (Swahili & English Acoustic Mashup) recorded during morning chapel devotion! 🎸',
      '#AcousticWorship',
      'Psalm 100:1-2',
      'Acoustic Guitar in E Major · Mary Grace',
      1240,
      114,
      'approved'
    ),
    (
      'd1000000-0000-4000-b000-000000000003',
      v_c5,
      v_creator_id,
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600',
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400',
      'Paid the bus fare for 3 stranded university students in Nairobi CBD today. Jesus is Lord! 🚌✨',
      '#KindnessInAction',
      'Matthew 25:40',
      'Joy In The Morning · Gospel Rhythm',
      420,
      38,
      'approved'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

END $$;
