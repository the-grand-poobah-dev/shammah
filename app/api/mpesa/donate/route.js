import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
