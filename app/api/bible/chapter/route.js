import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BOOKS = {
  GEN:'Genesis', EXO:'Exodus', LEV:'Leviticus', NUM:'Numbers', DEU:'Deuteronomy',
  JOS:'Joshua', JDG:'Judges', RUT:'Ruth', '1SA':'1 Samuel', '2SA':'2 Samuel',
  '1KI':'1 Kings', '2KI':'2 Kings', '1CH':'1 Chronicles', '2CH':'2 Chronicles',
  EZR:'Ezra', NEH:'Nehemiah', EST:'Esther', JOB:'Job', PSA:'Psalms', PRO:'Proverbs',
  ECC:'Ecclesiastes', SNG:'Song of Solomon', ISA:'Isaiah', JER:'Jeremiah',
  LAM:'Lamentations', EZK:'Ezekiel', DAN:'Daniel', HOS:'Hosea', JOL:'Joel',
  AMO:'Amos', OBA:'Obadiah', JON:'Jonah', MIC:'Micah', NAH:'Nahum, HAB:'Habakkuk',
  ZEP:'Zephaniah', HAG:'Haggai', ZEC:'Zechariah', MAL:'Malachi', MAT:'Matthew',
  MRK:'Mark', LUK:'Luke', JHN:'John', ACT:'Acts', ROM:'Romans', '1CO':'1 Corinthians',
  '2CO':'2 Corinthians', GAL:'Galatians', EPH:'Ephesians', PHP:'Philippians',
  COL:'Colossians', '1TH':'1 Thessalonians', '2TH':'2 Thessalonians',
  '1TI':'1 Timothy', '2TI':'2 Timothy', TIT:'Titus', PHM:'Philemon',
  HEB:'Hebrews', JAS:'James', '1PE':'1 Peter', '2PE':'2 Peter', '1JN':'1 John',
  '2JN':'2 John', '3JN':'3 John', JUD:'Jude', REV:'Revelation'
};

function resolveSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && /^https?:\/\//i.test(url) && !/placeholder|your-project-url/i.test(url)) return url;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && key.split('.').length === 3) {
    try { const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8')); if (payload?.ref) return `https://${payload.ref}.supabase.co`; } catch {}
  }
  return null;
}

function serviceClient() {
  const url = resolveSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normaliseBook(value) {
  const raw = String(value || '').trim();
  const match = Object.entries(BOOKS).find(([id, name]) => id.toLowerCase() === raw.toLowerCase() || name.toLowerCase() === raw.toLowerCase());
  return match ? match[0] : null;
}

function parseChapter(payload) {
  const verses = Array.isArray(payload?.verses) ? payload.verses : [];
  return verses.map((v) => ({
    num: Number(v.verse ?? v.verse_number ?? v.num),
    text: String(v.text ?? v.content ?? '').replace(/\s+/g, ' ').trim(),
    ...(v.heading ? { heading: String(v.heading) } : {})
  })).filter((v) => Number.isInteger(v.num) && v.num > 0 && v.text);
}

async function fetchPublicDomain(bookName, chapter, translation) {
  const translationCode = translation.toLowerCase();
  const url = `https://bible-api.com/${encodeURIComponent(bookName + ' ' + chapter)}?translation=${translationCode}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Scripture source returned ${response.status}`);
  const payload = await response.json();
  const verses = parseChapter(payload);
  if (!verses.length) throw new Error('The scripture source returned no verses.');
  return { verses, source: 'bible-api.com' };
}

async function fetchApiBible(bookName, chapter, translation) {
  const key = process.env.API_BIBLE_KEY;
  const bibleId = translation === 'KJV' ? process.env.API_BIBLE_KJV_ID : process.env.API_BIBLE_WEB_ID;
  if (!key || !bibleId) return null;
  const bookId = Object.entries(BOOKS).find(([, name]) => name === bookName)?.[0];
  if (!bookId) return null;
  const response = await fetch(`https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(bibleId)}/chapters/${bookId}.${chapter}?content-type=json&include-notes=false&include-titles=true`, {
    headers: { 'api-key': key, Accept: 'application/json' },
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error(`API.Bible returned ${response.status}`);
  const payload = await response.json();
  const content = payload?.data?.content || [];
  const verses = [];
  let verseNo = 0;
  function walk(nodes) {
    for (const node of nodes || []) {
      if (node.name === 'verse' && node.attrs?.number) verseNo = Number(node.attrs.number);
      if (node.name === 'text' && verseNo && node.text) {
        const text = String(node.text).replace(/\s+/g, ' ').trim();
        if (text) verses.push({ num: verseNo, text });
      }
      if (Array.isArray(node.items)) walk(node.items);
    }
  }
  walk(content);
  const combined = new Map();
  for (const verse of verses) combined.set(verse.num, (combined.get(verse.num)?.text || '') + (combined.has(verse.num) ? ' ' : '') + verse.text);
  const result = [...combined].map(([num, text]) => ({ num, text: text.trim() })).sort((a,b)=>a.num-b.num);
  return result.length ? { verses: result, source: 'api.bible' } : null;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const translation = String(params.get('translation') || 'KJV').toUpperCase();
  const bookId = normaliseBook(params.get('book'));
  const chapter = Number(params.get('chapter'));
  if (!['KJV', 'WEB'].includes(translation)) return NextResponse.json({ error: 'Choose KJV or WEB. Only public-domain translations are enabled without a licensed Bible ID.' }, { status: 400 });
  if (!bookId || !Number.isInteger(chapter) || chapter < 1 || chapter > 150) return NextResponse.json({ error: 'Choose a valid Bible book and chapter.' }, { status: 400 });
  const bookName = BOOKS[bookId];
  const db = serviceClient();
  if (db) {
    const { data } = await db.from('bible_chapters').select('verses,source,fetched_at').eq('translation', translation).eq('book_id', bookId).eq('chapter', chapter).maybeSingle();
    if (data?.verses?.length) return NextResponse.json({ translation, book: bookName, book_id: bookId, chapter, verses: data.verses, source: data.source, cached: true });
  }
  try {
    let result = null;
    if (process.env.API_BIBLE_KEY) {
      try { result = await fetchApiBible(bookName, chapter, translation); } catch {}
    }
    if (!result) result = await fetchPublicDomain(bookName, chapter, translation);
    if (db) {
      const payload = { translation, book_id: bookId, chapter, verses: result.verses, source: result.source, fetched_at: new Date().toISOString() };
      await db.from('bible_chapters').upsert(payload, { onConflict: 'translation,book_id,chapter' });
      await db.from('bible_verses').upsert(result.verses.map(v => ({ id: `${translation}:${bookId}:${chapter}:${v.num}`, translation, book_id: bookId, book_name: bookName, chapter, verse: v.num, text: v.text, heading: v.heading || null })), { onConflict: 'id' });
    }
    return NextResponse.json({ translation, book: bookName, book_id: bookId, chapter, verses: result.verses, source: result.source, cached: false }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch (error) {
    return NextResponse.json({ error: 'Could not load this chapter right now. Check your connection and retry.', detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined }, { status: 502 });
  }
}
