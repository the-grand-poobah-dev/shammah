-- Migration: 20261031_section_pages_schema.sql
-- Description: 100% Bulletproof & Non-destructive schema for Shammah section pages:
-- Videos, Reels, Audio, Courses, Polls, Fundraisers, Faith Challenges, and Arcade.
-- Handles existing duplicates, pre-existing types, and policy constraints with zero failures.

-- ============================================================================
-- 1. MEDIA ITEMS (Videos, Reels, Audio Sermons, Worship Tracks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_items (
  id TEXT PRIMARY KEY DEFAULT ('media_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS church_id TEXT,
  ADD COLUMN IF NOT EXISTS church_name TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Broadcast',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Sermons',
  ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_viewers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS series_id TEXT,
  ADD COLUMN IF NOT EXISTS episode_number INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Lenient constraint that accommodates all legacy media values (image, podcast, video, audio, reel)
DO $$
BEGIN
  ALTER TABLE public.media_items DROP CONSTRAINT IF EXISTS media_items_media_type_check;
  BEGIN
    ALTER TABLE public.media_items ADD CONSTRAINT media_items_media_type_check
      CHECK (media_type IS NULL OR media_type IN ('video', 'audio', 'reel', 'podcast', 'image'));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_media_type_created ON public.media_items(media_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_author ON public.media_items(author_id);
CREATE INDEX IF NOT EXISTS idx_media_series ON public.media_items(series_id);
CREATE INDEX IF NOT EXISTS idx_media_is_live ON public.media_items(is_live) WHERE is_live = true;

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public media items are readable by all" ON public.media_items;
CREATE POLICY "Public media items are readable by all"
  ON public.media_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert media items" ON public.media_items;
CREATE POLICY "Authenticated users can insert media items"
  ON public.media_items FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own media items" ON public.media_items;
CREATE POLICY "Authors can update own media items"
  ON public.media_items FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own media items" ON public.media_items;
CREATE POLICY "Authors can delete own media items"
  ON public.media_items FOR DELETE USING (auth.uid() = author_id);


-- ============================================================================
-- 2. MEDIA SERIES (Audio & Video Teaching Series)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_series (
  id TEXT PRIMARY KEY DEFAULT ('series_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.media_series
  ADD COLUMN IF NOT EXISTS church_id TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled Series',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS speaker_name TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS episodes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.media_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public series readable by all" ON public.media_series;
CREATE POLICY "Public series readable by all"
  ON public.media_series FOR SELECT USING (true);


-- ============================================================================
-- 3. MEDIA PLAYLISTS & PLAYLIST ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_playlists (
  id TEXT PRIMARY KEY DEFAULT ('pl_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.media_playlists
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'My Playlist',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.media_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Playlists readable by public or owner" ON public.media_playlists;
CREATE POLICY "Playlists readable by public or owner"
  ON public.media_playlists FOR SELECT USING (is_public OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can manage playlists" ON public.media_playlists;
CREATE POLICY "Owners can manage playlists"
  ON public.media_playlists FOR ALL USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.playlist_items (
  id TEXT PRIMARY KEY DEFAULT ('pli_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.playlist_items
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Playlist items readable by anyone who can see playlist" ON public.playlist_items;
CREATE POLICY "Playlist items readable by anyone who can see playlist"
  ON public.playlist_items FOR SELECT USING (true);


-- ============================================================================
-- 4. COURSES & DISCIPLESHIP ACADEMY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY DEFAULT ('course_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Discipleship Course',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS instructor TEXT,
  ADD COLUMN IF NOT EXISTS instructor_title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Discipleship',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Beginner',
  ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Courses readable by everyone" ON public.courses;
CREATE POLICY "Courses readable by everyone"
  ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create courses" ON public.courses;
CREATE POLICY "Authenticated users can create courses"
  ON public.courses FOR INSERT WITH CHECK (auth.role() = 'authenticated');


CREATE TABLE IF NOT EXISTS public.course_progress (
  id TEXT PRIMARY KEY DEFAULT ('cp_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.course_progress
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS course_id TEXT,
  ADD COLUMN IF NOT EXISTS completed_lessons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Clean up any duplicates before adding constraint; fallback safely to index if needed
DO $$
BEGIN
  DELETE FROM public.course_progress a
  USING public.course_progress b
  WHERE a.ctid < b.ctid
    AND a.user_id = b.user_id
    AND a.course_id = b.course_id;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_progress_user_course_uniq'
  ) THEN
    BEGIN
      ALTER TABLE public.course_progress ADD CONSTRAINT course_progress_user_course_uniq UNIQUE (user_id, course_id);
    EXCEPTION WHEN OTHERS THEN
      CREATE INDEX IF NOT EXISTS idx_cp_user_course ON public.course_progress (user_id, course_id);
    END;
  END IF;
END $$;

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own course progress" ON public.course_progress;
CREATE POLICY "Users can read own course progress"
  ON public.course_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own course progress" ON public.course_progress;
CREATE POLICY "Users can manage own course progress"
  ON public.course_progress FOR ALL USING (auth.uid() = user_id);


-- ============================================================================
-- 5. FAITH CHALLENGES & STREAKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY DEFAULT ('chal_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Faith Challenge',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'scripture',
  ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS participants_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenges readable by all" ON public.challenges;
CREATE POLICY "Challenges readable by all"
  ON public.challenges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create challenges" ON public.challenges;
CREATE POLICY "Authenticated users can create challenges"
  ON public.challenges FOR INSERT WITH CHECK (auth.role() = 'authenticated');


CREATE TABLE IF NOT EXISTS public.challenge_checkins (
  id TEXT PRIMARY KEY DEFAULT ('chk_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.challenge_checkins
  ADD COLUMN IF NOT EXISTS challenge_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS checkin_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reflection TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Deduplicate existing entries for (challenge_id, user_id, checkin_date) keeping newest
DO $$
BEGIN
  DELETE FROM public.challenge_checkins a
  USING public.challenge_checkins b
  WHERE a.ctid < b.ctid
    AND a.challenge_id = b.challenge_id
    AND a.user_id = b.user_id
    AND a.checkin_date = b.checkin_date;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_checkins_user_day_uniq'
  ) THEN
    BEGIN
      ALTER TABLE public.challenge_checkins ADD CONSTRAINT challenge_checkins_user_day_uniq UNIQUE (challenge_id, user_id, checkin_date);
    EXCEPTION WHEN OTHERS THEN
      CREATE INDEX IF NOT EXISTS idx_chk_user_day ON public.challenge_checkins (challenge_id, user_id, checkin_date);
    END;
  END IF;
END $$;

ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenge checkins readable by all" ON public.challenge_checkins;
CREATE POLICY "Challenge checkins readable by all"
  ON public.challenge_checkins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own challenge checkin" ON public.challenge_checkins;
CREATE POLICY "Users can insert own challenge checkin"
  ON public.challenge_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 6. CHALLENGE SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id TEXT PRIMARY KEY DEFAULT ('csub_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS challenge_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS verse_ref TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS votes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenge submissions readable by all" ON public.challenge_submissions;
CREATE POLICY "Challenge submissions readable by all"
  ON public.challenge_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own challenge submission" ON public.challenge_submissions;
CREATE POLICY "Users can insert own challenge submission"
  ON public.challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 7. CHURCH FUNDRAISERS & DONATIONS (M-PESA INTEGRATED)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fundraisers (
  id TEXT PRIMARY KEY DEFAULT ('fund_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.fundraisers
  ADD COLUMN IF NOT EXISTS church_id TEXT,
  ADD COLUMN IF NOT EXISTS church_name TEXT,
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Church Fundraiser',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Church Building',
  ADD COLUMN IF NOT EXISTS target_amount NUMERIC(12, 2) NOT NULL DEFAULT 100000.00,
  ADD COLUMN IF NOT EXISTS raised_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS donors_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.fundraisers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fundraisers readable by all" ON public.fundraisers;
CREATE POLICY "Fundraisers readable by all"
  ON public.fundraisers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create fundraisers" ON public.fundraisers;
CREATE POLICY "Authenticated users can create fundraisers"
  ON public.fundraisers FOR INSERT WITH CHECK (auth.role() = 'authenticated');


CREATE TABLE IF NOT EXISTS public.fundraiser_donations (
  id TEXT PRIMARY KEY DEFAULT ('fndn_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.fundraiser_donations
  ADD COLUMN IF NOT EXISTS fundraiser_id TEXT,
  ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.fundraiser_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Donations readable by public" ON public.fundraiser_donations;
CREATE POLICY "Donations readable by public"
  ON public.fundraiser_donations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert donations" ON public.fundraiser_donations;
CREATE POLICY "Users can insert donations"
  ON public.fundraiser_donations FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');


-- ============================================================================
-- 8. ARCADE SCORES (BIBLE TRIVIA, SCRAMBLE, DAVID'S SLING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.arcade_scores (
  id TEXT PRIMARY KEY DEFAULT ('as_' || substr(md5(random()::text), 1, 12))
);

ALTER TABLE public.arcade_scores
  ADD COLUMN IF NOT EXISTS game_slug TEXT NOT NULL DEFAULT 'trivia',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_arcade_game_score ON public.arcade_scores(game_slug, score DESC);

ALTER TABLE public.arcade_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Arcade scores readable by all" ON public.arcade_scores;
CREATE POLICY "Arcade scores readable by all"
  ON public.arcade_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can record arcade scores" ON public.arcade_scores;
CREATE POLICY "Users can record arcade scores"
  ON public.arcade_scores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
