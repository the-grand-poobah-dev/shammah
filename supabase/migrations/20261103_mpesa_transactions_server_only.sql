-- Shammah payment security: keep M-Pesa transaction records server-managed.
-- The application reads payment status through authenticated server routes and uses
-- the service-role key for payment initiation/callback processing. Browser clients
-- must not be able to forge or modify payment records.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.mpesa_transactions
  FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.mpesa_transactions TO service_role;

DROP POLICY IF EXISTS "Anyone can insert mpesa transactions"
  ON public.mpesa_transactions;
DROP POLICY IF EXISTS "Users can view own mpesa transactions"
  ON public.mpesa_transactions;

NOTIFY pgrst, 'reload schema';
COMMIT;
