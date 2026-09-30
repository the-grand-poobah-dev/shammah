// Daraja STK callback — called by Safaricom after the user enters PIN (or cancels).
// Marks the subscription confirmed/failed and activates the church on success.
//
// Must be publicly reachable (Vercel URL). No auth header from Daraja.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PERIODS } from '../../../lib/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      .select('id, church_id, period_id, status')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Already handled
    if (sub.status === 'confirmed' || sub.status === 'failed') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const success = resultCode === 0 || resultCode === '0';

    if (!success) {
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', sub.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const period = PERIODS[sub.period_id] || PERIODS.monthly;
    const ends = new Date();
    ends.setMonth(ends.getMonth() + (period.months || 1));

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
