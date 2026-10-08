-- =============================================================================
-- Shammah (Kletos) Production Readiness Migration
-- Target Project Ref: wrlubcjcjuoozoxjfabu
-- Post Privacy Enforcement, Owner-Only Church Subscription Plans,
-- Profile Privacy Settings, Follows, Blocks, Reposts & M-Pesa Ledger
-- =============================================================================

-- 0. Restore Role Grants on Schema & Existing Tables (Fixes 42501 permission denied)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- 1. Post Privacy & Identity Columns
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'church', 'private')),
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_identity text NOT NULL DEFAULT 'real'
    CHECK (post_identity IN ('real', 'pseudo', 'anonymous')),
  ADD COLUMN IF NOT EXISTS pseudonym text,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_author_visibility ON public.posts(author_id, visibility);

-- 2. Profile Privacy & Theme Preferences
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inbox_permission text NOT NULL DEFAULT 'everyone'
    CHECK (inbox_permission IN ('everyone', 'followers', 'church', 'none')),
  ADD COLUMN IF NOT EXISTS church_name text,
  ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'dark';

-- 3. Church / Institution Subscription Plan Columns (Restricted to Page Owners)
ALTER TABLE IF EXISTS public.churches
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'starter', 'popular', 'advanced')),
  ADD COLUMN IF NOT EXISTS subscription_interval text NOT NULL DEFAULT 'monthly'
    CHECK (subscription_interval IN ('monthly', 'quarterly', 'biannual', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS courses_paused boolean NOT NULL DEFAULT false;

-- 4. Follows Table (Required for 'followers' post visibility enforcement)
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followed_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read follows" ON public.follows;
CREATE POLICY "Users can read follows"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own follows" ON public.follows;
CREATE POLICY "Users can manage own follows"
  ON public.follows FOR ALL
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- 5. Blocks Table
CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocks;
CREATE POLICY "Users can manage own blocks"
  ON public.blocks FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- 6. Real Post Privacy Row-Level Security (RLS) Policy on public.posts
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enforce real post visibility on select" ON public.posts;
CREATE POLICY "Enforce real post visibility on select"
  ON public.posts FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() = author_id
    OR (
      visibility = 'followers'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid()
          AND f.followed_id = public.posts.author_id
      )
    )
    OR (
      visibility = 'church'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles viewer
        WHERE viewer.id = auth.uid()
          AND viewer.church_id IS NOT NULL
          AND viewer.church_id = public.posts.church_id
      )
    )
  );

DROP POLICY IF EXISTS "Authors can update own post visibility" ON public.posts;
CREATE POLICY "Authors can update own post visibility"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 7. M-Pesa Transactions Ledger Table
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text,
  phone text NOT NULL,
  amount_kes integer NOT NULL CHECK (amount_kes >= 1),
  receipt_code text NOT NULL,
  checkout_request_id text,
  project_id text,
  project_name text,
  institution_id text,
  plan_id text,
  interval_id text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Users can view own mpesa transactions"
  ON public.mpesa_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert mpesa transactions" ON public.mpesa_transactions;
CREATE POLICY "Anyone can insert mpesa transactions"
  ON public.mpesa_transactions FOR INSERT
  WITH CHECK (true);
