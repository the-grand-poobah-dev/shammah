import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifiedUser(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data?.user || null;
}

export async function POST(request) {
  const user = await verifiedUser(request);
  if (!user?.id) return NextResponse.json({ ok: false, error: 'Sign in to register push notifications.' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return NextResponse.json({ ok: false, error: 'Push token storage is not configured.' }, { status: 503 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid push token payload.' }, { status: 400 });
  }
  const token = String(body?.token || '').trim();
  const platform = ['web', 'android', 'ios'].includes(body?.platform) ? body.platform : 'web';
  if (token.length < 20 || token.length > 4096) {
    return NextResponse.json({ ok: false, error: 'A valid device token is required.' }, { status: 400 });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.from('push_device_tokens').upsert({
    user_id: user.id, token, platform, enabled: true, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,token' });
  if (error) {
    console.error('Push token registration failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Push token could not be registered.' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, registered: true });
}
