-- Durable inbox for M-Pesa callbacks that arrive before the donation checkout reference is registered.
-- Apply this SQL manually in Supabase SQL Editor before deploying the corresponding API changes.

CREATE TABLE IF NOT EXISTS public.fundraiser_callback_inbox (
  checkout_request_id text PRIMARY KEY,
  result_code text NOT NULL,
  result_desc text,
  amount_kes numeric,
  receipt_code text,
  phone text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text
);

ALTER TABLE public.fundraiser_callback_inbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.fundraiser_callback_inbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.fundraiser_callback_inbox TO service_role;

CREATE OR REPLACE FUNCTION public.process_fundraiser_callback_inbox(
  p_checkout_request_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.fundraiser_callback_inbox%ROWTYPE;
  v_donation public.fundraiser_donations%ROWTYPE;
  v_credit jsonb;
BEGIN
  IF p_checkout_request_id IS NULL OR length(btrim(p_checkout_request_id)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid checkout reference.');
  END IF;

  SELECT * INTO v_event
  FROM public.fundraiser_callback_inbox
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No queued callback.');
  END IF;

  IF v_event.processed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_processed');
  END IF;

  SELECT * INTO v_donation
  FROM public.fundraiser_donations
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  -- The STK initiation request may still be registering the checkout reference.
  -- Leave the event queued; the donation API will call this function again after registration.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'pending', true, 'error', 'Donation checkout is not registered yet.');
  END IF;

  IF v_donation.status <> 'pending' THEN
    UPDATE public.fundraiser_callback_inbox
    SET processed_at = now(), processing_error = NULL
    WHERE checkout_request_id = p_checkout_request_id;
    RETURN jsonb_build_object('success', true, 'status', v_donation.status);
  END IF;

  IF v_event.result_code <> '0' THEN
    UPDATE public.fundraiser_donations
    SET status = 'failed'
    WHERE id = v_donation.id AND status = 'pending';

    UPDATE public.mpesa_transactions
    SET status = 'failed'
    WHERE checkout_request_id = p_checkout_request_id AND status = 'pending';

    UPDATE public.fundraiser_callback_inbox
    SET processed_at = now(), processing_error = NULL
    WHERE checkout_request_id = p_checkout_request_id;

    RETURN jsonb_build_object('success', true, 'status', 'failed');
  END IF;

  IF v_event.amount_kes IS NULL
     OR v_event.amount_kes <= 0
     OR round(v_event.amount_kes) <> v_donation.amount_kes
     OR v_event.receipt_code IS NULL
     OR length(btrim(v_event.receipt_code)) < 4 THEN
    UPDATE public.fundraiser_callback_inbox
    SET processing_error = 'Callback amount or receipt did not match the pending donation.'
    WHERE checkout_request_id = p_checkout_request_id;
    RETURN jsonb_build_object('success', false, 'error', 'Callback amount or receipt mismatch.');
  END IF;

  v_credit := public.credit_donation(
    v_donation.id,
    v_event.receipt_code,
    round(v_event.amount_kes)::bigint
  );

  IF COALESCE((v_credit->>'success')::boolean, false) THEN
    UPDATE public.fundraiser_callback_inbox
    SET processed_at = now(), processing_error = NULL
    WHERE checkout_request_id = p_checkout_request_id;
    RETURN jsonb_build_object('success', true, 'status', 'succeeded', 'credit', v_credit);
  END IF;

  UPDATE public.fundraiser_callback_inbox
  SET processing_error = COALESCE(v_credit->>'error', 'Donation credit failed.')
  WHERE checkout_request_id = p_checkout_request_id;

  RETURN jsonb_build_object('success', false, 'error', COALESCE(v_credit->>'error', 'Donation credit failed.'));
END;
$$;

REVOKE ALL ON FUNCTION public.process_fundraiser_callback_inbox(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_fundraiser_callback_inbox(text) TO service_role;

NOTIFY pgrst, 'reload schema';
