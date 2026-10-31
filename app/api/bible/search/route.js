import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const BOOK_VARIANTS = {
  gen: 'Genesis',
  genesis: 'Genesis',
  ex: 'Exodus',
  exo: 'Exodus',
  exod: 'Exodus',
  exodus: 'Exodus',
  lev: 'Leviticus',
  leviticus: 'Leviticus',
  num: 'Numbers',
  numbers: 'Numbers',
  deut: 'Deuteronomy',
  deu: 'Deuteronomy',
  deuteronomy: 'Deuteronomy',
  josh: 'Joshua',
  jos: 'Joshua',
  joshua: 'Joshua',
  judg: 'Judges',
  jdg: 'Judges',
  judges: 'Judges',
  ruth: 'Ruth',
  rut: 'Ruth',
  '1 sam': '1 Samuel',
  '1sam': '1 Samuel',
  '1sa': '1 Samuel',
  '1 samuel': '1 Samuel',
  '2 sam': '2 Samuel',
  '2sam': '2 Samuel',
  '2sa': '2 Samuel',
  '2 samuel': '2 Samuel',
  '1 kgs': '1 Kings',
  '1kgs': '1 Kings',
  '1ki': '1 Kings',
  '1 kings': '1 Kings',
  '2 kgs': '2 Kings',
  '2kgs': '2 Kings',
  '2ki': '2 Kings',
  '2 kings': '2 Kings',
  '1 chron': '1 Chronicles',
  '1chron': '1 Chronicles',
  '1ch': '1 Chronicles',
  '1 chronicles': '1 Chronicles',
  '2 chron': '2 Chronicles',
  '2chron': '2 Chronicles',
  '2ch': '2 Chronicles',
  '2 chronicles': '2 Chronicles',
  ezra: 'Ezra',
  ezr: 'Ezra',
  neh: 'Nehemiah',
  nehemiah: 'Nehemiah',
  esth: 'Esther',
  est: 'Esther',
  esther: 'Esther',
  job: 'Job',
  ps: 'Psalms',
  psa: 'Psalms',
  psalm: 'Psalms',
  psalms: 'Psalms',
  prov: 'Proverbs',
  pro: 'Proverbs',
  proverbs: 'Proverbs',
  eccles: 'Ecclesiastes',
  ecc: 'Ecclesiastes',
  ecclesiastes: 'Ecclesiastes',
  song: 'Song of Songs',
  sng: 'Song of Songs',
  'song of songs': 'Song of Songs',
  'song of solomon': 'Song of Songs',
  isa: 'Isaiah',
  isaiah: 'Isaiah',
  jer: 'Jeremiah',
  jeremiah: 'Jeremiah',
  lam: 'Lamentations',
  lamentations: 'Lamentations',
  ezek: 'Ezekiel',
  ezk: 'Ezekiel',
  ezekiel: 'Ezekiel',
  dan: 'Daniel',
  daniel: 'Daniel',
  hos: 'Hosea',
  hosea: 'Hosea',
  joel: 'Joel',
  jol: 'Joel',
  amos: 'Amos',
  amo: 'Amos',
  obad: 'Obadiah',
  oba: 'Obadiah',
  obadiah: 'Obadiah',
  jon: 'Jonah',
  jonah: 'Jonah',
  mic: 'Micah',
  micah: 'Micah',
  nah: 'Nahum',
  nahum: 'Nahum',
  hab: 'Habakkuk',
  habakkuk: 'Habakkuk',
  zeph: 'Zephaniah',
  zep: 'Zephaniah',
  zephaniah: 'Zephaniah',
  hag: 'Haggai',
  haggai: 'Haggai',
  zech: 'Zechariah',
  zec: 'Zechariah',
  zechariah: 'Zechariah',
  mal: 'Malachi',
  malachi: 'Malachi',
  mat: 'Matthew',
  matt: 'Matthew',
  matthew: 'Matthew',
  mk: 'Mark',
  mrk: 'Mark',
  mark: 'Mark',
  lk: 'Luke',
  luk: 'Luke',
  luke: 'Luke',
  jn: 'John',
  jhn: 'John',
  john: 'John',
  act: 'Acts',
  acts: 'Acts',
  rom: 'Romans',
  romans: 'Romans',
  '1 cor': '1 Corinthians',
  '1cor': '1 Corinthians',
  '1co': '1 Corinthians',
  '1 corinthians': '1 Corinthians',
  '2 cor': '2 Corinthians',
  '2cor': '2 Corinthians',
  '2co': '2 Corinthians',
  '2 corinthians': '2 Corinthians',
  gal: 'Galatians',
  galatians: 'Galatians',
  eph: 'Ephesians',
  ephesians: 'Ephesians',
  phil: 'Philippians',
  php: 'Philippians',
  philippians: 'Philippians',
  col: 'Colossians',
  colossians: 'Colossians',
  '1 thess': '1 Thessalonians',
  '1thess': '1 Thessalonians',
  '1th': '1 Thessalonians',
  '1 thessalonians': '1 Thessalonians',
  '2 thess': '2 Thessalonians',
  '2thess': '2 Thessalonians',
  '2th': '2 Thessalonians',
  '2 thessalonians': '2 Thessalonians',
  '1 tim': '1 Timothy',
  '1tim': '1 Timothy',
  '1ti': '1 Timothy',
  '1 timothy': '1 Timothy',
  '2 tim': '2 Timothy',
  '2tim': '2 Timothy',
  '2ti': '2 Timothy',
  '2 timothy': '2 Timothy',
  tit: 'Titus',
  titus: 'Titus',
  phm: 'Philemon',
  philemon: 'Philemon',
  heb: 'Hebrews',
  hebrews: 'Hebrews',
  jas: 'James',
  james: 'James',
  '1 pet': '1 Peter',
  '1pet': '1 Peter',
  '1pe': '1 Peter',
  '1 peter': '1 Peter',
  '2 pet': '2 Peter',
  '2pet': '2 Peter',
  '2pe': '2 Peter',
  '2 peter': '2 Peter',
  '1 jn': '1 John',
  '1jn': '1 John',
  '1 john': '1 John',
  '2 jn': '2 John',
  '2jn': '2 John',
  '2 john': '2 John',
  '3 jn': '3 John',
  '3jn': '3 John',
  '3 john': '3 John',
  jud: 'Jude',
  jude: 'Jude',
  rev: 'Revelation',
  revelation: 'Revelation',
};

function parseScriptureReference(input) {
  if (!input) return null;
  const raw = input.trim();
  const match = raw.match(/^((?:[1-3]\s+)?[a-zA-Z\s]+?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/i);
  if (!match) return null;

  const bookPart = match[1].trim().toLowerCase().replace(/\s+/g, ' ');
  const chapter = parseInt(match[2], 10);
  const verseStart = match[3] ? parseInt(match[3], 10) : null;
  const verseEnd = match[4] ? parseInt(match[4], 10) : (verseStart || null);

  const standardBook = BOOK_VARIANTS[bookPart] || null;
  if (!standardBook) return null;

  return { bookName: standardBook, chapter, verseStart, verseEnd };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    const translation = (searchParams.get('translation') || 'KJV').toUpperCase();

    if (!query) {
      return NextResponse.json({ results: [], type: 'empty' });
    }

    const parsedRef = parseScriptureReference(query);
    if (parsedRef) {
      const trans = translation.toLowerCase() === 'web' ? 'web' : 'kjv';
      let refStr = `${parsedRef.bookName} ${parsedRef.chapter}`;
      if (parsedRef.verseStart) {
        refStr += `:${parsedRef.verseStart}`;
        if (parsedRef.verseEnd && parsedRef.verseEnd !== parsedRef.verseStart) {
          refStr += `-${parsedRef.verseEnd}`;
        }
      }

      const enc = encodeURIComponent(refStr);
      try {
        const resp = await fetch(`https://bible-api.com/${enc}?translation=${trans}`, {
          next: { revalidate: 86400 },
        });
        if (resp.ok) {
          const data = await resp.json();
          const verses = (data.verses || []).map((v) => ({
            num: v.verse,
            text: String(v.text || '').trim().replace(/\r?\n+/g, ' '),
            bookName: parsedRef.bookName,
            chapter: parsedRef.chapter,
          }));

          return NextResponse.json({
            type: 'reference',
            reference: data.reference || refStr,
            bookName: parsedRef.bookName,
            chapter: parsedRef.chapter,
            verseStart: parsedRef.verseStart,
            verseEnd: parsedRef.verseEnd,
            translation,
            verses,
          });
        }
      } catch (err) {
        console.warn('Reference fetch failed, falling back to text search:', err);
      }
    }

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data: ftsData, error: ftsErr } = await supabase
          .from('bible_verses')
          .select('id, translation, book_id, chapter, verse, text, heading')
          .eq('translation', translation)
          .textSearch('fts', query, { type: 'websearch', config: 'english' })
          .limit(25);

        if (!ftsErr && ftsData && ftsData.length > 0) {
          return NextResponse.json({
            type: 'keyword',
            query,
            translation,
            results: ftsData.map((r) => ({
              bookId: r.book_id,
              chapter: r.chapter,
              verse: r.verse,
              text: r.text,
              heading: r.heading,
              reference: `${r.book_id} ${r.chapter}:${r.verse}`,
            })),
          });
        }

        const { data: likeData, error: likeErr } = await supabase
          .from('bible_verses')
          .select('id, translation, book_id, chapter, verse, text, heading')
          .eq('translation', translation)
          .ilike('text', `%${query}%`)
          .limit(20);

        if (!likeErr && likeData && likeData.length > 0) {
          return NextResponse.json({
            type: 'keyword',
            query,
            translation,
            results: likeData.map((r) => ({
              bookId: r.book_id,
              chapter: r.chapter,
              verse: r.verse,
              text: r.text,
              heading: r.heading,
              reference: `${r.book_id} ${r.chapter}:${r.verse}`,
            })),
          });
        }
      } catch (dbErr) {
        console.warn('Database search error:', dbErr?.message);
      }
    }

    return NextResponse.json({
      type: 'keyword',
      query,
      translation,
      results: [],
      message: 'No exact matches found. Try searching with references like "John 3:16" or "Psalm 23".',
    });
  } catch (err) {
    console.error('Bible search error:', err);
    return NextResponse.json({ error: err?.message || 'Search failed' }, { status: 500 });
  }
}
