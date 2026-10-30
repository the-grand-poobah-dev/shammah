-- =============================================================================
-- Shammah Seed: supabase/seed_polls.sql
-- Purpose: Self-healing seed for Polls, Surveys, Faith Quizzes, Icebreakers,
--          Live Ending-Soon Polls, Completed Results, and Quiz Leaderboard.
-- Safe to run standalone or after 20261030_polls_and_quizzes.sql (100% idempotent).
-- =============================================================================

-- Ensure required columns exist on public.posts even if seed_polls.sql is run first
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_type text DEFAULT 'survey',
  ADD COLUMN IF NOT EXISTS is_quiz boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_explanation text,
  ADD COLUMN IF NOT EXISTS poll_explanation text,
  ADD COLUMN IF NOT EXISTS poll_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_multi_select boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_allow_multiple boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_results_until_vote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reveal_results_after_voting boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS poll_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS poll_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS poll_closed_early boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS poll_accent text,
  ADD COLUMN IF NOT EXISTS poll_category text,
  ADD COLUMN IF NOT EXISTS total_votes_count integer NOT NULL DEFAULT 0;

-- Ensure required columns exist on public.poll_options
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  image_url text,
  is_correct boolean NOT NULL DEFAULT false,
  explanation text,
  position integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.poll_options
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_correct boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Ensure public.quiz_scores exists
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.poll_options(id) ON DELETE SET NULL,
  is_correct boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1000),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

DO $$
DECLARE
  v_author_id uuid;
  v_church_id uuid;
BEGIN
  -- Pick the first existing profile as the author for seeded community polls
  SELECT id, church_id INTO v_author_id, v_church_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_author_id IS NULL THEN
    RAISE NOTICE 'No profile found in public.profiles. Skipping seed_polls.sql until at least one user signs up.';
    RETURN;
  END IF;

  -- Ensure required categories exist
  INSERT INTO public.categories (id, name)
  VALUES
    ('worship', 'Worship & Praise'),
    ('bible-study', 'Bible Study'),
    ('youth', 'Youth & Gen-Z'),
    ('prayer', 'Prayer & Intercession'),
    ('fellowship', 'Fellowship & Community'),
    ('missions', 'Missions & Outreach')
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 1. LIVE NOW · ENDING SOON (Rail with countdown rings)
  -- ===========================================================================
  INSERT INTO public.posts (
    id, author_id, church_id, category_id, text_content, visibility,
    poll_type, is_quiz, quiz_explanation, poll_anonymous, poll_multi_select,
    hide_results_until_vote, poll_starts_at, poll_expires_at, poll_accent,
    poll_category, total_votes_count, created_at
  )
  VALUES
    (
      'c1000000-0000-0000-0000-000000000001',
      v_author_id, v_church_id, 'worship',
      'Which worship song should our choir open with for this Friday''s Night of Vigils?',
      'public', 'survey', false, null, false, false,
      false, now() - interval '3 hours', now() + interval '45 minutes', '#ec4899',
      'Worship', 88, now() - interval '3 hours'
    ),
    (
      'c1000000-0000-0000-0000-000000000002',
      v_author_id, v_church_id, 'prayer',
      'What time works best for our 30-Minute Midday Intercession Livestream tomorrow?',
      'public', 'survey', false, null, false, false,
      false, now() - interval '5 hours', now() + interval '2 hours', '#06b6d4',
      'Prayer', 64, now() - interval '5 hours'
    ),
    (
      'c1000000-0000-0000-0000-000000000003',
      v_author_id, v_church_id, 'youth',
      'Flash Bible Quiz: Which prophet was taken up to heaven in a whirlwind with a chariot of fire?',
      'public', 'quiz', true,
      '2 Kings 2:11 — Suddenly a chariot of fire and horses of fire appeared and separated the two of them, and Elijah went up to heaven in a whirlwind.',
      false, false, true, now() - interval '2 hours', now() + interval '3 hours 20 minutes', '#f59e0b',
      'Bible Quiz', 112, now() - interval '2 hours'
    ),
    (
      'c1000000-0000-0000-0000-000000000004',
      v_author_id, v_church_id, 'missions',
      'Where should our Saturday Mercy Ministry team focus food distribution this weekend?',
      'public', 'survey', false, null, false, true,
      false, now() - interval '6 hours', now() + interval '5 hours', '#10b981',
      'Missions', 79, now() - interval '6 hours'
    ),

  -- ===========================================================================
  -- 2. FEATURED QUIZ (Spotlight) + FAITH QUIZZES (Magazine-flat)
  -- ===========================================================================
    (
      'c2000000-0000-0000-0000-000000000001',
      v_author_id, v_church_id, 'bible-study',
      'Scripture Mastery Spotlight: In Ephesians 6, which piece of the Armor of God represents the Word of God?',
      'public', 'quiz', true,
      'Ephesians 6:17 — "Take the helmet of salvation and the sword of the Spirit, which is the word of God." It is the primary offensive weapon in spiritual warfare.',
      false, false, true, now() - interval '4 hours', now() + interval '4 days', '#f59e0b',
      'Bible Quiz', 165, now() - interval '4 hours'
    ),
    (
      'c2000000-0000-0000-0000-000000000002',
      v_author_id, v_church_id, 'bible-study',
      'Acts of the Apostles Quiz: On the road to Gaza, which Ethiopian official did Philip lead to Christ through Isaiah 53?',
      'public', 'quiz', true,
      'Acts 8:27-38 records how Philip explained Isaiah''s prophecy to the Ethiopian eunuch (treasurer of Candace), who was immediately baptized.',
      false, false, true, now() - interval '12 hours', now() + interval '5 days', '#8b5cf6',
      'Bible Quiz', 94, now() - interval '12 hours'
    ),
    (
      'c2000000-0000-0000-0000-000000000003',
      v_author_id, v_church_id, 'bible-study',
      'Gospels Trivia: Which miracle of Jesus is the ONLY one recorded in all four Gospels (Matthew, Mark, Luke, and John)?',
      'public', 'quiz', true,
      'Aside from the Resurrection, the Feeding of the 5,000 is the only miracle recorded in Matthew 14, Mark 6, Luke 9, and John 6.',
      false, false, true, now() - interval '1 day', now() + interval '6 days', '#06b6d4',
      'Bible Quiz', 138, now() - interval '1 day'
    ),

  -- ===========================================================================
  -- 3. COMMUNITY SURVEYS (Magazine-x2)
  -- ===========================================================================
    (
      'c3000000-0000-0000-0000-000000000001',
      v_author_id, v_church_id, 'worship',
      'Which Sunday morning service time works best for you and your family?',
      'public', 'survey', false, null, false, false,
      false, now() - interval '8 hours', now() + interval '2 days', '#06b6d4',
      'Church Life', 139, now() - interval '8 hours'
    ),
    (
      'c3000000-0000-0000-0000-000000000002',
      v_author_id, v_church_id, 'bible-study',
      'Which book of the Bible should we study next in Wednesday Home Cells?',
      'public', 'survey', false, null, false, true,
      false, now() - interval '16 hours', now() + interval '3 days', '#10b981',
      'Discipleship', 93, now() - interval '16 hours'
    ),
    (
      'c3000000-0000-0000-0000-000000000003',
      v_author_id, v_church_id, 'youth',
      'Where should our Youth & Young Adults Fellowship hold the next Worship & Bonfire Retreat?',
      'public', 'survey', false, null, false, false,
      false, now() - interval '1 day', now() + interval '5 days', '#ec4899',
      'Youth & Gen-Z', 124, now() - interval '1 day'
    ),
    (
      'c3000000-0000-0000-0000-000000000004',
      v_author_id, v_church_id, 'fellowship',
      'Which practical life-skills workshop would help young believers most this quarter? (Multi-select)',
      'public', 'survey', false, null, true, true,
      true, now() - interval '20 hours', now() + interval '4 days', '#8b5cf6',
      'Fellowship', 82, now() - interval '20 hours'
    ),

  -- ===========================================================================
  -- 4. ICEBREAKERS (Tiles)
  -- ===========================================================================
    (
      'c4000000-0000-0000-0000-000000000001',
      v_author_id, v_church_id, 'fellowship',
      'How is your spirit feeling walking into fellowship today?',
      'public', 'icebreaker', false, null, true, false,
      false, now() - interval '6 hours', now() + interval '7 days', '#f59e0b',
      'Icebreaker', 142, now() - interval '6 hours'
    ),
    (
      'c4000000-0000-0000-0000-000000000002',
      v_author_id, v_church_id, 'worship',
      'What is your go-to way to connect with God first thing in the morning?',
      'public', 'icebreaker', false, null, false, false,
      false, now() - interval '14 hours', now() + interval '7 days', '#06b6d4',
      'Icebreaker', 118, now() - interval '14 hours'
    ),
    (
      'c4000000-0000-0000-0000-000000000003',
      v_author_id, v_church_id, 'fellowship',
      'Sunday afternoon vibes after church service:',
      'public', 'icebreaker', false, null, false, false,
      false, now() - interval '18 hours', now() + interval '7 days', '#10b981',
      'Icebreaker', 163, now() - interval '18 hours'
    )
  ON CONFLICT (id) DO UPDATE SET
    text_content = EXCLUDED.text_content,
    poll_type = EXCLUDED.poll_type,
    is_quiz = EXCLUDED.is_quiz,
    quiz_explanation = EXCLUDED.quiz_explanation,
    poll_anonymous = EXCLUDED.poll_anonymous,
    poll_multi_select = EXCLUDED.poll_multi_select,
    hide_results_until_vote = EXCLUDED.hide_results_until_vote,
    poll_expires_at = EXCLUDED.poll_expires_at,
    poll_accent = EXCLUDED.poll_accent,
    poll_category = EXCLUDED.poll_category,
    total_votes_count = EXCLUDED.total_votes_count;

  -- ===========================================================================
  -- 5. RESULTS & CLOSED POLLS (List-rich with Winner Badge)
  -- ===========================================================================
  INSERT INTO public.posts (
    id, author_id, church_id, category_id, text_content, visibility,
    poll_type, is_quiz, quiz_explanation, poll_anonymous, poll_multi_select,
    hide_results_until_vote, poll_starts_at, poll_expires_at, poll_closed_at,
    poll_accent, poll_category, total_votes_count, created_at
  )
  VALUES
    (
      'c5000000-0000-0000-0000-000000000001',
      v_author_id, v_church_id, 'worship',
      'Annual Praise Night Theme Vote: Which theme should headline our December Kesha?',
      'public', 'survey', false, null, false, false,
      false, now() - interval '6 days', now() - interval '1 day', now() - interval '1 day',
      '#10b981', 'Worship', 248, now() - interval '6 days'
    ),
    (
      'c5000000-0000-0000-0000-000000000002',
      v_author_id, v_church_id, 'bible-study',
      'Completed Quiz: How many loaves and fishes did the boy bring before Jesus fed the 5,000?',
      'public', 'quiz', true,
      'John 6:9 — "Here is a boy with five small barley loaves and two small fish, but how far will they go among so many?"',
      false, false, false, now() - interval '5 days', now() - interval '2 days', now() - interval '2 days',
      '#f59e0b', 'Bible Quiz', 195, now() - interval '5 days'
    )
  ON CONFLICT (id) DO UPDATE SET
    text_content = EXCLUDED.text_content,
    poll_type = EXCLUDED.poll_type,
    is_quiz = EXCLUDED.is_quiz,
    poll_expires_at = EXCLUDED.poll_expires_at,
    poll_closed_at = EXCLUDED.poll_closed_at,
    poll_accent = EXCLUDED.poll_accent,
    poll_category = EXCLUDED.poll_category,
    total_votes_count = EXCLUDED.total_votes_count;

  -- ===========================================================================
  -- OPTIONS FOR ALL SEEDED POLLS
  -- ===========================================================================
  INSERT INTO public.poll_options (id, post_id, label, image_url, is_correct, position, vote_count)
  VALUES
    ('d1000001-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Way Maker (Swahili & English Medley)', null, false, 0, 38),
    ('d1000001-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Nakuabudu (East African Worship Anthem)', null, false, 1, 29),
    ('d1000001-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Goodness of God (Acoustic Choir Intro)', null, false, 2, 21),

    ('d1000002-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', '12:30 PM EAT — Lunch Hour Prayer', null, false, 0, 34),
    ('d1000002-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', '1:00 PM EAT — Midday Breakthrough', null, false, 1, 22),
    ('d1000002-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', '5:30 PM EAT — Evening Commute Altar', null, false, 2, 8),

    ('d1000003-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Prophet Isaiah', null, false, 0, 14),
    ('d1000003-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'Prophet Elijah', null, true, 1, 79),
    ('d1000003-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Prophet Elisha', null, false, 2, 19),

    ('d1000004-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Kibera & Lang''ata Children''s Homes', null, false, 0, 35),
    ('d1000004-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', 'Mathare Maternal & Widows Support', null, false, 1, 26),
    ('d1000004-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004', 'Kenyatta Hospital Caregivers Packages', null, false, 2, 18),

    ('d2000001-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'The Breastplate of Righteousness', null, false, 0, 18),
    ('d2000001-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'The Shield of Faith', null, false, 1, 24),
    ('d2000001-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000001', 'The Sword of the Spirit', null, true, 2, 111),
    ('d2000001-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000001', 'The Belt of Truth', null, false, 3, 12),

    ('d2000002-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', 'Cornelius the Centurion', null, false, 0, 15),
    ('d2000002-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'The Ethiopian Eunuch (Royal Treasurer)', null, true, 1, 68),
    ('d2000002-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002', 'Sergius Paulus of Cyprus', null, false, 2, 11),

    ('d2000003-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000003', 'Turning Water into Wine at Cana', null, false, 0, 29),
    ('d2000003-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000003', 'Feeding the 5,000 with Loaves & Fishes', null, true, 1, 86),
    ('d2000003-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000003', 'Walking on Water in Galilee', null, false, 2, 23),

    ('d3000001-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', '8:00 AM – Early Glory Service', null, false, 0, 42),
    ('d3000001-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000001', '10:00 AM – Family & Youth Service', null, false, 1, 68),
    ('d3000001-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000001', '12:00 PM – Midday Overflow Service', null, false, 2, 29),

    ('d3000002-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'Book of Acts (Early Church Power)', null, false, 0, 51),
    ('d3000002-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000002', 'Epistle to the Romans (Gospel Foundations)', null, false, 1, 24),
    ('d3000002-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000002', 'Book of James (Faith in Action)', null, false, 2, 18),

    ('d3000003-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003', 'Karura Forest Nature Sanctuary', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80', false, 0, 54),
    ('d3000003-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000003', 'Lake Naivasha Lakeside Camp', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80', false, 1, 46),
    ('d3000003-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000003', 'Ngong Hills Sunset Amphitheatre', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80', false, 2, 24),

    ('d3000004-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000004', 'Biblical Financial Stewardship & Investing', null, false, 0, 34),
    ('d3000004-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000004', 'Christian Dating, Courtship & Marriage Prep', null, false, 1, 29),
    ('d3000004-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000004', 'Tech, Career Mentorship & Entrepreneurship', null, false, 2, 19),

    ('d4000001-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', '🔥 On fire & grateful for God''s grace', null, false, 0, 58),
    ('d4000001-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000001', '🕊️ Seeking quiet peace & renewal', null, false, 1, 41),
    ('d4000001-0000-0000-0000-000000000003', 'c4000000-0000-0000-0000-000000000001', '🙏 Standing in prayer for a breakthrough', null, false, 2, 29),
    ('d4000001-0000-0000-0000-000000000004', 'c4000000-0000-0000-0000-000000000001', '💪 Ready to serve & encourage someone', null, false, 3, 14),

    ('d4000002-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000002', '🎶 Worship playlist on full volume', null, false, 0, 44),
    ('d4000002-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000002', '📖 Reading a chapter in Psalms or Proverbs', null, false, 1, 39),
    ('d4000002-0000-0000-0000-000000000003', 'c4000000-0000-0000-0000-000000000002', '☕ Quiet prayer over morning chai/coffee', null, false, 2, 35),

    ('d4000003-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000003', '🍛 Nyama choma & fellowship with family', null, false, 0, 67),
    ('d4000003-0000-0000-0000-000000000002', 'c4000000-0000-0000-0000-000000000003', '😴 Legendary 2-hour Sunday afternoon nap', null, false, 1, 59),
    ('d4000003-0000-0000-0000-000000000003', 'c4000000-0000-0000-0000-000000000003', '🎤 Choir & youth ministry rehearsal', null, false, 2, 37),

    ('d5000001-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'Jehovah Shammah: The Lord is Here (Ezekiel 48:35)', null, false, 0, 142),
    ('d5000001-0000-0000-0000-000000000002', 'c5000000-0000-0000-0000-000000000001', 'Streams of Living Water (John 7:38)', null, false, 1, 64),
    ('d5000001-0000-0000-0000-000000000003', 'c5000000-0000-0000-0000-000000000001', 'Arise & Shine (Isaiah 60:1)', null, false, 2, 42),

    ('d5000002-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000002', '5 Barley Loaves & 2 Small Fish', null, true, 0, 158),
    ('d5000002-0000-0000-0000-000000000002', 'c5000000-0000-0000-0000-000000000002', '7 Barley Loaves & 3 Small Fish', null, false, 1, 25),
    ('d5000002-0000-0000-0000-000000000003', 'c5000000-0000-0000-0000-000000000002', '12 Loaves & 2 Fish', null, false, 2, 12)
  ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    image_url = EXCLUDED.image_url,
    is_correct = EXCLUDED.is_correct,
    position = EXCLUDED.position,
    vote_count = EXCLUDED.vote_count;

  -- Seed initial quiz score for the author so Weekly Quiz Leaderboard has live data immediately
  INSERT INTO public.quiz_scores (poll_id, user_id, option_id, is_correct, score, answered_at)
  VALUES
    ('c2000000-0000-0000-0000-000000000001', v_author_id, 'd2000001-0000-0000-0000-000000000003', true, 100, now() - interval '2 hours'),
    ('c5000000-0000-0000-0000-000000000002', v_author_id, 'd5000002-0000-0000-0000-000000000001', true, 100, now() - interval '2 days')
  ON CONFLICT (poll_id, user_id) DO NOTHING;

END $$;
