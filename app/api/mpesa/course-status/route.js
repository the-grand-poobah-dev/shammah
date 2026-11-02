import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const checkoutRequestId = new URL(request.url).searchParams.get('checkoutRequestId');
    if (!token || !url || !anonKey) {
      return NextResponse.json({ error: 'Please sign in to check payment status.' }, { status: 401 });
    }
    if (!checkoutRequestId || checkoutRequestId.length > 200) {
      return NextResponse.json({ error: 'A valid checkout request ID is required.' }, { status: 400 });
    }
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Your sign-in session expired. Please sign in again.' }, { status: 401 });
    }
    const supabase = admin();
    if (!supabase) return NextResponse.json({ error: 'Payment status is temporarily unavailable.' }, { status: 503 });

    const { data: tx, error } = await supabase
      .from('mpesa_transactions')
      .select('id, project_id, plan_id, interval_id, status, receipt_code, amount_kes')
      .eq('checkout_request_id', checkoutRequestId)
      .eq('user_id', authData.user.id)
      .maybeSingle();
    if (error || !tx || tx.interval_id !== 'course' || tx.plan_id !== tx.project_id) {
      return NextResponse.json({ error: 'Course payment was not found.' }, { status: 404 });
    }
    if (tx.status === 'completed') {
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('paid')
        .eq('user_id', authData.user.id)
        .eq('course_id', tx.project_id)
        .maybeSingle();
      if (enrollment?.paid) {
        return NextResponse.json({
          status: 'completed',
          receiptCode: tx.receipt_code && !tx.receipt_code.startsWith('PENDING-') ? tx.receipt_code : null,
          amountKes: tx.amount_kes
        });
      }
      return NextResponse.json({ status: 'processing', amountKes: tx.amount_kes });
    }
    return NextResponse.json({
      status: tx.status === 'failed' ? 'failed' : 'pending',
      amountKes: tx.amount_kes
    });
  } catch {
    return NextResponse.json({ error: 'Could not check payment status.' }, { status: 500 });
  }
}
