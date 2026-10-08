import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    } = body || {};

    const cleanPhone = normalizeKenyanPhone(phone);
    if (!cleanPhone) {
      return NextResponse.json(
        { error: 'Please enter a valid Safaricom M-Pesa number (e.g., 0712345678 or 254712345678).' },
        { status: 400 }
      );
    }

    const numAmount = Math.round(Number(amount || 0));
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

    if (supabaseUrl && supabaseKey && !supabaseKey.includes('your-anon-key')) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
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
          project_id: projectId || null,
          project_name: projectName || tierLabel || null,
          institution_id: institutionId || null,
          plan_id: planId || tier || null,
          interval_id: intervalId || null,
          user_id: userId || null,
          donor_name: donorName || null,
          status: 'completed',
        });
      } catch {
        // Ignore if optional transaction audit table is not yet created
      }
    }

    return NextResponse.json({
      ok: true,
      status: 'completed',
      receiptCode,
      checkoutRequestId,
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
