-- Shammah fundraiser financial integrity hardening.
-- Apply manually in Supabase SQL Editor. Safe to rerun.

CREATE TABLE IF NOT EXISTS public.fundraiser_report_rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_key, window_start)
);
ALTER TABLE public.fundraiser_report_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fundraiser_report_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.fundraiser_report_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_fundraiser_withdrawal(
  p_fundraiser_id uuid,
  p_user_id uuid,
  p_amount_kes bigint,
  p_mpesa_phone text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fundraiser public.fundraisers%ROWTYPE;
  v_committed bigint;
  v_available bigint;
  v_withdrawal public.fundraiser_withdrawals%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_amount_kes IS NULL OR p_amount_kes < 100
     OR p_mpesa_phone IS NULL OR p_mpesa_phone !~ '^254[0-9]{9}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid withdrawal details.');
  END IF;

  SELECT * INTO v_fundraiser FROM public.fundraisers
  WHERE id = p_fundraiser_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fundraiser not found.');
  END IF;
  IF COALESCE(v_fundraiser.owner_id, NULL) IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the campaign owner can request a withdrawal.');
  END IF;
  IF v_fundraiser.status NOT IN ('active', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawals are not available for this campaign status.');
  END IF;

  SELECT COALESCE(SUM(amount_kes), 0) INTO v_committed
  FROM public.fundraiser_withdrawals
  WHERE fundraiser_id = p_fundraiser_id
    AND status IN ('pending', 'approved', 'disbursed');

  v_available := GREATEST(0, COALESCE(v_fundraiser.raised_kes, 0) - v_committed);
  IF p_amount_kes > v_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal exceeds the available balance.', 'available_kes', v_available);
  END IF;

  INSERT INTO public.fundraiser_withdrawals
    (fundraiser_id, amount_kes, requested_by, mpesa_payout_phone, status)
  VALUES (p_fundraiser_id, p_amount_kes, p_user_id, p_mpesa_phone, 'pending')
  RETURNING * INTO v_withdrawal;

  RETURN jsonb_build_object('success', true, 'withdrawal', to_jsonb(v_withdrawal), 'available_after_kes', v_available - p_amount_kes);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_fundraiser_report_rate_limit(
  p_bucket_key text,
  p_max_requests integer DEFAULT 5,
  p_window_seconds integer DEFAULT 3600
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) < 16 OR length(p_bucket_key) > 128
     OR p_max_requests < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;
  v_window := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.fundraiser_report_rate_limits(bucket_key, window_start, request_count)
  VALUES (p_bucket_key, v_window, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET request_count = public.fundraiser_report_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count <= p_max_requests;
END;
$$;

-- Defense in depth: credit only an exact, positive amount on a pending donation.
CREATE OR REPLACE FUNCTION public.credit_donation(
  p_donation_id uuid,
  p_mpesa_receipt text,
  p_amount_kes bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation public.fundraiser_donations%ROWTYPE;
  v_fundraiser public.fundraisers%ROWTYPE;
  v_new_raised bigint;
  v_new_donors integer;
  v_completed boolean := false;
BEGIN
  SELECT * INTO v_donation FROM public.fundraiser_donations WHERE id = p_donation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation record not found.');
  END IF;
  IF v_donation.status = 'succeeded' THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_succeeded');
  END IF;
  IF v_donation.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation is not pending.');
  END IF;
  IF p_amount_kes IS NULL OR p_amount_kes <= 0 OR p_amount_kes <> v_donation.amount_kes THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount does not match the donation.');
  END IF;
  IF p_mpesa_receipt IS NULL OR length(btrim(p_mpesa_receipt)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid M-Pesa receipt is required.');
  END IF;

  SELECT * INTO v_fundraiser FROM public.fundraisers WHERE id = v_donation.fundraiser_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated fundraiser not found.');
  END IF;

  UPDATE public.fundraiser_donations
  SET status = 'succeeded', mpesa_transaction_id = p_mpesa_receipt
  WHERE id = p_donation_id;

  v_new_raised := COALESCE(v_fundraiser.raised_kes, 0) + p_amount_kes;
  v_new_donors := COALESCE(v_fundraiser.donors_count, 0) + 1;
  IF v_fundraiser.goal_kes IS NOT NULL AND v_new_raised >= v_fundraiser.goal_kes AND v_fundraiser.status = 'active' THEN
    v_completed := true;
  END IF;
  UPDATE public.fundraisers
  SET raised_kes = v_new_raised, donors_count = v_new_donors,
      status = CASE WHEN v_completed THEN 'completed' ELSE status END, updated_at = now()
  WHERE id = v_fundraiser.id;
  UPDATE public.fundraiser_milestones SET reached_at = now()
  WHERE fundraiser_id = v_fundraiser.id AND amount_kes <= v_new_raised AND reached_at IS NULL;

  -- Ledger is auxiliary; the verified donation remains authoritative if ledger insertion fails.
  BEGIN
    INSERT INTO public.mpesa_transactions
      (user_id, donor_name, phone, amount_kes, receipt_code, checkout_request_id, project_id, project_name, status)
    VALUES
      (v_donation.donor_id, v_donation.display_name, COALESCE(v_donation.phone, '254700000000'),
       p_amount_kes, p_mpesa_receipt, v_donation.checkout_request_id,
       'fundraiser:' || v_fundraiser.id::text, v_fundraiser.title, 'completed');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'donation_id', p_donation_id,
    'fundraiser_id', v_fundraiser.id, 'new_raised_kes', v_new_raised,
    'new_donors_count', v_new_donors, 'completed', v_completed);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_fundraiser_withdrawal(uuid, uuid, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_fundraiser_withdrawal(uuid, uuid, bigint, text) TO service_role;
REVOKE ALL ON FUNCTION public.consume_fundraiser_report_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_fundraiser_report_rate_limit(text, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.credit_donation(uuid, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_donation(uuid, text, bigint) TO service_role;

-- Periodic cleanup can be scheduled later; old buckets do not affect enforcement.
NOTIFY pgrst, 'reload schema';
