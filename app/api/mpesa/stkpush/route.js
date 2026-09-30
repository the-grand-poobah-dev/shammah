// Daraja STK Push (Lipa Na M-Pesa Express) — SANDBOX
// Creates a pending subscriptions row, then prompts the phone.
//
// Env (server only):
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
//   MPESA_CALLBACK_URL  (e.g. https://your-app.vercel.app/api/mpesa/callback)
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PLANS, PERIODS, priceKes, toMpesaPhone } from '../../../lib/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DARJA_BASE = 'https://sandbox.safaricom.co.ke';

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

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');
  const res = await fetch(
    `${DARJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(data.errorMessage || 'Could not get M-Pesa token');
  return data.access_token;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone: rawPhone, churchId, planId, periodId, userId } = body || {};

    if (!churchId || !userId) {
      return NextResponse.json({ error: 'Missing church or user.' }, { status: 400 });
    }
    if (!PLANS[planId] || !PERIODS[periodId]) {
      return NextResponse.json({ error: 'Invalid plan or period.' }, { status: 400 });
    }

    const phone = toMpesaPhone(rawPhone);
    if (!phone) {
      return NextResponse.json(
        { error: 'Enter a valid Safaricom number (e.g. 07XXXXXXXX or 2547XXXXXXXX).' },
        { status: 400 }
      );
    }

    const amountKes = priceKes(planId, periodId);
    if (!amountKes || amountKes < 1) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
    }

    const supabase = admin();

    // Record pending payment first
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        church_id: churchId,
        amount_kes: amountKes,
        phone,
        status: 'pending',
        plan_id: planId,
        period_id: periodId,
      })
      .select('id')
      .single();

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!callbackUrl) {
      return NextResponse.json({ error: 'MPESA_CALLBACK_URL is not set.' }, { status: 500 });
    }

    const stkRes = await fetch(`${DARJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amountKes,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: `Shammah-${String(churchId).slice(0, 8)}`,
        TransactionDesc: `Shammah ${PLANS[planId].name} ${PERIODS[periodId].label}`,
      }),
    });

    const stk = await stkRes.json();

    // Save Daraja IDs so the callback can find this row
    if (stk.CheckoutRequestID || stk.MerchantRequestID) {
      await supabase
        .from('subscriptions')
        .update({
          checkout_request_id: stk.CheckoutRequestID || null,
          merchant_request_id: stk.MerchantRequestID || null,
        })
        .eq('id', sub.id);
    }

    if (stk.ResponseCode !== '0' && stk.ResponseCode !== 0) {
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', sub.id);
      return NextResponse.json(
        {
          error: stk.errorMessage || stk.ResponseDescription || 'STK push failed',
          daraja: stk,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: sub.id,
      checkoutRequestId: stk.CheckoutRequestID,
      customerMessage: stk.CustomerMessage || 'Check your phone for the M-Pesa prompt.',
      amountKes,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
