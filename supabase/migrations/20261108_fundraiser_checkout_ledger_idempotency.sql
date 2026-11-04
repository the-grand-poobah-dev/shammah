-- Prevent duplicate fundraiser M-Pesa ledger rows and register checkout + ledger atomically.
-- Apply manually in Supabase SQL Editor. This is a follow-up; do not edit already-applied migrations.

CREATE OR REPLACE FUNCTION public.register_fundraiser_donation_checkout(
  p_donation_id uuid,
  p_checkout_request_id text,
  p_merchant_request_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation public.fundraiser_donations%ROWTYPE;
  v_fundraiser public.fundraisers%ROWTYPE;
  v_existing_id uuid;
  v_ledger_id uuid;
BEGIN
  IF p_donation_id IS NULL OR p_checkout_request_id IS NULL
     OR length(btrim(p_checkout_request_id)) < 4
     OR length(p_checkout_request_id) > 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid checkout reference.');
  END IF;

  SELECT * INTO v_donation
  FROM public.fundraiser_donations
  WHERE id = p_donation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation record not found.');
  END IF;

  IF v_donation.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation is no longer pending.');
  END IF;

  IF v_donation.checkout_request_id IS NOT NULL
     AND v_donation.checkout_request_id <> p_checkout_request_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation already has a different checkout reference.');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.fundraiser_donations
  WHERE checkout_request_id = p_checkout_request_id
    AND id <> p_donation_id
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checkout reference is already assigned.');
  END IF;

  SELECT * INTO v_fundraiser
  FROM public.fundraisers
  WHERE id = v_donation.fundraiser_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated fundraiser not found.');
  END IF;

  UPDATE public.fundraiser_donations
  SET checkout_request_id = p_checkout_request_id,
      merchant_request_id = p_merchant_request_id
  WHERE id = p_donation_id;

  -- The donation reference and pending ledger entry become visible atomically.
  -- Reuse a pre-existing row if an earlier attempt already wrote this checkout.
  SELECT id INTO v_ledger_id
  FROM public.mpesa_transactions
  WHERE checkout_request_id = p_checkout_request_id
  ORDER BY id
  LIMIT 1;

  IF v_ledger_id IS NULL THEN
    INSERT INTO public.mpesa_transactions
      (user_id, donor_name, phone, amount_kes, receipt_code, checkout_request_id,
       project_id, project_name, plan_id, status)
    VALUES
      (v_donation.donor_id,
       CASE WHEN COALESCE(v_donation.anonymous, v_donation.is_anonymous, false)
         THEN 'Anonymous donor' ELSE v_donation.display_name END,
       COALESCE(v_donation.phone, '254700000000'),
       v_donation.amount_kes, 'PENDING-' || p_checkout_request_id,
       p_checkout_request_id, 'fundraiser:' || v_fundraiser.id::text,
       v_fundraiser.title, 'fundraiser_donation', 'pending');
  ELSE
    UPDATE public.mpesa_transactions
    SET user_id = v_donation.donor_id,
        donor_name = CASE WHEN COALESCE(v_donation.anonymous, v_donation.is_anonymous, false)
          THEN 'Anonymous donor' ELSE v_donation.display_name END,
        phone = COALESCE(v_donation.phone, phone, '254700000000'),
        amount_kes = v_donation.amount_kes,
        project_id = 'fundraiser:' || v_fundraiser.id::text,
        project_name = v_fundraiser.title,
        plan_id = 'fundraiser_donation',
        status = CASE WHEN status = 'completed' THEN status ELSE 'pending' END
    WHERE id = v_ledger_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'donation_id', p_donation_id,
    'checkout_request_id', p_checkout_request_id);
END;
$$;

-- Replace the existing credit function so it updates the pre-registered ledger row.
-- If no ledger row exists (e.g. a legacy/simulated donation), create exactly one row here.
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
  v_ledger_rows integer := 0;
BEGIN
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
  IF v_donation.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Donation is not pending.');
  END IF;
  IF p_amount_kes IS NULL OR p_amount_kes <= 0 OR p_amount_kes <> v_donation.amount_kes THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount does not match the donation.');
  END IF;
  IF p_mpesa_receipt IS NULL OR length(btrim(p_mpesa_receipt)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A valid M-Pesa receipt is required.');
  END IF;

  SELECT * INTO v_fundraiser
  FROM public.fundraisers
  WHERE id = v_donation.fundraiser_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated fundraiser not found.');
  END IF;

  UPDATE public.fundraiser_donations
  SET status = 'succeeded', mpesa_transaction_id = p_mpesa_receipt
  WHERE id = p_donation_id;

  v_new_raised := COALESCE(v_fundraiser.raised_kes, 0) + p_amount_kes;
  v_new_donors := COALESCE(v_fundraiser.donors_count, 0) + 1;
  IF v_fundraiser.goal_kes IS NOT NULL AND v_new_raised >= v_fundraiser.goal_kes
     AND v_fundraiser.status = 'active' THEN
    v_completed := true;
  END IF;

  UPDATE public.fundraisers
  SET raised_kes = v_new_raised, donors_count = v_new_donors,
      status = CASE WHEN v_completed THEN 'completed' ELSE status END,
      updated_at = now()
  WHERE id = v_fundraiser.id;

  UPDATE public.fundraiser_milestones
  SET reached_at = now()
  WHERE fundraiser_id = v_fundraiser.id
    AND amount_kes <= v_new_raised
    AND reached_at IS NULL;

  UPDATE public.mpesa_transactions
  SET status = 'completed', receipt_code = p_mpesa_receipt, amount_kes = p_amount_kes
  WHERE checkout_request_id = v_donation.checkout_request_id;
  GET DIAGNOSTICS v_ledger_rows = ROW_COUNT;

  IF v_ledger_rows = 0 THEN
    INSERT INTO public.mpesa_transactions
      (user_id, donor_name, phone, amount_kes, receipt_code, checkout_request_id,
       project_id, project_name, plan_id, status)
    VALUES
      (v_donation.donor_id,
       CASE WHEN COALESCE(v_donation.anonymous, v_donation.is_anonymous, false)
         THEN 'Anonymous donor' ELSE v_donation.display_name END,
       COALESCE(v_donation.phone, '254700000000'),
       p_amount_kes, p_mpesa_receipt, v_donation.checkout_request_id,
       'fundraiser:' || v_fundraiser.id::text, v_fundraiser.title,
       'fundraiser_donation', 'completed');
  END IF;

  RETURN jsonb_build_object('success', true, 'donation_id', p_donation_id,
    'fundraiser_id', v_fundraiser.id, 'new_raised_kes', v_new_raised,
    'new_donors_count', v_new_donors, 'completed', v_completed);
END;
$$;

REVOKE ALL ON FUNCTION public.register_fundraiser_donation_checkout(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_fundraiser_donation_checkout(uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.credit_donation(uuid, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_donation(uuid, text, bigint) TO service_role;

NOTIFY pgrst, 'reload schema';
