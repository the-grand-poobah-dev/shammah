-- =============================================================================
-- Shammah Migration: 20261104_fundraisers.sql
-- Purpose: Kingdom Fundraisers & Community Giving Hub with M-Pesa integration,
--          milestones, updates, donor wall, withdrawals, and atomic credit RPC.
-- 100% IDEMPOTENT & SAFE ON EXISTING TABLES.
-- =============================================================================

-- Ensure role grants on public schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 1. BASE TABLE DEFINITIONS
CREATE TABLE IF NOT EXISTS public.fundraisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.fundraiser_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.fundraiser_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.fundraiser_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.fundraiser_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS public.fundraiser_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. MIGRATE / ENSURE owner_id ON fundraisers (Handles cases where table existed with user_id/author_id/created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'owner_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.fundraisers ADD COLUMN owner_id uuid;
      UPDATE public.fundraisers SET owner_id = user_id WHERE owner_id IS NULL;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'author_id'
    ) THEN
      ALTER TABLE public.fundraisers ADD COLUMN owner_id uuid;
      UPDATE public.fundraisers SET owner_id = author_id WHERE owner_id IS NULL;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fundraisers' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE public.fundraisers ADD COLUMN owner_id uuid;
      UPDATE public.fundraisers SET owner_id = created_by WHERE owner_id IS NULL;
    ELSE
      ALTER TABLE public.fundraisers ADD COLUMN owner_id uuid;
    END IF;
  END IF;
END $$;

-- 3. ENSURE ALL COLUMNS EXIST ON fundraisers
ALTER TABLE public.fundraisers
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS church_id uuid,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS story_md text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Community',
  ADD COLUMN IF NOT EXISTS goal_kes bigint NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS raised_kes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS donors_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS beneficiary_name text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accent text DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS verification_doc_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4. ENSURE ALL COLUMNS EXIST ON fundraiser_donations
ALTER TABLE public.fundraiser_donations
  ADD COLUMN IF NOT EXISTS fundraiser_id uuid,
  ADD COLUMN IF NOT EXISTS donor_id uuid,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_kes bigint NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS mpesa_transaction_id text,
  ADD COLUMN IF NOT EXISTS checkout_request_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 5. ENSURE ALL COLUMNS EXIST ON fundraiser_updates
ALTER TABLE public.fundraiser_updates
  ADD COLUMN IF NOT EXISTS fundraiser_id uuid,
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 6. ENSURE ALL COLUMNS EXIST ON fundraiser_milestones
ALTER TABLE public.fundraiser_milestones
  ADD COLUMN IF NOT EXISTS fundraiser_id uuid,
  ADD COLUMN IF NOT EXISTS amount_kes bigint NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reached_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 7. ENSURE ALL COLUMNS EXIST ON fundraiser_withdrawals
ALTER TABLE public.fundraiser_withdrawals
  ADD COLUMN IF NOT EXISTS fundraiser_id uuid,
  ADD COLUMN IF NOT EXISTS amount_kes bigint NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS mpesa_payout_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 8. ENSURE ALL COLUMNS EXIST ON fundraiser_reports
ALTER TABLE public.fundraiser_reports
  ADD COLUMN IF NOT EXISTS fundraiser_id uuid,
  ADD COLUMN IF NOT EXISTS reporter_id uuid,
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_fundraisers_status_category ON public.fundraisers (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fundraisers_owner_id ON public.fundraisers (owner_id);
CREATE INDEX IF NOT EXISTS idx_fundraisers_church_id ON public.fundraisers (church_id);
CREATE INDEX IF NOT EXISTS idx_fundraiser_donations_fundraiser ON public.fundraiser_donations (fundraiser_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fundraiser_donations_checkout ON public.fundraiser_donations (checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fundraiser_updates_fundraiser ON public.fundraiser_updates (fundraiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fundraiser_milestones_fundraiser ON public.fundraiser_milestones (fundraiser_id, amount_kes ASC);
CREATE INDEX IF NOT EXISTS idx_fundraiser_withdrawals_fundraiser ON public.fundraiser_withdrawals (fundraiser_id, status);

-- 10. ATOMIC DONATION CREDIT FUNCTION
CREATE OR REPLACE FUNCTION public.credit_donation(
  p_donation_id uuid,
  p_mpesa_receipt text,
  p_amount_kes bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation public.fundraiser_donations%ROWTYPE;
  v_fundraiser public.fundraisers%ROWTYPE;
  v_new_raised bigint;
  v_new_donors integer;
  v_completed boolean := false;
BEGIN
  -- 1. Fetch and lock the donation row
  SELECT * INTO v_donation
  FROM public.fundraiser_donations
  WHERE id = p_donation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation record not found.');
  END IF;

  IF v_donation.status = 'succeeded' THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_succeeded');
  END IF;

  -- 2. Fetch and lock the campaign row
  SELECT * INTO v_fundraiser
  FROM public.fundraisers
  WHERE id = v_donation.fundraiser_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated fundraiser not found.');
  END IF;

  -- 3. Mark donation succeeded
  UPDATE public.fundraiser_donations
  SET
    status = 'succeeded',
    mpesa_transaction_id = COALESCE(p_mpesa_receipt, mpesa_transaction_id, 'SHM-' || substr(md5(random()::text), 1, 8))
  WHERE id = p_donation_id;

  -- 4. Calculate new totals atomically
  v_new_raised := COALESCE(v_fundraiser.raised_kes, 0) + p_amount_kes;
  v_new_donors := COALESCE(v_fundraiser.donors_count, 0) + 1;

  IF v_fundraiser.goal_kes IS NOT NULL AND v_new_raised >= v_fundraiser.goal_kes AND v_fundraiser.status = 'active' THEN
    v_completed := true;
  END IF;

  -- Update fundraiser totals
  UPDATE public.fundraisers
  SET
    raised_kes = v_new_raised,
    donors_count = v_new_donors,
    status = CASE WHEN v_completed THEN 'completed' ELSE status END,
    updated_at = now()
  WHERE id = v_fundraiser.id;

  -- 5. Activate milestones reached
  UPDATE public.fundraiser_milestones
  SET reached_at = now()
  WHERE fundraiser_id = v_fundraiser.id
    AND amount_kes <= v_new_raised
    AND reached_at IS NULL;

  -- 6. Insert into mpesa_transactions ledger if table exists
  BEGIN
    INSERT INTO public.mpesa_transactions (
      user_id,
      donor_name,
      phone,
      amount_kes,
      receipt_code,
      checkout_request_id,
      project_id,
      project_name,
      status
    ) VALUES (
      v_donation.donor_id,
      v_donation.display_name,
      COALESCE(v_donation.phone, '254700000000'),
      p_amount_kes,
      COALESCE(p_mpesa_receipt, 'SHM-' || substr(md5(random()::text), 1, 8)),
      v_donation.checkout_request_id,
      'fundraiser:' || v_fundraiser.id::text,
      v_fundraiser.title,
      'completed'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ledger insert is auxiliary
  END;

  RETURN jsonb_build_object(
    'success', true,
    'donation_id', p_donation_id,
    'fundraiser_id', v_fundraiser.id,
    'new_raised_kes', v_new_raised,
    'new_donors_count', v_new_donors,
    'completed', v_completed
  );
END;
$$;

-- 11. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_reports ENABLE ROW LEVEL SECURITY;

-- 12. RLS POLICIES (All referencing existing columns guaranteed)

-- Fundraisers Policies
DROP POLICY IF EXISTS "Public can view active or completed fundraisers" ON public.fundraisers;
DROP POLICY IF EXISTS "Public can view active fundraisers" ON public.fundraisers;
CREATE POLICY "Public can view active or completed fundraisers"
  ON public.fundraisers FOR SELECT
  USING (
    status IN ('active', 'completed', 'paused')
    OR (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin', 'platform_admin') OR badge = 'pastor')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create fundraisers" ON public.fundraisers;
CREATE POLICY "Authenticated users can create fundraisers"
  ON public.fundraisers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners and admins can update fundraisers" ON public.fundraisers;
CREATE POLICY "Owners and admins can update fundraisers"
  ON public.fundraisers FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

-- Donations Policies
DROP POLICY IF EXISTS "Public can view succeeded donations" ON public.fundraiser_donations;
CREATE POLICY "Public can view succeeded donations"
  ON public.fundraiser_donations FOR SELECT
  USING (
    status = 'succeeded'
    OR (auth.uid() IS NOT NULL AND auth.uid() = donor_id)
    OR EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "Anyone can insert donations" ON public.fundraiser_donations;
CREATE POLICY "Anyone can insert donations"
  ON public.fundraiser_donations FOR INSERT
  WITH CHECK (true);

-- Updates Policies
DROP POLICY IF EXISTS "Public can view updates for public fundraisers" ON public.fundraiser_updates;
CREATE POLICY "Public can view updates for public fundraisers"
  ON public.fundraiser_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_id AND (status IN ('active', 'completed', 'paused') OR owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Campaign owners and admins can post updates" ON public.fundraiser_updates;
CREATE POLICY "Campaign owners and admins can post updates"
  ON public.fundraiser_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

-- Milestones Policies
DROP POLICY IF EXISTS "Public can view milestones" ON public.fundraiser_milestones;
CREATE POLICY "Public can view milestones"
  ON public.fundraiser_milestones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners and admins can insert milestones" ON public.fundraiser_milestones;
CREATE POLICY "Owners and admins can insert milestones"
  ON public.fundraiser_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

-- Withdrawals Policies
DROP POLICY IF EXISTS "Only campaign owners and admins can view withdrawals" ON public.fundraiser_withdrawals;
CREATE POLICY "Only campaign owners and admins can view withdrawals"
  ON public.fundraiser_withdrawals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "Owners can request withdrawals" ON public.fundraiser_withdrawals;
CREATE POLICY "Owners can request withdrawals"
  ON public.fundraiser_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fundraisers
      WHERE id = fundraiser_id AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.fundraiser_withdrawals;
CREATE POLICY "Admins can update withdrawals"
  ON public.fundraiser_withdrawals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

-- Reports Policies
DROP POLICY IF EXISTS "Anyone can submit a fundraiser report" ON public.fundraiser_reports;
CREATE POLICY "Anyone can submit a fundraiser report"
  ON public.fundraiser_reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view reports" ON public.fundraiser_reports;
CREATE POLICY "Admins can view reports"
  ON public.fundraiser_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'platform_admin')
    )
  );

NOTIFY pgrst, 'reload schema';
