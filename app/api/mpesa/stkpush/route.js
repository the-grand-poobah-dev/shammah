// Daraja STK Push (Lipa Na M-Pesa Express) — SANDBOX
// Creates a pending subscriptions row, then prompts the phone.
//
// Env (server only):
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
//   MPESA_CALLBACK_URL  (e.g. https://your-app.vercel.app/api/mpesa/callback)
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
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

async function initiateCoursePayment(req, body) {
  const courseId = String(body?.courseId || '');
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey || !token) {
    return NextResponse.json({ error: 'Please sign in before purchasing a course.' }, { status: 401 });
  }
  if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET ||
      !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY || !process.env.MPESA_CALLBACK_URL) {
    return NextResponse.json({ error: 'M-Pesa payment is not configured yet.' }, { status: 503 });
  }

  const authClient = createClient(rawUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Your sign-in session expired. Please sign in again.' }, { status: 401 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)) {
    return NextResponse.json({ error: 'A valid course ID is required.' }, { status: 400 });
  }
  const phone = toMpesaPhone(body?.phone);
  if (!phone) {
    return NextResponse.json({ error: 'Enter a valid Safaricom number (e.g. 07XXXXXXXX or 2547XXXXXXXX).' }, { status: 400 });
  }

  const supabase = admin();
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, price_kes, status')
    .eq('id', courseId)
    .maybeSingle();
  if (courseError || !course || course.status !== 'published') {
    return NextResponse.json({ error: 'Published course not found.' }, { status: 404 });
  }
  const amountKes = Math.round(Number(course.price_kes || 0));
  if (amountKes < 1) {
    return NextResponse.json({ error: 'This course is free; use the free enrollment action.' }, { status: 400 });
  }
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('paid')
    .eq('user_id', authData.user.id)
    .eq('course_id', courseId)
    .maybeSingle();
  if (existing?.paid) {
    return NextResponse.json({ error: 'You are already enrolled in this course.' }, { status: 409 });
  }

  const pendingCode = `PENDING-${randomUUID()}`;
  const { data: tx, error: txError } = await supabase
    .from('mpesa_transactions')
    .insert({
      user_id: authData.user.id,
      donor_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'Course Learner',
      phone,
      amount_kes: amountKes,
      receipt_code: pendingCode,
      project_id: course.id,
      project_name: course.title,
      plan_id: course.id,
      interval_id: 'course',
      status: 'pending'
    })
    .select('id')
    .single();
  if (txError || !tx) {
    return NextResponse.json({ error: txError?.message || 'Could not create the payment record.' }, { status: 500 });
  }

  try {
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    const stkRes = await fetch(`${DARJA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amountKes,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: `COURSE-${course.id.slice(0, 8)}`,
        TransactionDesc: `Shammah course: ${String(course.title).slice(0, 60)}`
      })
    });
    const stk = await stkRes.json();
    if (stk.CheckoutRequestID) {
      await supabase.from('mpesa_transactions')
        .update({ checkout_request_id: stk.CheckoutRequestID })
        .eq('id', tx.id);
    }
    if (stk.ResponseCode !== '0' && stk.ResponseCode !== 0) {
      await supabase.from('mpesa_transactions').update({ status: 'failed' }).eq('id', tx.id);
      return NextResponse.json({ error: stk.errorMessage || stk.ResponseDescription || 'M-Pesa STK push failed.' }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      transactionId: tx.id,
      checkoutRequestId: stk.CheckoutRequestID,
      amountKes,
      customerMessage: stk.CustomerMessage || 'Check your phone for the M-Pesa prompt.'
    });
  } catch (error) {
    await supabase.from('mpesa_transactions').update({ status: 'failed' }).eq('id', tx.id);
    return NextResponse.json({ error: error?.message || 'Could not initiate M-Pesa payment.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (body?.courseId) return await initiateCoursePayment(req, body);
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
