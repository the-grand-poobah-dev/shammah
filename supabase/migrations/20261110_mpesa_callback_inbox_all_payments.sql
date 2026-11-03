-- Extend the durable early-callback inbox to reconcile fundraiser, course, and church subscription payments.
-- Apply manually in Supabase SQL Editor before deploying the matching application changes.
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
  v_tx public.mpesa_transactions%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_credit jsonb;
  v_months integer;
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

  -- 1. Fundraiser donations
  SELECT * INTO v_donation
  FROM public.fundraiser_donations
  WHERE checkout_request_id = p_checkout_request_id
  FOR UPDATE;

  IF FOUND THEN
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
      RETURN jsonb_build_object('success', true, 'status', 'failed', 'payment_type', 'fundraiser');
    END IF;

    IF v_event.amount_kes IS NULL OR v_event.amount_kes <= 0
       OR round(v_event.amount_kes) <> v_donation.amount_kes
       OR v_event.receipt_code IS NULL OR length(btrim(v_event.receipt_code)) < 4 THEN
      UPDATE public.fundraiser_callback_inbox
      SET processing_error = 'Callback amount or receipt did not match the pending donation.'
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', false, 'error', 'Callback amount or receipt mismatch.');
    END IF;

    v_credit := public.credit_donation(
      v_donation.id, v_event.receipt_code, round(v_event.amount_kes)::bigint
    );

    IF COALESCE((v_credit->>'success')::boolean, false) THEN
      UPDATE public.fundraiser_callback_inbox
      SET processed_at = now(), processing_error = NULL
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', true, 'status', 'succeeded', 'payment_type', 'fundraiser', 'credit', v_credit);
    END IF;

    UPDATE public.fundraiser_callback_inbox
    SET processing_error = COALESCE(v_credit->>'error', 'Donation credit failed.')
    WHERE checkout_request_id = p_checkout_request_id;
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_credit->>'error', 'Donation credit failed.'));
  END IF;

  -- 2. Course payments are represented by a pending mpesa_transactions row.
  SELECT * INTO v_tx
  FROM public.mpesa_transactions
  WHERE checkout_request_id = p_checkout_request_id
    AND interval_id = 'course'
    AND plan_id = project_id
  ORDER BY id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_tx.status <> 'pending' THEN
      UPDATE public.fundraiser_callback_inbox
      SET processed_at = now(), processing_error = NULL
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', true, 'status', v_tx.status, 'payment_type', 'course');
    END IF;

    IF v_event.result_code <> '0' THEN
      UPDATE public.mpesa_transactions SET status = 'failed'
      WHERE id = v_tx.id AND status = 'pending';
      UPDATE public.fundraiser_callback_inbox
      SET processed_at = now(), processing_error = NULL
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', true, 'status', 'failed', 'payment_type', 'course');
    END IF;

    IF v_event.amount_kes IS NULL OR v_event.amount_kes <= 0
       OR round(v_event.amount_kes) <> v_tx.amount_kes
       OR v_event.receipt_code IS NULL OR length(btrim(v_event.receipt_code)) < 4
       OR v_tx.user_id IS NULL OR v_tx.project_id IS NULL THEN
      UPDATE public.fundraiser_callback_inbox
      SET processing_error = 'Course callback amount, receipt, or enrollment identity did not validate.'
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', false, 'error', 'Course callback validation failed.');
    END IF;

    INSERT INTO public.course_enrollments
      (user_id, course_id, paid, mpesa_receipt, amount_paid_kes, enrolled_at)
    VALUES
      (v_tx.user_id, v_tx.project_id::uuid, true, v_event.receipt_code,
       round(v_event.amount_kes)::bigint, now())
    ON CONFLICT (user_id, course_id) DO UPDATE
      SET paid = true,
          mpesa_receipt = EXCLUDED.mpesa_receipt,
          amount_paid_kes = EXCLUDED.amount_paid_kes,
          enrolled_at = EXCLUDED.enrolled_at;

    UPDATE public.mpesa_transactions
    SET status = 'completed', receipt_code = v_event.receipt_code,
        amount_kes = round(v_event.amount_kes)::bigint
    WHERE id = v_tx.id AND status = 'pending';

    UPDATE public.fundraiser_callback_inbox
    SET processed_at = now(), processing_error = NULL
    WHERE checkout_request_id = p_checkout_request_id;
    RETURN jsonb_build_object('success', true, 'status', 'completed', 'payment_type', 'course');
  END IF;

  -- 3. Church subscriptions
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE checkout_request_id = p_checkout_request_id
  ORDER BY id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_subscription.status <> 'pending' THEN
      UPDATE public.fundraiser_callback_inbox
      SET processed_at = now(), processing_error = NULL
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', true, 'status', v_subscription.status, 'payment_type', 'subscription');
    END IF;

    IF v_event.result_code <> '0' THEN
      UPDATE public.subscriptions SET status = 'failed'
      WHERE id = v_subscription.id AND status = 'pending';
      UPDATE public.fundraiser_callback_inbox
      SET processed_at = now(), processing_error = NULL
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', true, 'status', 'failed', 'payment_type', 'subscription');
    END IF;

    IF v_event.amount_kes IS NULL OR v_event.amount_kes <= 0
       OR round(v_event.amount_kes) <> v_subscription.amount_kes
       OR v_event.receipt_code IS NULL OR length(btrim(v_event.receipt_code)) < 4 THEN
      UPDATE public.fundraiser_callback_inbox
      SET processing_error = 'Subscription callback amount or receipt did not validate.'
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', false, 'error', 'Subscription callback validation failed.');
    END IF;

    v_months := CASE v_subscription.period_id
      WHEN 'monthly' THEN 1
      WHEN 'quarterly' THEN 3
      WHEN 'biannual' THEN 6
      WHEN 'annual' THEN 12
      ELSE NULL
    END;

    IF v_months IS NULL THEN
      UPDATE public.fundraiser_callback_inbox
      SET processing_error = 'Subscription has an unknown billing period.'
      WHERE checkout_request_id = p_checkout_request_id;
      RETURN jsonb_build_object('success', false, 'error', 'Unknown subscription billing period.');
    END IF;

    UPDATE public.subscriptions
    SET status = 'confirmed',
        mpesa_receipt = v_event.receipt_code,
        phone = COALESCE(v_event.phone, phone),
        amount_kes = round(v_event.amount_kes)::bigint,
        paid_at = now(),
        period_ends_at = now() + make_interval(months => v_months)
    WHERE id = v_subscription.id AND status = 'pending';

    UPDATE public.churches
    SET subscription_status = 'active'
    WHERE id = v_subscription.church_id;

    UPDATE public.fundraiser_callback_inbox
    SET processed_at = now(), processing_error = NULL
    WHERE checkout_request_id = p_checkout_request_id;
    RETURN jsonb_build_object('success', true, 'status', 'confirmed', 'payment_type', 'subscription');
  END IF;

  -- Registration may still be in flight. Keep the event for the initiating route to retry.
  RETURN jsonb_build_object('success', false, 'pending', true, 'error', 'Payment checkout is not registered yet.');
END;
$$;

REVOKE ALL ON FUNCTION public.process_fundraiser_callback_inbox(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_fundraiser_callback_inbox(text) TO service_role;
NOTIFY pgrst, 'reload schema';
