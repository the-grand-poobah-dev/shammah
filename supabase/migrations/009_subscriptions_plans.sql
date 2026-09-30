-- Shammah migration 009: richer subscriptions for plan + period billing
-- Safe to re-run.

alter table subscriptions
  add column if not exists plan_id text,
  add column if not exists period_id text,
  add column if not exists checkout_request_id text,
  add column if not exists merchant_request_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists period_ends_at timestamptz;

-- Look up a pending payment by Daraja CheckoutRequestID
create index if not exists subscriptions_checkout_idx
  on subscriptions (checkout_request_id)
  where checkout_request_id is not null;

-- Optional: extend subscription_status values used on churches
-- (already: unpaid | trial | active — we keep using those)

notify pgrst, 'reload schema';
