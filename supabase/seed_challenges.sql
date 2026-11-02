-- Six database-backed Faith Challenges. Safe to re-run; existing live records and counters are preserved.
INSERT INTO public.challenges
  (id, creator_id, church_id, title, description, rules_md, cover_url, kind, category,
   starts_at, ends_at, duration_days, points, accent, visibility, status, participants_count)
VALUES
  ('c1000000-0000-4000-a000-000000000001', NULL, NULL,
   '7-Day Secret Place Prayer Sprint',
   'Set aside 20 minutes each morning for uninterrupted communion with God (Matthew 6:6).',
   E'### Daily practice\n- Spend at least 20 minutes in focused prayer before opening social media.\n- Read a short passage and reflect on what it means for your day.\n- Check in with a brief prayer reflection.',
   'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=900&auto=format&fit=crop&q=80',
   'daily','Prayer',now(),now()+interval '7 days',7,70,'#06b6d4','public','active',0),
  ('c1000000-0000-4000-a000-000000000002', NULL, NULL,
   'Romans 8 Scripture Memory Mastery',
   'Memorize a verse each day and build a personal recitation of Romans 8.',
   E'### Daily practice\n- Memorize one verse word-for-word.\n- Review previous verses before learning the next.\n- Share a short recitation using #ScriptureIn60s.',
   'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?w=900&auto=format&fit=crop&q=80',
   'streak','Scripture memory',now(),now()+interval '14 days',14,140,'#8b5cf6','public','active',0),
  ('c1000000-0000-4000-a000-000000000003', NULL, NULL,
   '21-Day Daniel Fast & Spiritual Clarity',
   'Set apart time for prayer, reflection and a thoughtful fast, adapted to your own health and circumstances.',
   E'### Daily practice\n- Choose a safe, personally appropriate fast; fasting is optional and should never compromise health.\n- Pair your practice with prayer and scripture reading.\n- Reflect on one way to serve your community.',
   'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=900&auto=format&fit=crop&q=80',
   'daily','Fasting',now(),now()+interval '21 days',21,210,'#10b981','public','active',0),
  ('c1000000-0000-4000-a000-000000000004', NULL, NULL,
   '30 Days of Kingdom Gratitude',
   'Notice and record three blessings, acts of kindness or answered prayers each day.',
   E'### Daily practice\n- Write down three specific things you are grateful for.\n- Encourage someone with a sincere message.\n- Reflect on Philippians 2:14 with grace rather than perfectionism.',
   'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=80',
   'daily','Prayer',now(),now()+interval '30 days',30,300,'#f59e0b','public','active',0),
  ('c1000000-0000-4000-a000-000000000005', NULL, NULL,
   'Random Acts of Christlike Kindness',
   'Complete one intentional act of service each day without seeking recognition.',
   E'### Daily practice\n- Help a neighbour, colleague or fellow believer in a practical way.\n- Respect people’s boundaries and dignity.\n- Reflect on Matthew 25:35-40 and share what you learned.',
   'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=900&auto=format&fit=crop&q=80',
   'daily','Service',now(),now()+interval '7 days',7,70,'#ec4899','public','active',0),
  ('c1000000-0000-4000-a000-000000000006', NULL, NULL,
   'Raw Acoustic & Acapella Worship',
   'Share a short original worship performance, instrumental or a cappella, that encourages the community.',
   E'### Participation\n- Upload an original performance or a public-domain hymn arrangement.\n- Add a short caption about the scripture or reflection behind it.\n- Keep comments encouraging and respectful.',
   'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=80',
   'one_off','Worship',now(),now()+interval '14 days',14,150,'#ef4444','public','active',0)
ON CONFLICT (id) DO NOTHING;

-- Reconcile displayed participant totals with actual participation rows instead of seeded vanity counts.
UPDATE public.challenges c
SET participants_count = (
  SELECT count(*)::integer FROM public.challenge_participants cp WHERE cp.challenge_id = c.id
),
updated_at = now()
WHERE c.id IN (
  'c1000000-0000-4000-a000-000000000001',
  'c1000000-0000-4000-a000-000000000002',
  'c1000000-0000-4000-a000-000000000003',
  'c1000000-0000-4000-a000-000000000004',
  'c1000000-0000-4000-a000-000000000005',
  'c1000000-0000-4000-a000-000000000006'
);
