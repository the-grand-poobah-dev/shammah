import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BOOK_MAP = {
  GEN: { name: 'Genesis', standard: 'Genesis' },
  EXO: { name: 'Exodus', standard: 'Exodus' },
  LEV: { name: 'Leviticus', standard: 'Leviticus' },
  NUM: { name: 'Numbers', standard: 'Numbers' },
  DEU: { name: 'Deuteronomy', standard: 'Deuteronomy' },
  JOS: { name: 'Joshua', standard: 'Joshua' },
  JDG: { name: 'Judges', standard: 'Judges' },
  RUT: { name: 'Ruth', standard: 'Ruth' },
  '1SA': { name: '1 Samuel', standard: '1 Samuel' },
  '2SA': { name: '2 Samuel', standard: '2 Samuel' },
  '1KI': { name: '1 Kings', standard: '1 Kings' },
  '2KI': { name: '2 Kings', standard: '2 Kings' },
  '1CH': { name: '1 Chronicles', standard: '1 Chronicles' },
  '2CH': { name: '2 Chronicles', standard: '2 Chronicles' },
  EZR: { name: 'Ezra', standard: 'Ezra' },
  NEH: { name: 'Nehemiah', standard: 'Nehemiah' },
  EST: { name: 'Esther', standard: 'Esther' },
  JOB: { name: 'Job', standard: 'Job' },
  PSA: { name: 'Psalms', standard: 'Psalms' },
  PRO: { name: 'Proverbs', standard: 'Proverbs' },
  ECC: { name: 'Ecclesiastes', standard: 'Ecclesiastes' },
  SNG: { name: 'Song of Songs', standard: 'Song of Songs' },
  ISA: { name: 'Isaiah', standard: 'Isaiah' },
  JER: { name: 'Jeremiah', standard: 'Jeremiah' },
  LAM: { name: 'Lamentations', standard: 'Lamentations' },
  EZK: { name: 'Ezekiel', standard: 'Ezekiel' },
  DAN: { name: 'Daniel', standard: 'Daniel' },
  HOS: { name: 'Hosea', standard: 'Hosea' },
  JOL: { name: 'Joel', standard: 'Joel' },
  AMO: { name: 'Amos', standard: 'Amos' },
  OBA: { name: 'Obadiah', standard: 'Obadiah' },
  JON: { name: 'Jonah', standard: 'Jonah' },
  MIC: { name: 'Micah', standard: 'Micah' },
  NAH: { name: 'Nahum', standard: 'Nahum' },
  HAB: { name: 'Habakkuk', standard: 'Habakkuk' },
  ZEP: { name: 'Zephaniah', standard: 'Zephaniah' },
  HAG: { name: 'Haggai', standard: 'Haggai' },
  ZEC: { name: 'Zechariah', standard: 'Zechariah' },
  MAL: { name: 'Malachi', standard: 'Malachi' },
  MAT: { name: 'Matthew', standard: 'Matthew' },
  MRK: { name: 'Mark', standard: 'Mark' },
  LUK: { name: 'Luke', standard: 'Luke' },
  JHN: { name: 'John', standard: 'John' },
  ACT: { name: 'Acts', standard: 'Acts' },
  ROM: { name: 'Romans', standard: 'Romans' },
  '1CO': { name: '1 Corinthians', standard: '1 Corinthians' },
  '2CO': { name: '2 Corinthians', standard: '2 Corinthians' },
  GAL: { name: 'Galatians', standard: 'Galatians' },
  EPH: { name: 'Ephesians', standard: 'Ephesians' },
  PHP: { name: 'Philippians', standard: 'Philippians' },
  COL: { name: 'Colossians', standard: 'Colossians' },
  '1TH': { name: '1 Thessalonians', standard: '1 Thessalonians' },
  '2TH': { name: '2 Thessalonians', standard: '2 Thessalonians' },
  '1TI': { name: '1 Timothy', standard: '1 Timothy' },
  '2TI': { name: '2 Timothy', standard: '2 Timothy' },
  TIT: { name: 'Titus', standard: 'Titus' },
  PHM: { name: 'Philemon', standard: 'Philemon' },
  HEB: { name: 'Hebrews', standard: 'Hebrews' },
  JAS: { name: 'James', standard: 'James' },
  '1PE': { name: '1 Peter', standard: '1 Peter' },
  '2PE': { name: '2 Peter', standard: '2 Peter' },
  '1JN': { name: '1 John', standard: '1 John' },
  '2JN': { name: '2 John', standard: '2 John' },
  '3JN': { name: '3 John', standard: '3 John' },
  JUD: { name: 'Jude', standard: 'Jude' },
  REV: { name: 'Revelation', standard: 'Revelation' },
};

function resolveBook(query) {
  if (!query) return null;
  const raw = String(query).trim().toUpperCase();
  if (BOOK_MAP[raw]) {
    return { id: raw, name: BOOK_MAP[raw].name, standard: BOOK_MAP[raw].standard };
  }
  const clean = query.trim().toLowerCase();
  for (const [id, data] of Object.entries(BOOK_MAP)) {
    if (data.name.toLowerCase() === clean || data.standard.toLowerCase() === clean) {
      return { id, name: data.name, standard: data.standard };
    }
  }
  return null;
}

const memoryCache = new Map();

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const API_BIBLE_IDS = {
  KJV: 'de4e12af7f28f599-02',
  WEB: '9879dbb7cfe39e4d-04',
};

async function fetchFromApiBible(apiKey, translation, bookId, chapterNum) {
  const bibleId = API_BIBLE_IDS[translation] || API_BIBLE_IDS.KJV;
  const chapterId = `${bookId}.${chapterNum}`;
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=json&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`;

  const resp = await fetch(url, {
    headers: { 'api-key': apiKey },
    next: { revalidate: 86400 * 30 },
  });

  if (!resp.ok) {
    throw new Error(`API.Bible returned status ${resp.status}`);
  }

  const json = await resp.json();
  const content = json?.data?.content || [];
  const verses = [];
  let currentNum = 1;
  let currentHeading = null;

  function traverse(node) {
    if (!node) return;
    if (node.type === 'tag' && node.name === 'para' && node.attrs?.style === 's1') {
      currentHeading = (node.items || []).map((i) => i.text || '').join('').trim();
      return;
    }
    if (node.attrs?.['data-number']) {
      currentNum = parseInt(node.attrs['data-number'], 10) || currentNum;
    }
    if (node.text) {
      const cleanText = node.text.trim();
      if (cleanText) {
        const existing = verses.find((v) => v.num === currentNum);
        if (existing) {
          existing.text += ` ${cleanText}`;
        } else {
          verses.push({
            num: currentNum,
            text: cleanText,
            heading: currentHeading || undefined,
          });
          currentHeading = null;
        }
      }
    }
    if (node.items && Array.isArray(node.items)) {
      for (const item of node.items) {
        traverse(item);
      }
    }
  }

  for (const block of content) {
    traverse(block);
  }

  if (!verses.length) {
    throw new Error('No verses parsed from API.Bible response');
  }

  return verses;
}

async function fetchFromBibleApiCom(translation, bookStandard, chapterNum) {
  const trans = translation.toLowerCase() === 'web' ? 'web' : 'kjv';
  const queryParam = `${encodeURIComponent(bookStandard)}+${chapterNum}`;
  const url = `https://bible-api.com/${queryParam}?translation=${trans}`;

  const resp = await fetch(url, {
    next: { revalidate: 86400 * 30 },
  });

  if (!resp.ok) {
    throw new Error(`bible-api.com returned status ${resp.status}`);
  }

  const data = await resp.json();
  const rawVerses = data?.verses || [];
  if (!rawVerses.length) {
    throw new Error(`No verses found in bible-api.com for ${bookStandard} ${chapterNum}`);
  }

  return rawVerses.map((v) => ({
    num: v.verse,
    text: String(v.text || '').trim().replace(/\r?\n+/g, ' '),
    heading: v.heading || undefined,
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const translation = (searchParams.get('translation') || 'KJV').toUpperCase();
    const bookParam = searchParams.get('book');
    const chapterNum = parseInt(searchParams.get('chapter'), 10) || 1;

    if (!bookParam) {
      return NextResponse.json({ error: 'Missing book parameter' }, { status: 400 });
    }

    const resolved = resolveBook(bookParam);
    if (!resolved) {
      return NextResponse.json({ error: `Unknown book: "${bookParam}"` }, { status: 404 });
    }

    const cacheKey = `${translation}:${resolved.id}:${chapterNum}`;

    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
      });
    }

    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data: dbChapter } = await supabase
          .from('bible_chapters')
          .select('verses, source')
          .eq('translation', translation)
          .eq('book_id', resolved.id)
          .eq('chapter', chapterNum)
          .maybeSingle();

        if (dbChapter && Array.isArray(dbChapter.verses) && dbChapter.verses.length > 0) {
          const payload = {
            translation,
            bookId: resolved.id,
            bookName: resolved.name,
            chapter: chapterNum,
            verses: dbChapter.verses,
            source: 'db-cache',
          };
          memoryCache.set(cacheKey, payload);
          return NextResponse.json(payload, {
            headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
          });
        }
      } catch (err) {
        console.warn('DB cache check skipped:', err?.message);
      }
    }

    let verses = [];
    let source = 'bible-api.com';
    const apiKey = process.env.API_BIBLE_KEY;

    if (apiKey) {
      try {
        verses = await fetchFromApiBible(apiKey, translation, resolved.id, chapterNum);
        source = 'api.bible';
      } catch (apiErr) {
        console.warn('API.Bible failed, fallback to bible-api.com:', apiErr?.message);
        verses = await fetchFromBibleApiCom(translation, resolved.standard, chapterNum);
        source = 'bible-api.com';
      }
    } else {
      verses = await fetchFromBibleApiCom(translation, resolved.standard, chapterNum);
      source = 'bible-api.com';
    }

    const result = {
      translation,
      bookId: resolved.id,
      bookName: resolved.name,
      chapter: chapterNum,
      verses,
      source,
    };

    memoryCache.set(cacheKey, result);

    if (supabase && verses.length > 0) {
      (async () => {
        try {
          await supabase.from('bible_chapters').upsert({
            translation,
            book_id: resolved.id,
            chapter: chapterNum,
            verses,
            source,
            fetched_at: new Date().toISOString(),
          });

          const verseRows = verses.map((v) => ({
            id: `${translation}_${resolved.id}_${chapterNum}_${v.num}`,
            translation,
            book_id: resolved.id,
            chapter: chapterNum,
            verse: v.num,
            text: v.text,
            heading: v.heading || null,
          }));

          await supabase.from('bible_verses').upsert(verseRows, { onConflict: 'id' });
        } catch (saveErr) {
          console.warn('Supabase chapter cache error:', saveErr?.message);
        }
      })();
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    });
  } catch (err) {
    console.error('Error in /api/bible/chapter:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch chapter' }, { status: 500 });
  }
}
