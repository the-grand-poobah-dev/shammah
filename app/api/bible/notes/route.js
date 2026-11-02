import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function userClient(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key || /placeholder/i.test(url)) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.auth.getUser(token);
  return error || !data?.user ? null : { client, user: data.user };
}

export async function GET(request) {
  const auth = await userClient(request);
  if (!auth) return NextResponse.json({ error: 'Sign in to sync sermon and Bible notes.' }, { status: 401 });
  const { data, error } = await auth.client.from('bible_notes').select('*').order('updated_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: 'Could not load your saved Bible notes.' }, { status: 500 });
  return NextResponse.json({ notes: data || [] });
}

export async function POST(request) {
  const auth = await userClient(request);
  if (!auth) return NextResponse.json({ error: 'Sign in to sync sermon and Bible notes.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const chapter = Number(body?.chapter);
  const translation = String(body?.translation || 'KJV').toUpperCase();
  const title = String(body?.title || '').trim().slice(0, 180);
  if (!title || !Number.isInteger(chapter) || chapter < 1 || chapter > 150 || !['KJV','WEB'].includes(translation)) {
    return NextResponse.json({ error: 'Provide a title, valid chapter, and KJV or WEB translation.' }, { status: 400 });
  }
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).slice(0, 40)).slice(0, 20) : [];
  const payload = {
    user_id: auth.user.id,
    book: String(body.book || body.book_id || 'General').slice(0, 80),
    book_id: String(body.book_id || '').slice(0, 8) || null,
    translation,
    chapter,
    verse: Number.isInteger(Number(body.verse)) && Number(body.verse) > 0 ? Number(body.verse) : null,
    title,
    content: String(body.content || '').slice(0, 30000),
    body_md: String(body.content || '').slice(0, 30000),
    speaker: String(body.speaker || '').slice(0, 120),
    church: String(body.church || '').slice(0, 160),
    tags,
    ref_range: String(body.scripture || '').slice(0, 180),
    updated_at: new Date().toISOString()
  };
  const id = String(body.id || '');
  let query;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    query = auth.client.from('bible_notes').update(payload).eq('id', id).eq('user_id', auth.user.id).select('*').single();
  } else {
    query = auth.client.from('bible_notes').insert(payload).select('*').single();
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not save your Bible note.' }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(request) {
  const auth = await userClient(request);
  if (!auth) return NextResponse.json({ error: 'Sign in to sync sermon and Bible notes.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const id = String(body?.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid note ID.' }, { status: 400 });
  const { error } = await auth.client.from('bible_notes').delete().eq('id', id).eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ error: 'Could not delete your Bible note.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
