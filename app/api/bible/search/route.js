import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BOOKS = {
  GEN:'Genesis', EXO:'Exodus', LEV:'Leviticus', NUM:'Numbers', DEU:'Deuteronomy', JOS:'Joshua', JDG:'Judges', RUT:'Ruth',
  '1SA':'1 Samuel','2SA':'2 Samuel','1KI':'1 Kings','2KI':'2 Kings','1CH':'1 Chronicles','2CH':'2 Chronicles',EZR:'Ezra',NEH:'Nehemiah',
  EST:'Esther',JOB:'Job',PSA:'Psalms',PRO:'Proverbs',ECC:'Ecclesiastes',SNG:'Song of Solomon',ISA:'Isaiah',JER:'Jeremiah',LAM:'Lamentations',
  EZK:'Ezekiel',DAN:'Daniel',HOS:'Hosea',JOL:'Joel',AMO:'Amos',OBA:'Obadiah',JON:'Jonah',MIC:'Micah',NAM:'Nahum',HAB:'Habakkuk',
  ZEP:'Zephaniah',HAG:'Haggai',ZEC:'Zechariah',MAL:'Malachi',MAT:'Matthew',MRK:'Mark',LUK:'Luke',JHN:'John',ACT:'Acts',ROM:'Romans',
  '1CO':'1 Corinthians','2CO':'2 Corinthians',GAL:'Galatians',EPH:'Ephesians',PHP:'Philippians',COL:'Colossians','1TH':'1 Thessalonians',
  '2TH':'2 Thessalonians','1TI':'1 Timothy','2TI':'2 Timothy',TIT:'Titus',PHM:'Philemon',HEB:'Hebrews',JAS:'James','1PE':'1 Peter',
  '2PE':'2 Peter','1JN':'1 John','2JN':'2 John','3JN':'3 John',JUD:'Jude',REV:'Revelation'
};
const ALIASES = { ps:'Psalms',psalm:'Psalms',song:'Song of Solomon',canticles:'Song of Solomon',jn:'John',jhn:'John',mt:'Matthew',matt:'Matthew',mk:'Mark',lk:'Luke',acts:'Acts',rom:'Romans',cor:'1 Corinthians',rev:'Revelation',obad:'Obadiah' };

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || /placeholder/i.test(url)) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function resolveBook(input) {
  const value = String(input || '').trim().replace(/\./g, '').replace(/\s+/g, ' ').toLowerCase();
  const alias = ALIASES[value] || value;
  return Object.entries(BOOKS).find(([id, name]) => id.toLowerCase() === alias || name.toLowerCase() === alias)?.[0] || null;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = String(params.get('q') || '').trim().slice(0, 120);
  const translation = String(params.get('translation') || 'KJV').toUpperCase();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  if (!['KJV','WEB'].includes(translation)) return NextResponse.json({ error: 'Choose KJV or WEB.' }, { status: 400 });
  const db = client();
  if (!db) return NextResponse.json({ error: 'Bible search is not configured until Supabase server credentials are available.' }, { status: 503 });
  try {
    const reference = q.match(/^(.+?)\s+(\d{1,3})(?::(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/);
    if (reference) {
      const bookId = resolveBook(reference[1]);
      const chapter = Number(reference[2]);
      if (bookId) {
        let query = db.from('bible_verses').select('translation,book_id,book_name,chapter,verse,verse_text').eq('translation', translation).eq('book_id', bookId).eq('chapter', chapter).order('verse').limit(80);
        if (reference[3]) query = query.gte('verse', Number(reference[3])).lte('verse', Number(reference[4] || reference[3]));
        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ results: (data || []).map(v => ({ ...v, reference: `${v.book_name} ${v.chapter}:${v.verse}` })), mode: 'reference' });
      }
    }
    const { data, error } = await db.from('bible_verses').select('translation,book_id,book_name,chapter,verse,verse_text').eq('translation', translation).textSearch('search_vector', q, { type: 'websearch', config: 'english' }).limit(30);
    if (error) throw error;
    const rows = data || [];
    if (rows.length) return NextResponse.json({ results: rows.map(v => ({ ...v, reference: `${v.book_name} ${v.chapter}:${v.verse}` })), mode: 'text' });
    const { data: fallback, error: fallbackError } = await db.from('bible_verses').select('translation,book_id,book_name,chapter,verse,verse_text').eq('translation', translation).ilike('verse_text', `%${q.replace(/[%_]/g, '')}%`).limit(20);
    if (fallbackError) throw fallbackError;
    return NextResponse.json({ results: (fallback || []).map(v => ({ ...v, reference: `${v.book_name} ${v.chapter}:${v.verse}` })), mode: 'text' });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed. Try a shorter phrase or a reference such as John 3:16.', detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined }, { status: 500 });
  }
}
