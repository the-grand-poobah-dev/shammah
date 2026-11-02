import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

function normalizeKenyanPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('07') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('01') && digits.length === 10) return '254' + digits.slice(1);
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return '254' + digits;
  return null;
}

function generateMpesaReceipt() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'SHM';
  for (let i = 0; i < 7; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function resolveSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    rawUrl &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('your-project-url')
  ) {
    return rawUrl;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) {
        return `https://${payload.ref}.supabase.co`;
      }
    } catch {}
  }
  return null;
}



const DARAJA_BASE = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getDarajaAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) throw new Error('M-Pesa API credentials are not configured.');
  const response = await fetch(DARAJA_BASE + '/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64') },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error('Could not authenticate with M-Pesa. Please try again later.');
  return data.access_token;
}

async function initiateFundraiserDonation(request, body, fundraiserId, phone, amountKes) {
  const url = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Fundraiser payment storage is not configured.' }, { status: 503 });
  if (!process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY || !process.env.MPESA_CALLBACK_URL) {
    return NextResponse.json({ error: 'M-Pesa STK Push is not configured. Please contact support.' }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: fundraiser, error: fundraiserError } = await supabase.from('fundraisers')
    .select('id, title, status, deadline, goal_kes').eq('id', fundraiserId).maybeSingle();
  if (fundraiserError) return NextResponse.json({ error: 'Could not verify this fundraiser.' }, { status: 500 });
  if (!fundraiser || fundraiser.status !== 'active') return NextResponse.json({ error: 'This fundraiser is not accepting donations right now.' }, { status: 409 });
  if (fundraiser.deadline && new Date(fundraiser.deadline + 'T23:59:59Z').getTime() < Date.now()) {
    return NextResponse.json({ error: 'This fundraiser has reached its deadline.' }, { status: 409 });
  }

  const idempotencyKey = String(body.idempotencyKey || request.headers.get('idempotency-key') || randomUUID()).trim().slice(0, 100);
  if (idempotencyKey.length < 12) return NextResponse.json({ error: 'Invalid donation request reference.' }, { status: 400 });
  const { data: existing, error: existingError } = await supabase.from('fundraiser_donations')
    .select('id, fundraiser_id, status, amount_kes, checkout_request_id, mpesa_transaction_id')
    .eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existingError) return NextResponse.json({ error: 'Could not verify this donation request.' }, { status: 500 });
  if (existing) {
    if (existing.fundraiser_id !== fundraiserId || Number(existing.amount_kes) !== amountKes) {
      return NextResponse.json({ error: 'This donation reference was already used for a different request.' }, { status: 409 });
    }
    if (!existing.checkout_request_id && existing.status === 'pending') {
      return NextResponse.json({ error: 'This donation is still being initiated. Please wait before retrying.' }, { status: 409 });
    }
    return NextResponse.json({
      ok: true, status: existing.status === 'completed' ? 'succeeded' : existing.status,
      donationId: existing.id, checkoutRequestId: existing.checkout_request_id, fundraiserId,
      amount: amountKes, receiptCode: existing.mpesa_transaction_id || null, idempotentReplay: true,
    });
  }

  const ip = String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 80);
  const rateKey = createHash('sha256').update(phone + ':' + ip).digest('hex');
  const { data: allowed, error: rateError } = await supabase.rpc('reserve_fundraiser_donation_attempt', {
    p_rate_key: rateKey, p_max_attempts: 5, p_window_seconds: 900,
  });
  if (rateError) return NextResponse.json({ error: 'Donation protection is temporarily unavailable. Please retry shortly.' }, { status: 503 });
  if (allowed !== true) return NextResponse.json({ error: 'Too many donation attempts. Please wait 15 minutes before trying again.' }, { status: 429 });

  let donorId = null;
  const authMatch = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (authMatch?.[1] && anonKey) {
    try {
      const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await userClient.auth.getUser(authMatch[1].trim());
      donorId = data?.user?.id || null;
    } catch {}
  }
  let donorName = String(body.donorName || '').trim().slice(0, 80) || 'A Shammah supporter';
  if (body.anonymous === true) donorName = 'Anonymous donor';
  else if (donorId) {
    const { data: donorProfile } = await supabase.from('profiles').select('display_name').eq('id', donorId).maybeSingle();
    donorName = donorProfile?.display_name || donorName;
  }

  const { data: donation, error: donationError } = await supabase.from('fundraiser_donations').insert({
    fundraiser_id: fundraiserId, donor_id: donorId, display_name: donorName,
    anonymous: body.anonymous === true, is_anonymous: body.anonymous === true,
    amount_kes: amountKes, amount: amountKes, currency: 'KES',
    message: String(body.message || '').trim().slice(0, 500) || null, phone,
    idempotency_key: idempotencyKey, status: 'pending',
  }).select('id').single();
  if (donationError) {
    if (donationError.code === '23505') return NextResponse.json({ error: 'This donation request was already submitted.' }, { status: 409 });
    return NextResponse.json({ error: 'Could not create a pending donation record.' }, { status: 500 });
  }

  try {
    const token = await getDarajaAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(String(process.env.MPESA_SHORTCODE) + String(process.env.MPESA_PASSKEY) + timestamp).toString('base64');
    const stkResponse = await fetch(DARAJA_BASE + '/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', Amount: amountKes, PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE, PhoneNumber: phone, CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: 'SHM-' + fundraiserId.slice(0, 8), TransactionDesc: 'Shammah Gift',
      }),
      cache: 'no-store',
    });
    const stk = await stkResponse.json().catch(() => ({}));
    if (!stkResponse.ok || String(stk.ResponseCode) !== '0' || !stk.CheckoutRequestID) {
      await supabase.from('fundraiser_donations').update({ status: 'failed' }).eq('id', donation.id).eq('status', 'pending');
      return NextResponse.json({ error: stk.errorMessage || stk.ResponseDescription || 'M-Pesa could not start the payment prompt.' }, { status: 400 });
    }
    const { error: updateError } = await supabase.from('fundraiser_donations').update({
      checkout_request_id: stk.CheckoutRequestID, merchant_request_id: stk.MerchantRequestID || null,
    }).eq('id', donation.id).eq('status', 'pending');
    if (updateError) return NextResponse.json({ error: 'M-Pesa started the prompt, but its reference could not be saved. Please contact support before retrying.' }, { status: 500 });

    await supabase.from('mpesa_transactions').insert({
      phone, amount_kes: amountKes, receipt_code: 'PENDING-' + stk.CheckoutRequestID, checkout_request_id: stk.CheckoutRequestID,
      project_id: 'fundraiser:' + fundraiserId, project_name: fundraiser.title,
      plan_id: 'fundraiser_donation', user_id: donorId,
      donor_name: body.anonymous === true ? 'Anonymous donor' : donorName, status: 'pending',
    });

    return NextResponse.json({
      ok: true, status: 'pending', donationId: donation.id, fundraiserId,
      checkoutRequestId: stk.CheckoutRequestID, amount: amountKes, phone,
      customerMessage: stk.CustomerMessage || 'Check your phone and enter your M-Pesa PIN to confirm the donation.',
    });
  } catch (error) {
    await supabase.from('fundraiser_donations').update({ status: 'failed' }).eq('id', donation.id).eq('status', 'pending');
    return NextResponse.json({ error: error?.message || 'Could not initiate the M-Pesa prompt.' }, { status: 502 });
  }
}


export async function POST(request) {
  try {
    const body = await request.json();
    const {
      phone,
      amount,
      projectId,
      projectName,
      tier,
      tierLabel,
      institutionId,
      planId,
      intervalId,
      userId,
      donorName,
      courseId,
      fundraiserId,
      anonymous,
      message,
      simulateConfirmation,
    } = body || {};

    const cleanPhone = normalizeKenyanPhone(phone);
    if (!cleanPhone) {
      return NextResponse.json(
        { error: 'Please enter a valid Safaricom M-Pesa number (e.g., 0712345678 or 254712345678).' },
        { status: 400 }
      );
    }

    const numAmount = Math.round(Number(amount || 0));
    const targetFundraiserId = fundraiserId || (String(projectId || '').startsWith('fundraiser:') ? String(projectId).replace('fundraiser:', '') : null);

    if (targetFundraiserId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(targetFundraiserId))) {
        return NextResponse.json({ error: 'A valid fundraiser ID is required.' }, { status: 400 });
      }
      if (!Number.isSafeInteger(numAmount) || numAmount < 10 || numAmount > 1000000) {
        return NextResponse.json({ error: 'Donation amount must be between KES 10 and KES 1,000,000.' }, { status: 400 });
      }
      return initiateFundraiserDonation(request, body, String(targetFundraiserId), cleanPhone, numAmount);
    }

    if (targetFundraiserId && (!Number.isFinite(numAmount) || numAmount < 10)) {
      return NextResponse.json(
        { error: 'Please enter a valid donation amount of at least KES 10.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(numAmount) || numAmount < 1) {
      return NextResponse.json(
        { error: 'Please enter a valid amount of at least KES 1.' },
        { status: 400 }
      );
    }

    const receiptCode = generateMpesaReceipt();
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // Record transaction in Supabase if credentials are configured
    const supabaseUrl = resolveSupabaseUrl();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const targetCourseId = courseId || (String(projectId || '').startsWith('course:') ? String(projectId).replace('course:', '') : null);
    let createdDonationId = null;

    if (supabaseUrl && supabaseKey && !supabaseKey.includes('your-anon-key')) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (targetFundraiserId) {
          const { data: donRow } = await supabase
            .from('fundraiser_donations')
            .insert({
              fundraiser_id: targetFundraiserId,
              donor_id: userId || null,
              display_name: anonymous ? 'Anonymous Disciple' : (donorName || 'A Believer in Christ'),
              anonymous: Boolean(anonymous),
              amount_kes: numAmount,
              message: message || null,
              phone: cleanPhone,
              checkout_request_id: checkoutRequestId,
              status: simulateConfirmation ? 'succeeded' : 'pending',
              mpesa_transaction_id: simulateConfirmation ? receiptCode : null,
            })
            .select('id')
            .maybeSingle();

          createdDonationId = donRow?.id || null;

          if (simulateConfirmation && createdDonationId) {
            // Apply atomic credit immediately for sandbox testing
            const { error: rpcErr } = await supabase.rpc('credit_donation', {
              p_donation_id: createdDonationId,
              p_mpesa_receipt: receiptCode,
              p_amount_kes: numAmount,
            });

            if (rpcErr) {
              const { data: fr } = await supabase
                .from('fundraisers')
                .select('raised_kes, donors_count, goal_kes, status')
                .eq('id', targetFundraiserId)
                .single();

              if (fr) {
                const newRaised = (Number(fr.raised_kes) || 0) + numAmount;
                const newDonors = (Number(fr.donors_count) || 0) + 1;
                const isCompleted = newRaised >= fr.goal_kes;

                await supabase
                  .from('fundraisers')
                  .update({
                    raised_kes: newRaised,
                    donors_count: newDonors,
                    status: isCompleted && fr.status === 'active' ? 'completed' : fr.status,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', targetFundraiserId);

                await supabase
                  .from('fundraiser_milestones')
                  .update({ reached_at: new Date().toISOString() })
                  .eq('fundraiser_id', targetFundraiserId)
                  .lte('amount_kes', newRaised)
                  .is('reached_at', null);
              }
            }
          }
        }

        if (institutionId && planId) {
          await supabase
            .from('churches')
            .update({
              subscription_plan: planId,
              subscription_interval: intervalId || 'monthly',
              subscription_status: 'active',
            })
            .eq('id', institutionId);

          await supabase.from('subscriptions').insert({
            church_id: institutionId,
            amount_kes: numAmount,
            mpesa_receipt: receiptCode,
            phone: cleanPhone,
            status: 'active',
            plan_id: planId,
            period_id: intervalId || 'monthly',
            checkout_request_id: checkoutRequestId,
            paid_at: new Date().toISOString(),
          });
        }
        await supabase.from('mpesa_transactions').insert({
          phone: cleanPhone,
          amount_kes: numAmount,
          receipt_code: receiptCode,
          checkout_request_id: checkoutRequestId,
          project_id: targetFundraiserId ? `fundraiser:${targetFundraiserId}` : (targetCourseId || projectId || null),
          project_name: projectName || tierLabel || (targetFundraiserId ? 'Kingdom Fundraiser Donation' : null),
          institution_id: institutionId || null,
          plan_id: planId || tier || (targetCourseId ? 'course_enrollment' : (targetFundraiserId ? 'fundraiser_donation' : null)),
          interval_id: intervalId || null,
          user_id: userId || null,
          donor_name: anonymous ? 'Anonymous Disciple' : (donorName || null),
          status: 'completed',
        });

        if (targetCourseId && userId) {
          await supabase.from('course_enrollments').upsert(
            {
              user_id: userId,
              course_id: targetCourseId,
              paid: true,
              mpesa_receipt: receiptCode,
              amount_paid_kes: numAmount,
              enrolled_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,course_id' }
          );
        }
      } catch {
        // Ignore if optional transaction audit table is not yet created
      }
    }

    return NextResponse.json({
      ok: true,
      status: simulateConfirmation ? 'succeeded' : 'completed',
      receiptCode,
      checkoutRequestId,
      donationId: createdDonationId,
      fundraiserId: targetFundraiserId,
      phone: cleanPhone,
      amount: numAmount,
      projectId: projectId || null,
      institutionId: institutionId || null,
      planId: planId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Unable to process M-Pesa payment request.' },
      { status: 500 }
    );
  }
}
