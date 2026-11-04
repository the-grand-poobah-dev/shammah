-- Shammah fundraiser payout reconciliation.
-- Apply manually in Supabase SQL Editor. Idempotent; does not execute any payment.
ALTER TABLE public.fundraiser_withdrawals
  ADD COLUMN IF NOT EXISTS payout_receipt text,
  ADD COLUMN IF NOT EXISTS payout_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS payout_confirmed_at timestamptz;

ALTER TABLE public.fundraiser_withdrawals
  DROP CONSTRAINT IF EXISTS fundraiser_withdrawals_status_check;

ALTER TABLE public.fundraiser_withdrawals
  ADD CONSTRAINT fundraiser_withdrawals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'failed')) NOT VALID;

ALTER TABLE public.fundraiser_withdrawals
  VALIDATE CONSTRAINT fundraiser_withdrawals_status_check;

CREATE INDEX IF NOT EXISTS idx_fundraiser_withdrawals_actionable
  ON public.fundraiser_withdrawals (status, created_at ASC)
  WHERE status IN ('pending', 'approved');

NOTIFY pgrst, 'reload schema';
