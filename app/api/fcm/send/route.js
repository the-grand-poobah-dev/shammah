import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '../../../lib/rateLimit';
import { serverLogger } from '../../../lib/serverLogger';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request) {
  const startedAt = Date.now();
  try {
    // 1. Rate limit check (20 notification dispatches per minute)
    const rate = await checkRateLimit(request, {
      keyPrefix: 'fcm_send',
      limit: 20,
      windowSeconds: 60,
    });

    if (!rate.allowed) {
      serverLogger.warn('Rate limit exceeded on FCM send route');
      return NextResponse.json(
        { error: 'Too many push notification requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.resetIn || 60) } }
      );
    }

    // 2. Authentication check: must provide valid Supabase authorization
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || request.headers.get('x-supabase-auth');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabase = getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized: invalid or expired session' }, { status: 401 });
    }

    // 3. Parse and bounds-check payload
    const body = await request.json().catch(() => ({}));
    const { title, message, topic, targetUserId, url } = body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Notification title is required' }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Notification title must not exceed 100 characters' }, { status: 400 });
    }

    if (message && typeof message === 'string' && message.length > 500) {
      return NextResponse.json({ error: 'Notification message must not exceed 500 characters' }, { status: 400 });
    }

    serverLogger.info('FCM push notification requested', {
      callerUserId: user.id,
      topic: topic || null,
      targetUserId: targetUserId || null,
      titleLength: title.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      dispatchedAt: new Date().toISOString(),
      title: title.trim(),
      target: topic || targetUserId || 'community',
    });
  } catch (err) {
    serverLogger.error('FCM dispatch failed', { error: err?.message });
    return NextResponse.json({ ok: false, error: 'Push notification dispatch failed' }, { status: 500 });
  }
}
