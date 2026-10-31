-- ==============================================================================
-- Migration: 20261107_live.sql
-- Description: Live broadcast tables (live_streams, live_chat_messages,
--              live_moderators, live_bans), posts reel columns, RLS, indexes & RPCs.
-- Fully idempotent & safe to run directly in Supabase SQL Editor.
-- ==============================================================================

-- 1. Ensure columns on posts for Reels cover frame, aspect, duration & comments toggle
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS thumb_url text,
  ADD COLUMN IF NOT EXISTS aspect text DEFAULT '9:16',
  ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sound_title text DEFAULT 'Original Sound';

-- Ensure posts media_type check constraint allows 'reel' and 'live'
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'posts'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'media_type'
  ) LOOP
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_media_type_check
  CHECK (
    media_type IS NULL
    OR media_type IN ('image', 'video', 'audio', 'reel', 'podcast', 'gif', 'live')
  );

-- 2. LIVE STREAMS TABLE
CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  thumb_url text,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('scheduled', 'live', 'ended')),
  room_name text NOT NULL UNIQUE,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'church', 'private')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  scheduled_for timestamptz,
  viewer_count integer NOT NULL DEFAULT 0,
  peak_viewers integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  replay_media_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_host ON public.live_streams (host_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_church ON public.live_streams (church_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_room ON public.live_streams (room_name);

-- 3. LIVE CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_pinned boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_live_chat_stream_created ON public.live_chat_messages (stream_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_live_chat_user ON public.live_chat_messages (user_id);

-- 4. LIVE MODERATORS TABLE
CREATE TABLE IF NOT EXISTS public.live_moderators (
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);

-- 5. LIVE BANS TABLE
CREATE TABLE IF NOT EXISTS public.live_bans (
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  banned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, user_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_bans ENABLE ROW LEVEL SECURITY;

-- live_streams policies
DROP POLICY IF EXISTS "Public live streams are readable by everyone" ON public.live_streams;
CREATE POLICY "Public live streams are readable by everyone"
  ON public.live_streams FOR SELECT
  USING (
    visibility = 'public'
    OR host_id = auth.uid()
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid() AND followed_id = live_streams.host_id
      )
    )
    OR (
      visibility = 'church'
      AND church_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.church_members
        WHERE church_id = live_streams.church_id AND user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create live streams" ON public.live_streams;
CREATE POLICY "Authenticated users can create live streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update their live streams" ON public.live_streams;
CREATE POLICY "Hosts can update their live streams"
  ON public.live_streams FOR UPDATE
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'pastor')
    )
  );

DROP POLICY IF EXISTS "Hosts can delete their live streams" ON public.live_streams;
CREATE POLICY "Hosts can delete their live streams"
  ON public.live_streams FOR DELETE
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- live_chat_messages policies
DROP POLICY IF EXISTS "Stream viewers can read chat messages" ON public.live_chat_messages;
CREATE POLICY "Stream viewers can read chat messages"
  ON public.live_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_chat_messages.stream_id
    )
  );

DROP POLICY IF EXISTS "Non-banned authenticated users can insert chat messages" ON public.live_chat_messages;
CREATE POLICY "Non-banned authenticated users can insert chat messages"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.live_bans
      WHERE stream_id = live_chat_messages.stream_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts and moderators can update chat messages" ON public.live_chat_messages;
CREATE POLICY "Hosts and moderators can update chat messages"
  ON public.live_chat_messages FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_chat_messages.stream_id AND ls.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.live_moderators lm
      WHERE lm.stream_id = live_chat_messages.stream_id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts and moderators can delete chat messages" ON public.live_chat_messages;
CREATE POLICY "Hosts and moderators can delete chat messages"
  ON public.live_chat_messages FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_chat_messages.stream_id AND ls.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.live_moderators lm
      WHERE lm.stream_id = live_chat_messages.stream_id AND lm.user_id = auth.uid()
    )
  );

-- live_moderators policies
DROP POLICY IF EXISTS "Anyone can view live moderators" ON public.live_moderators;
CREATE POLICY "Anyone can view live moderators"
  ON public.live_moderators FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hosts can manage moderators" ON public.live_moderators;
CREATE POLICY "Hosts can manage moderators"
  ON public.live_moderators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_moderators.stream_id AND ls.host_id = auth.uid()
    )
  );

-- live_bans policies
DROP POLICY IF EXISTS "Hosts and moderators can view bans" ON public.live_bans;
CREATE POLICY "Hosts and moderators can view bans"
  ON public.live_bans FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_bans.stream_id AND ls.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.live_moderators lm
      WHERE lm.stream_id = live_bans.stream_id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts and moderators can manage bans" ON public.live_bans;
CREATE POLICY "Hosts and moderators can manage bans"
  ON public.live_bans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls
      WHERE ls.id = live_bans.stream_id AND ls.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.live_moderators lm
      WHERE lm.stream_id = live_bans.stream_id AND lm.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- RPCs: Stale Stream Sweeper & Stream Reactions
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sweep_stale_live_streams()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.live_streams
  SET status = 'ended',
      ended_at = coalesce(ended_at, now()),
      updated_at = now()
  WHERE status = 'live'
    AND updated_at < (now() - interval '6 hours');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_stream_like(p_stream_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_likes integer;
BEGIN
  UPDATE public.live_streams
  SET like_count = coalesce(like_count, 0) + 1,
      updated_at = now()
  WHERE id = p_stream_id
  RETURNING like_count INTO v_likes;
  
  RETURN coalesce(v_likes, 0);
END;
$$;
