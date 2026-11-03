-- Compatibility correction: legacy fundraiser rows may retain creator_id.
-- Keep owner checks aligned with the fundraiser schema's legacy sync trigger.
CREATE OR REPLACE FUNCTION public.reserve_fundraiser_withdrawal(
  p_fundraiser_id uuid,
  p_user_id uuid,
  p_amount_kes bigint,
  p_mpesa_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  SELECT * INTO v_fundraiser
  FROM public.fundraisers
  WHERE id = p_fundraiser_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fundraiser not found.');
  END IF;

  IF COALESCE(v_fundraiser.owner_id, v_fundraiser.creator_id) IS DISTINCT FROM p_user_id THEN
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

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal', to_jsonb(v_withdrawal),
    'available_after_kes', v_available - p_amount_kes
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_fundraiser_withdrawal(uuid, uuid, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_fundraiser_withdrawal(uuid, uuid, bigint, text) TO service_role;
NOTIFY pgrst, 'reload schema';
