import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function supabase(key, authorization) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !key || /placeholder/i.test(url)) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, ...(authorization ? { global: { headers: { Authorization: authorization } } } : {}) });
}

async function userFromRequest(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const client = supabase(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, `Bearer ${token}`);
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data?.user || null;
}

export async function GET(request) {
  const db = supabase(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!db) return NextResponse.json({ error: 'Reading plans are not configured yet.' }, { status: 503 });
  const { data: plans, error } = await db.from('reading_plans').select('id,title,description,days,kind,accent').order('days');
  if (error) return NextResponse.json({ error: 'Could not load reading plans.' }, { status: 500 });
  const user = await userFromRequest(request);
  let progress = [];
  if (user) {
    const { data } = await db.from('reading_plan_progress').select('plan_id,day,completed_on').eq('user_id', user.id);
    progress = data || [];
  }
  return NextResponse.json({ plans: plans || [], progress });
}

export async function POST(request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Sign in to save reading progress.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const planId = String(body?.planId || '').slice(0, 80);
  const day = Number(body?.day);
  if (!planId || !Number.isInteger(day) || day < 1) return NextResponse.json({ error: 'Choose a valid plan day.' }, { status: 400 });
  const db = supabase(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!db) return NextResponse.json({ error: 'Reading plans are not configured yet.' }, { status: 503 });
  const { data: plan } = await db.from('reading_plans').select('id,days').eq('id', planId).maybeSingle();
  if (!plan || day > plan.days) return NextResponse.json({ error: 'That plan day does not exist.' }, { status: 404 });
  const { error } = await db.from('reading_plan_progress').upsert({ user_id: user.id, plan_id: planId, day, completed_on: new Date().toISOString().slice(0,10) }, { onConflict: 'user_id,plan_id,day' });
  if (error) return NextResponse.json({ error: 'Could not save reading progress.' }, { status: 500 });
  return NextResponse.json({ ok: true, planId, day });
}
