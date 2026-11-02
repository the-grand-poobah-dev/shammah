import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function userClient(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key || /placeholder/i.test(url)) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.auth.getUser(token);
  return error || !data?.user ? null : { client, user: data.user };
}

function validRef(body) {
  return ['KJV','WEB'].includes(String(body?.translation || '').toUpperCase())
    && /^[A-Z0-9]{3}$/.test(String(body?.book_id || ''))
    && Number.isInteger(Number(body?.chapter)) && Number(body.chapter) > 0 && Number(body.chapter) <= 150
    && Number.isInteger(Number(body?.verse)) && Number(body.verse) > 0 && Number(body.verse) <= 200;
}

export async function GET(request) {
  const auth = await userClient(request);
  if (!auth) return NextResponse.json({ error: 'Sign in to sync personal Bible study.' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const type = params.get('type') === 'highlights' ? 'bible_highlights' : 'bible_bookmarks';
  let query = auth.client.from(type).select('*').eq('translation', String(params.get('translation') || 'KJV').toUpperCase()).order('created_at', { ascending: false }).limit(500);
  if (params.get('book_id')) query = query.eq('book_id', params.get('book_id'));
  if (params.get('chapter')) query = query.eq('chapter', Number(params.get('chapter')));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load your Bible study items.' }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const auth = await userClient(request);
  if (!auth) return NextResponse.json({ error: 'Sign in to sync personal Bible study.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const type = body?.type === 'highlight' ? 'bible_highlights' : body?.type === 'bookmark' ? 'bible_bookmarks' : null;
  if (!type || !validRef(body)) return NextResponse.json({ error: 'Choose a valid verse reference.' }, { status: 400 });
  const ref = { user_id: auth.user.id, translation: String(body.translation).toUpperCase(), book_id: String(body.book_id), chapter: Number(body.chapter), verse: Number(body.verse) };
  if (type === 'bible_highlights') {
    const color = ['gold','blue','green','pink','purple'].includes(body.color) ? body.color : 'gold';
    const { data: existing, error: findError } = await auth.client.from(type).select('id').match(ref).maybeSingle();
    if (findError) return NextResponse.json({ error: 'Could not check your highlight.' }, { status: 500 });
    if (body.action === 'remove') {
      const { error } = await auth.client.from(type).delete().match(ref);
      if (error) return NextResponse.json({ error: 'Could not remove highlight.' }, { status: 500 });
      return NextResponse.json({ saved: false });
    }
    const { error } = await auth.client.from(type).upsert({ ...ref, color }, { onConflict: 'user_id,translation,book_id,chapter,verse' });
    if (error) return NextResponse.json({ error: 'Could not save highlight.' }, { status: 500 });
    return NextResponse.json({ saved: true });
  }
  const { data: existing, error: findError } = await auth.client.from(type).select('id').match(ref).maybeSingle();
  if (findError) return NextResponse.json({ error: 'Could not check your bookmark.' }, { status: 500 });
  if (body.action === 'remove') {
    const { error } = await auth.client.from(type).delete().match(ref);
    if (error) return NextResponse.json({ error: 'Could not remove bookmark.' }, { status: 500 });
    return NextResponse.json({ saved: false });
  }
  const { error } = await auth.client.from(type).upsert(ref, { onConflict: 'user_id,translation,book_id,chapter,verse' });
  if (error) return NextResponse.json({ error: 'Could not save bookmark.' }, { status: 500 });
  return NextResponse.json({ saved: true });
}
