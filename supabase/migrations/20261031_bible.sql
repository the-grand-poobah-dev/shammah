-- Migration: 20261031_bible.sql
-- Complete Bible Canon, Verse Storage, Reading Plans, Highlights & Notes
-- Fully idempotent: safely upgrades existing tables and creates new ones

-- 1. Bible Chapters (cached full chapters across translations)
CREATE TABLE IF NOT EXISTS public.bible_chapters (
  translation text NOT NULL DEFAULT 'KJV',
  book_id text NOT NULL,
  chapter integer NOT NULL,
  verses jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'api',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (translation, book_id, chapter)
);

-- Ensure all columns exist even if table was created in an earlier migration
ALTER TABLE public.bible_chapters ADD COLUMN IF NOT EXISTS book_id text;
ALTER TABLE public.bible_chapters ADD COLUMN IF NOT EXISTS translation text NOT NULL DEFAULT 'KJV';
ALTER TABLE public.bible_chapters ADD COLUMN IF NOT EXISTS chapter integer;
ALTER TABLE public.bible_chapters ADD COLUMN IF NOT EXISTS verses jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bible_chapters ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'api';
ALTER TABLE public.bible_chapters ADD COLUMN IF NOT EXISTS fetched_at timestamptz NOT NULL DEFAULT now();

-- If legacy 'book' column exists without 'book_id', copy it over
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bible_chapters' AND column_name = 'book'
  ) THEN
    UPDATE public.bible_chapters SET book_id = book WHERE book_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bible_chapters_lookup 
  ON public.bible_chapters (book_id, chapter, translation);

ALTER TABLE public.bible_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read bible chapters" ON public.bible_chapters;
CREATE POLICY "Public can read bible chapters"
  ON public.bible_chapters FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Server and authenticated users can insert chapters" ON public.bible_chapters;
CREATE POLICY "Server and authenticated users can insert chapters"
  ON public.bible_chapters FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow chapter update" ON public.bible_chapters;
CREATE POLICY "Allow chapter update"
  ON public.bible_chapters FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- 2. Bible Verses (for full-text search and fine-grained queries)
CREATE TABLE IF NOT EXISTS public.bible_verses (
  id text NOT NULL,
  translation text NOT NULL DEFAULT 'KJV',
  book_id text NOT NULL,
  chapter integer NOT NULL,
  verse integer NOT NULL,
  text text NOT NULL,
  heading text,
  PRIMARY KEY (id)
);

ALTER TABLE public.bible_verses ADD COLUMN IF NOT EXISTS book_id text;
ALTER TABLE public.bible_verses ADD COLUMN IF NOT EXISTS translation text NOT NULL DEFAULT 'KJV';
ALTER TABLE public.bible_verses ADD COLUMN IF NOT EXISTS chapter integer;
ALTER TABLE public.bible_verses ADD COLUMN IF NOT EXISTS verse integer;
ALTER TABLE public.bible_verses ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.bible_verses ADD COLUMN IF NOT EXISTS heading text;

-- If legacy 'book' column exists without 'book_id'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bible_verses' AND column_name = 'book'
  ) THEN
    UPDATE public.bible_verses SET book_id = book WHERE book_id IS NULL;
  END IF;

  -- Add generated tsvector column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bible_verses' AND column_name = 'fts'
  ) THEN
    ALTER TABLE public.bible_verses 
      ADD COLUMN fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(heading, '') || ' ' || coalesce(text, ''))) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bible_verses_ref
  ON public.bible_verses (translation, book_id, chapter, verse);

CREATE INDEX IF NOT EXISTS idx_bible_verses_fts
  ON public.bible_verses USING gin(fts);

ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read bible verses" ON public.bible_verses;
CREATE POLICY "Public can read bible verses"
  ON public.bible_verses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert to bible verses" ON public.bible_verses;
CREATE POLICY "Allow insert to bible verses"
  ON public.bible_verses FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update to bible verses" ON public.bible_verses;
CREATE POLICY "Allow update to bible verses"
  ON public.bible_verses FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- 3. Bible Bookmarks (user specific)
CREATE TABLE IF NOT EXISTS public.bible_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  translation text NOT NULL DEFAULT 'KJV',
  book_id text NOT NULL,
  chapter integer NOT NULL,
  verse integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, translation, book_id, chapter, verse)
);

ALTER TABLE public.bible_bookmarks ADD COLUMN IF NOT EXISTS book_id text;
ALTER TABLE public.bible_bookmarks ADD COLUMN IF NOT EXISTS translation text NOT NULL DEFAULT 'KJV';
ALTER TABLE public.bible_bookmarks ADD COLUMN IF NOT EXISTS chapter integer;
ALTER TABLE public.bible_bookmarks ADD COLUMN IF NOT EXISTS verse integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bible_bookmarks' AND column_name = 'book'
  ) THEN
    UPDATE public.bible_bookmarks SET book_id = book WHERE book_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_user
  ON public.bible_bookmarks (user_id, created_at DESC);

ALTER TABLE public.bible_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users can read own bookmarks"
  ON public.bible_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users can insert own bookmarks"
  ON public.bible_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bible_bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON public.bible_bookmarks FOR DELETE
  USING (auth.uid() = user_id);


-- 4. Bible Highlights (user specific)
CREATE TABLE IF NOT EXISTS public.bible_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  translation text NOT NULL DEFAULT 'KJV',
  book_id text NOT NULL,
  chapter integer NOT NULL,
  verse integer NOT NULL,
  color text NOT NULL DEFAULT 'gold',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, translation, book_id, chapter, verse)
);

ALTER TABLE public.bible_highlights ADD COLUMN IF NOT EXISTS book_id text;
ALTER TABLE public.bible_highlights ADD COLUMN IF NOT EXISTS translation text NOT NULL DEFAULT 'KJV';
ALTER TABLE public.bible_highlights ADD COLUMN IF NOT EXISTS chapter integer;
ALTER TABLE public.bible_highlights ADD COLUMN IF NOT EXISTS verse integer;
ALTER TABLE public.bible_highlights ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'gold';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bible_highlights' AND column_name = 'book'
  ) THEN
    UPDATE public.bible_highlights SET book_id = book WHERE book_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bible_highlights_user
  ON public.bible_highlights (user_id, book_id, chapter);

ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own highlights" ON public.bible_highlights;
CREATE POLICY "Users can read own highlights"
  ON public.bible_highlights FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own highlights" ON public.bible_highlights;
CREATE POLICY "Users can insert own highlights"
  ON public.bible_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own highlights" ON public.bible_highlights;
CREATE POLICY "Users can update own highlights"
  ON public.bible_highlights FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own highlights" ON public.bible_highlights;
CREATE POLICY "Users can delete own highlights"
  ON public.bible_highlights FOR DELETE
  USING (auth.uid() = user_id);


-- 5. Bible Notes (user specific study notes linked to scripture)
CREATE TABLE IF NOT EXISTS public.bible_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_range text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  title text DEFAULT 'Scripture Study Note',
  speaker text DEFAULT '',
  church text DEFAULT '',
  tags text[] DEFAULT ARRAY['#Scripture']::text[],
  color text DEFAULT '#0ea5e9',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS ref_range text;
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS body_md text DEFAULT '';
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS title text DEFAULT 'Scripture Study Note';
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS speaker text DEFAULT '';
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS church text DEFAULT '';
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY['#Scripture']::text[];
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS color text DEFAULT '#0ea5e9';
ALTER TABLE public.bible_notes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bible_notes_user
  ON public.bible_notes (user_id, updated_at DESC);

ALTER TABLE public.bible_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notes" ON public.bible_notes;
CREATE POLICY "Users can read own notes"
  ON public.bible_notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.bible_notes;
CREATE POLICY "Users can insert own notes"
  ON public.bible_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.bible_notes;
CREATE POLICY "Users can update own notes"
  ON public.bible_notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.bible_notes;
CREATE POLICY "Users can delete own notes"
  ON public.bible_notes FOR DELETE
  USING (auth.uid() = user_id);


-- 6. Reading Plans
CREATE TABLE IF NOT EXISTS public.reading_plans (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  days integer NOT NULL DEFAULT 30,
  kind text NOT NULL DEFAULT 'thematic',
  accent text NOT NULL DEFAULT '#0ea5e9',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_plans ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.reading_plans ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.reading_plans ADD COLUMN IF NOT EXISTS days integer DEFAULT 30;
ALTER TABLE public.reading_plans ADD COLUMN IF NOT EXISTS kind text DEFAULT 'thematic';
ALTER TABLE public.reading_plans ADD COLUMN IF NOT EXISTS accent text DEFAULT '#0ea5e9';

ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read reading plans" ON public.reading_plans;
CREATE POLICY "Public can read reading plans"
  ON public.reading_plans FOR SELECT
  USING (true);


-- 7. Reading Plan Days
CREATE TABLE IF NOT EXISTS public.reading_plan_days (
  id bigserial PRIMARY KEY,
  plan_id text NOT NULL REFERENCES public.reading_plans(id) ON DELETE CASCADE,
  day integer NOT NULL,
  refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, day)
);

ALTER TABLE public.reading_plan_days ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE public.reading_plan_days ADD COLUMN IF NOT EXISTS day integer;
ALTER TABLE public.reading_plan_days ADD COLUMN IF NOT EXISTS refs jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_reading_plan_days_lookup
  ON public.reading_plan_days (plan_id, day);

ALTER TABLE public.reading_plan_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read reading plan days" ON public.reading_plan_days;
CREATE POLICY "Public can read reading plan days"
  ON public.reading_plan_days FOR SELECT
  USING (true);


-- 8. Reading Plan Progress
CREATE TABLE IF NOT EXISTS public.reading_plan_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.reading_plans(id) ON DELETE CASCADE,
  day integer NOT NULL,
  completed_on timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_id, day)
);

ALTER TABLE public.reading_plan_progress ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.reading_plan_progress ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE public.reading_plan_progress ADD COLUMN IF NOT EXISTS day integer;
ALTER TABLE public.reading_plan_progress ADD COLUMN IF NOT EXISTS completed_on timestamptz DEFAULT now();

ALTER TABLE public.reading_plan_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own plan progress" ON public.reading_plan_progress;
CREATE POLICY "Users can read own plan progress"
  ON public.reading_plan_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plan progress" ON public.reading_plan_progress;
CREATE POLICY "Users can insert own plan progress"
  ON public.reading_plan_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plan progress" ON public.reading_plan_progress;
CREATE POLICY "Users can delete own plan progress"
  ON public.reading_plan_progress FOR DELETE
  USING (auth.uid() = user_id);


-- 9. Verse of the Day
CREATE TABLE IF NOT EXISTS public.verse_of_day (
  day date PRIMARY KEY DEFAULT CURRENT_DATE,
  ref text NOT NULL,
  translation text NOT NULL DEFAULT 'KJV',
  text text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verse_of_day ADD COLUMN IF NOT EXISTS day date DEFAULT CURRENT_DATE;
ALTER TABLE public.verse_of_day ADD COLUMN IF NOT EXISTS ref text;
ALTER TABLE public.verse_of_day ADD COLUMN IF NOT EXISTS translation text DEFAULT 'KJV';
ALTER TABLE public.verse_of_day ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.verse_of_day ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.verse_of_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read verse of the day" ON public.verse_of_day;
CREATE POLICY "Public can read verse of the day"
  ON public.verse_of_day FOR SELECT
  USING (true);


-- 10. Seed 6 Official Reading Plans
INSERT INTO public.reading_plans (id, title, description, days, kind, accent)
VALUES
  ('bible-year', 'Bible in a Year', 'Read through the entire canon of Scripture in 365 days with balanced Old and New Testament portions.', 365, 'chronological', '#eab308'),
  ('nt-90', 'New Testament in 90 Days', 'Journey through the life of Jesus, Acts of the Apostles, and Apostolic Epistles in one quarter.', 90, 'testament', '#06b6d4'),
  ('psalms-proverbs', 'Psalms and Proverbs', 'Daily devotional wisdom and worship from Israel''s hymnal and Solomon''s proverbs.', 60, 'wisdom', '#10b981'),
  ('gospels-30', 'Gospels in 30 Days', 'Walk with Christ through Matthew, Mark, Luke, and John and witness His ministry, miracles, and resurrection.', 30, 'thematic', '#ec4899'),
  ('advent-hope', 'Advent & Prophecy', 'Messianic prophecies fulfilled in Jesus Christ, from Isaiah to Bethlehem to the throne of God.', 25, 'seasonal', '#8b5cf6'),
  ('prayer-power', 'Power of Biblical Prayer', 'Study the transformative prayers of Abraham, Moses, David, Elijah, Paul, and Jesus Himself.', 21, 'devotional', '#f97316')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  days = EXCLUDED.days,
  accent = EXCLUDED.accent;

-- Seed Sample Days for Reading Plans
INSERT INTO public.reading_plan_days (plan_id, day, refs) VALUES
  ('bible-year', 1, '[{"book":"Genesis","chapter":1},{"book":"Matthew","chapter":1}]'::jsonb),
  ('bible-year', 2, '[{"book":"Genesis","chapter":2},{"book":"Matthew","chapter":2}]'::jsonb),
  ('bible-year', 3, '[{"book":"Genesis","chapter":3},{"book":"Matthew","chapter":3}]'::jsonb),
  ('bible-year', 4, '[{"book":"Genesis","chapter":4},{"book":"Matthew","chapter":4}]'::jsonb),
  ('bible-year', 5, '[{"book":"Genesis","chapter":5},{"book":"Matthew","chapter":5}]'::jsonb),
  ('nt-90', 1, '[{"book":"Matthew","chapter":1},{"book":"Matthew","chapter":2}]'::jsonb),
  ('nt-90', 2, '[{"book":"Matthew","chapter":3},{"book":"Matthew","chapter":4}]'::jsonb),
  ('nt-90', 3, '[{"book":"Matthew","chapter":5},{"book":"Matthew","chapter":6}]'::jsonb),
  ('psalms-proverbs', 1, '[{"book":"Psalms","chapter":1},{"book":"Proverbs","chapter":1}]'::jsonb),
  ('psalms-proverbs', 2, '[{"book":"Psalms","chapter":23},{"book":"Proverbs","chapter":3}]'::jsonb),
  ('psalms-proverbs', 3, '[{"book":"Psalms","chapter":91},{"book":"Proverbs","chapter":4}]'::jsonb),
  ('gospels-30', 1, '[{"book":"John","chapter":1}]'::jsonb),
  ('gospels-30', 2, '[{"book":"John","chapter":2},{"book":"John","chapter":3}]'::jsonb),
  ('gospels-30', 3, '[{"book":"John","chapter":4}]'::jsonb),
  ('advent-hope', 1, '[{"book":"Isaiah","chapter":9},{"book":"Isaiah","chapter":11}]'::jsonb),
  ('advent-hope', 2, '[{"book":"Micah","chapter":5},{"book":"Luke","chapter":1}]'::jsonb),
  ('prayer-power', 1, '[{"book":"Matthew","chapter":6}]'::jsonb),
  ('prayer-power', 2, '[{"book":"Philippians","chapter":4}]'::jsonb),
  ('prayer-power', 3, '[{"book":"Ephesians","chapter":3}]'::jsonb)
ON CONFLICT (plan_id, day) DO UPDATE SET refs = EXCLUDED.refs;

-- Seed Sample Verse of the Day
INSERT INTO public.verse_of_day (day, ref, translation, text, image_url)
VALUES
  (CURRENT_DATE, 'John 3:16', 'KJV', 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200'),
  ((CURRENT_DATE - 1), 'Philippians 4:13', 'KJV', 'I can do all things through Christ which strengtheneth me.', 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1200'),
  ((CURRENT_DATE - 2), 'Psalms 23:1', 'KJV', 'The LORD is my shepherd; I shall not want.', 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1200')
ON CONFLICT (day) DO UPDATE SET
  ref = EXCLUDED.ref,
  translation = EXCLUDED.translation,
  text = EXCLUDED.text,
  image_url = EXCLUDED.image_url;
