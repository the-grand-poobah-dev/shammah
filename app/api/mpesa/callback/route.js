// Daraja STK callback — called by Safaricom after the user enters PIN (or cancels).
// Marks the subscription confirmed/failed and activates the church on success.
//
// Must be publicly reachable (Vercel URL). No auth header from Daraja.

import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { PERIODS } from '../../../lib/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorizedCallback(request) {
  const expected = process.env.MPESA_CALLBACK_SECRET;
  // Deployed Next.js environments set NODE_ENV=production, even when Daraja is sandboxed.
  // Fail closed unless a callback secret is explicitly configured.
  if (!expected) return process.env.NODE_ENV !== 'production' && process.env.MPESA_ENVIRONMENT !== 'production';
  const supplied = new URL(request.url).searchParams.get('secret') || '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
}

function admin() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
    ? rawUrl
    : 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
  return createClient(
    url,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(req) {
  try {
    if (!isAuthorizedCallback(req)) {
      console.warn('[mpesa/callback] Rejected callback without the configured shared secret.');
      // Acknowledge the request without mutating payment records, avoiding retry storms.
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    const body = await req.json().catch(() => ({}));
    // Daraja shape: { Body: { stkCallback: { ... } } }
    const cb = body?.Body?.stkCallback || body?.stkCallback || body;
    const checkoutId = cb?.CheckoutRequestID;
    const resultCode = cb?.ResultCode;
    const resultDesc = cb?.ResultDesc || '';
    const items = cb?.CallbackMetadata?.Item || [];

    const meta = {};
    for (const it of items) {
      if (it?.Name) meta[it.Name] = it.Value;
    }
    const receipt = meta.MpesaReceiptNumber || meta.MpesaReceiptNo || null;
    const amount = meta.Amount != null ? Number(meta.Amount) : null;
    const phone = meta.PhoneNumber != null ? String(meta.PhoneNumber) : null;

    const supabase = admin();

    if (!checkoutId) {
      // Always 200 so Daraja does not keep retrying forever on bad payloads
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, church_id, plan_id, period_id, amount_kes, status')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();

    const success = resultCode === 0 || resultCode === '0';

    // Also check if this callback corresponds to a paid course enrollment transaction
    const { data: tx } = await supabase
      .from('mpesa_transactions')
      .select('id, project_id, user_id, plan_id, interval_id, amount_kes, status')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();

    const isCoursePayment = Boolean(
      tx &&
      tx.project_id &&
      tx.interval_id === 'course' &&
      tx.plan_id === tx.project_id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tx.project_id))
    );
    if (isCoursePayment && tx.status === 'pending') {
      const verifiedAmount = amount != null && Math.round(amount) === Number(tx.amount_kes);
      if (success && receipt && verifiedAmount) {
        const { error: enrollmentError } = await supabase
          .from('course_enrollments')
          .upsert(
            {
              user_id: tx.user_id,
              course_id: String(tx.project_id),
              paid: true,
              mpesa_receipt: receipt,
              amount_paid_kes: Math.round(amount),
              enrolled_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,course_id' }
          );
        if (!enrollmentError) {
          await supabase
            .from('mpesa_transactions')
            .update({
              status: 'completed',
              receipt_code: receipt,
              amount_kes: Math.round(amount),
            })
            .eq('id', tx.id)
            .eq('status', 'pending');
        }
      } else if (!success || !verifiedAmount || !receipt) {
        await supabase
          .from('mpesa_transactions')
          .update({ status: 'failed' })
          .eq('id', tx.id)
          .eq('status', 'pending');
      }
    }

    // Fundraiser totals are changed only by the atomic credit_donation RPC.
    const { data: donation, error: donationLookupError } = await supabase
      .from('fundraiser_donations')
      .select('id, fundraiser_id, amount_kes, status, checkout_request_id')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();

    if (donationLookupError) {
      console.error('Fundraiser callback lookup failed:', donationLookupError.message);
    } else if (donation && donation.status === 'pending') {
      if (!success) {
        await supabase.from('fundraiser_donations')
          .update({ status: 'failed' }).eq('id', donation.id).eq('status', 'pending');
        await supabase.from('mpesa_transactions')
          .update({ status: 'failed' })
          .eq('checkout_request_id', checkoutId)
          .eq('status', 'pending');
      } else {
        const verifiedAmount = amount != null && Number.isFinite(amount) &&
          Math.round(amount) === Number(donation.amount_kes);
        if (receipt && verifiedAmount) {
          const { data: creditResult, error: creditError } = await supabase.rpc('credit_donation', {
            p_donation_id: donation.id,
            p_mpesa_receipt: receipt,
            p_amount_kes: Math.round(amount),
          });

          if (!creditError && creditResult?.success) {
            await supabase.from('mpesa_transactions')
              .update({
                status: 'completed',
                receipt_code: receipt,
                amount_kes: Math.round(amount),
              })
              .eq('checkout_request_id', checkoutId)
              .eq('status', 'pending');
          } else {
            console.error('Fundraiser donation credit failed:', creditError?.message || creditResult?.error || 'Unknown credit error');
          }
        } else {
          // Do not credit an unverifiable callback. Leave it pending for reconciliation.
          console.error('Fundraiser callback amount/receipt mismatch for checkout:', checkoutId);
        }
      }
    }

    if (!sub) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Already handled
    if (sub.status === 'confirmed' || sub.status === 'failed') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (!success) {
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', sub.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Never activate a subscription unless the callback proves the expected payment.
    // Daraja callbacks do not carry an auth header, so checkout ID alone is not enough.
    const verifiedAmount = amount != null && Number.isFinite(amount) &&
      Math.round(amount) === Number(sub.amount_kes);
    if (!receipt || !verifiedAmount) {
      console.error('Subscription callback amount/receipt mismatch for checkout:', checkoutId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const period = PERIODS[sub.period_id];
    if (!period) {
      console.error('Subscription callback has an unknown billing period:', sub.period_id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    const ends = new Date();
    ends.setMonth(ends.getMonth() + period.months);

    await supabase
      .from('subscriptions')
      .update({
        status: 'confirmed',
        mpesa_receipt: receipt,
        phone: phone || undefined,
        amount_kes: amount != null ? Math.round(amount) : undefined,
        paid_at: new Date().toISOString(),
        period_ends_at: ends.toISOString(),
      })
      .eq('id', sub.id);

    // Activate the church (guard trigger allows service role / null auth.uid)
    await supabase
      .from('churches')
      .update({ subscription_status: 'active' })
      .eq('id', sub.church_id);

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch {
    // Still 200 — never make Daraja retry storm
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
