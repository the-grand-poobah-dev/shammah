'use client';

// Complete 66-Book Canon metadata with Testament, Genre, Chapters count
export const BIBLE_BOOKS = [
  // Old Testament (39)
  { id: 'GEN', name: 'Genesis', testament: 'OT', genre: 'Law', chapters: 50 },
  { id: 'EXO', name: 'Exodus', testament: 'OT', genre: 'Law', chapters: 40 },
  { id: 'LEV', name: 'Leviticus', testament: 'OT', genre: 'Law', chapters: 27 },
  { id: 'NUM', name: 'Numbers', testament: 'OT', genre: 'Law', chapters: 36 },
  { id: 'DEU', name: 'Deuteronomy', testament: 'OT', genre: 'Law', chapters: 34 },
  { id: 'JOS', name: 'Joshua', testament: 'OT', genre: 'History', chapters: 24 },
  { id: 'JDG', name: 'Judges', testament: 'OT', genre: 'History', chapters: 21 },
  { id: 'RUT', name: 'Ruth', testament: 'OT', genre: 'History', chapters: 4 },
  { id: '1SA', name: '1 Samuel', testament: 'OT', genre: 'History', chapters: 31 },
  { id: '2SA', name: '2 Samuel', testament: 'OT', genre: 'History', chapters: 24 },
  { id: '1KI', name: '1 Kings', testament: 'OT', genre: 'History', chapters: 22 },
  { id: '2KI', name: '2 Kings', testament: 'OT', genre: 'History', chapters: 25 },
  { id: '1CH', name: '1 Chronicles', testament: 'OT', genre: 'History', chapters: 29 },
  { id: '2CH', name: '2 Chronicles', testament: 'OT', genre: 'History', chapters: 36 },
  { id: 'EZR', name: 'Ezra', testament: 'OT', genre: 'History', chapters: 10 },
  { id: 'NEH', name: 'Nehemiah', testament: 'OT', genre: 'History', chapters: 13 },
  { id: 'EST', name: 'Esther', testament: 'OT', genre: 'History', chapters: 10 },
  { id: 'JOB', name: 'Job', testament: 'OT', genre: 'Poetry', chapters: 42 },
  { id: 'PSA', name: 'Psalms', testament: 'OT', genre: 'Poetry', chapters: 150 },
  { id: 'PRO', name: 'Proverbs', testament: 'OT', genre: 'Poetry', chapters: 31 },
  { id: 'ECC', name: 'Ecclesiastes', testament: 'OT', genre: 'Poetry', chapters: 12 },
  { id: 'SNG', name: 'Song of Songs', testament: 'OT', genre: 'Poetry', chapters: 8 },
  { id: 'ISA', name: 'Isaiah', testament: 'OT', genre: 'Prophecy', chapters: 66 },
  { id: 'JER', name: 'Jeremiah', testament: 'OT', genre: 'Prophecy', chapters: 52 },
  { id: 'LAM', name: 'Lamentations', testament: 'OT', genre: 'Prophecy', chapters: 5 },
  { id: 'EZK', name: 'Ezekiel', testament: 'OT', genre: 'Prophecy', chapters: 48 },
  { id: 'DAN', name: 'Daniel', testament: 'OT', genre: 'Prophecy', chapters: 12 },
  { id: 'HOS', name: 'Hosea', testament: 'OT', genre: 'Prophecy', chapters: 14 },
  { id: 'JOL', name: 'Joel', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'AMO', name: 'Amos', testament: 'OT', genre: 'Prophecy', chapters: 9 },
  { id: 'OBA', name: 'Obadiah', testament: 'OT', genre: 'Prophecy', chapters: 1 },
  { id: 'JON', name: 'Jonah', testament: 'OT', genre: 'Prophecy', chapters: 4 },
  { id: 'MIC', name: 'Micah', testament: 'OT', genre: 'Prophecy', chapters: 7 },
  { id: 'NAH', name: 'Nahum', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'HAB', name: 'Habakkuk', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'ZEP', name: 'Zephaniah', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'HAG', name: 'Haggai', testament: 'OT', genre: 'Prophecy', chapters: 2 },
  { id: 'ZEC', name: 'Zechariah', testament: 'OT', genre: 'Prophecy', chapters: 14 },
  { id: 'MAL', name: 'Malachi', testament: 'OT', genre: 'Prophecy', chapters: 4 },

  // New Testament (27)
  { id: 'MAT', name: 'Matthew', testament: 'NT', genre: 'Gospel', chapters: 28 },
  { id: 'MRK', name: 'Mark', testament: 'NT', genre: 'Gospel', chapters: 16 },
  { id: 'LUK', name: 'Luke', testament: 'NT', genre: 'Gospel', chapters: 24 },
  { id: 'JHN', name: 'John', testament: 'NT', genre: 'Gospel', chapters: 21 },
  { id: 'ACT', name: 'Acts', testament: 'NT', genre: 'History', chapters: 28 },
  { id: 'ROM', name: 'Romans', testament: 'NT', genre: 'Pauline', chapters: 16 },
  { id: '1CO', name: '1 Corinthians', testament: 'NT', genre: 'Pauline', chapters: 16 },
  { id: '2CO', name: '2 Corinthians', testament: 'NT', genre: 'Pauline', chapters: 13 },
  { id: 'GAL', name: 'Galatians', testament: 'NT', genre: 'Pauline', chapters: 6 },
  { id: 'EPH', name: 'Ephesians', testament: 'NT', genre: 'Pauline', chapters: 6 },
  { id: 'PHP', name: 'Philippians', testament: 'NT', genre: 'Pauline', chapters: 4 },
  { id: 'COL', name: 'Colossians', testament: 'NT', genre: 'Pauline', chapters: 4 },
  { id: '1TH', name: '1 Thessalonians', testament: 'NT', genre: 'Pauline', chapters: 5 },
  { id: '2TH', name: '2 Thessalonians', testament: 'NT', genre: 'Pauline', chapters: 3 },
  { id: '1TI', name: '1 Timothy', testament: 'NT', genre: 'Pauline', chapters: 6 },
  { id: '2TI', name: '2 Timothy', testament: 'NT', genre: 'Pauline', chapters: 4 },
  { id: 'TIT', name: 'Titus', testament: 'NT', genre: 'Pauline', chapters: 3 },
  { id: 'PHM', name: 'Philemon', testament: 'NT', genre: 'Pauline', chapters: 1 },
  { id: 'HEB', name: 'Hebrews', testament: 'NT', genre: 'General', chapters: 13 },
  { id: 'JAS', name: 'James', testament: 'NT', genre: 'General', chapters: 5 },
  { id: '1PE', name: '1 Peter', testament: 'NT', genre: 'General', chapters: 5 },
  { id: '2PE', name: '2 Peter', testament: 'NT', genre: 'General', chapters: 3 },
  { id: '1JN', name: '1 John', testament: 'NT', genre: 'General', chapters: 5 },
  { id: '2JN', name: '2 John', testament: 'NT', genre: 'General', chapters: 1 },
  { id: '3JN', name: '3 John', testament: 'NT', genre: 'General', chapters: 1 },
  { id: 'JUD', name: 'Jude', testament: 'NT', genre: 'General', chapters: 1 },
  { id: 'REV', name: 'Revelation', testament: 'NT', genre: 'Prophecy', chapters: 22 },
];

export const GENRE_COLORS = {
  Law: '#eab308',
  History: '#06b6d4',
  Poetry: '#10b981',
  Prophecy: '#8b5cf6',
  Gospel: '#ec4899',
  Pauline: '#3b82f6',
  General: '#f97316',
};

// Public Domain Translations (Free & Complete)
export const BIBLE_TRANSLATIONS = [
  { id: 'KJV', name: 'King James Version', short: 'KJV', default: true },
  { id: 'WEB', name: 'World English Bible', short: 'WEB' },
];

// Compatibility shim
export const NIV_PASSAGES = {};

const runtimeChapterCache = new Map();

/**
 * Primary asynchronous chapter loader
 */
export async function fetchChapterVerses(bookIdOrName, chapterNum, translation = 'KJV') {
  const trans = (translation || 'KJV').toUpperCase();
  const book = BIBLE_BOOKS.find((b) => b.id === bookIdOrName || b.name.toLowerCase() === String(bookIdOrName).toLowerCase()) || BIBLE_BOOKS[0];
  const cacheKey = `${trans}:${book.id}:${chapterNum}`;

  if (runtimeChapterCache.has(cacheKey)) {
    return runtimeChapterCache.get(cacheKey);
  }

  if (typeof window !== 'undefined') {
    try {
      const { idbGetBibleChapter } = await import('./offlineSyncManager');
      const offline = await idbGetBibleChapter(book.id, chapterNum, trans);
      if (offline && Array.isArray(offline.verses) && offline.verses.length > 0) {
        runtimeChapterCache.set(cacheKey, offline.verses);
        return offline.verses;
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/bible/chapter?translation=${trans}&book=${encodeURIComponent(book.id)}&chapter=${chapterNum}`);
    if (res.ok) {
      const data = await res.json();
      const verses = data.verses || [];
      if (verses.length > 0) {
        runtimeChapterCache.set(cacheKey, verses);
        return verses;
      }
    }
  } catch (err) {
    console.warn('Network chapter fetch failed, checking offline fallback:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const { getOfflineBibleChapter } = await import('./offlineSyncManager');
      const local = getOfflineBibleChapter(book.name, chapterNum, trans);
      if (local && Array.isArray(local.verses) && local.verses.length > 0) {
        return local.verses;
      }
    } catch {}
  }

  return [];
}

export function getChapterVerses(bookName, chapterNum, translation = 'KJV') {
  const trans = (translation || 'KJV').toUpperCase();
  const book = BIBLE_BOOKS.find((b) => b.name.toLowerCase() === String(bookName).toLowerCase() || b.id === bookName) || BIBLE_BOOKS[0];
  const cacheKey = `${trans}:${book.id}:${chapterNum}`;
  if (runtimeChapterCache.has(cacheKey)) {
    return runtimeChapterCache.get(cacheKey);
  }
  return [];
}

const NOTES_KEY = 'shammah_sermon_notes_v1';
const HIGHLIGHTS_KEY = 'shammah_bible_highlights_v1';
const BOOKMARKS_KEY = 'shammah_bible_bookmarks_v1';
const RECENT_READING_KEY = 'shammah_bible_recent_reading_v1';

export function getSavedNotes() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : getSampleNotes();
  } catch {
    return getSampleNotes();
  }
}

export function saveNote(note) {
  if (typeof window === 'undefined') return [];
  try {
    const list = getSavedNotes();
    const existingIndex = list.findIndex((n) => n.id === note.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = { ...updated[existingIndex], ...note, updatedAt: new Date().toISOString() };
    } else {
      const newNote = {
        id: note.id || `note-${Date.now()}`,
        title: note.title || 'Untitled Scripture Note',
        speaker: note.speaker || '',
        church: note.church || '',
        scripture: note.scripture || '',
        content: note.content || '',
        tags: note.tags || ['#Scripture'],
        color: note.color || '#0ea5e9',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newNote, ...list];
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shammah:notes-updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Failed to save note:', err);
    return [];
  }
}

export function deleteNote(id) {
  if (typeof window === 'undefined') return [];
  try {
    const list = getSavedNotes().filter((n) => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('shammah:notes-updated', { detail: list }));
    return list;
  } catch {
    return [];
  }
}

export function getVerseHighlights() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HIGHLIGHTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleVerseHighlight(verseKey, color = 'gold') {
  if (typeof window === 'undefined') return {};
  try {
    const highlights = getVerseHighlights();
    if (highlights[verseKey] === color) {
      delete highlights[verseKey];
    } else {
      highlights[verseKey] = color;
    }
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
    window.dispatchEvent(new CustomEvent('shammah:highlights-updated', { detail: highlights }));
    return highlights;
  } catch {
    return {};
  }
}

export function getVerseBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleVerseBookmark(item) {
  if (typeof window === 'undefined') return [];
  try {
    const list = getVerseBookmarks();
    const key = `${item.bookName}-${item.chapter}-${item.verse}`;
    const exists = list.some((b) => b.key === key);
    let updated;
    if (exists) {
      updated = list.filter((b) => b.key !== key);
    } else {
      updated = [
        {
          key,
          bookId: item.bookId,
          bookName: item.bookName,
          chapter: item.chapter,
          verse: item.verse,
          text: item.text,
          translation: item.translation || 'KJV',
          createdAt: new Date().toISOString(),
        },
        ...list,
      ];
    }
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shammah:bookmarks-updated', { detail: updated }));
    return updated;
  } catch {
    return [];
  }
}

export function saveRecentReading(bookId, bookName, chapter, translation = 'KJV') {
  if (typeof window === 'undefined') return;
  try {
    const entry = {
      bookId,
      bookName,
      chapter,
      translation,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(RECENT_READING_KEY, JSON.stringify(entry));
  } catch {}
}

export function getRecentReading() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RECENT_READING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const VOTD_LIST = [
  {
    ref: 'John 3:16',
    bookName: 'John',
    chapter: 3,
    verse: 16,
    translation: 'KJV',
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200',
  },
  {
    ref: 'Philippians 4:13',
    bookName: 'Philippians',
    chapter: 4,
    verse: 13,
    translation: 'KJV',
    text: 'I can do all things through Christ which strengtheneth me.',
    image: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1200',
  },
  {
    ref: 'Psalms 23:1',
    bookName: 'Psalms',
    chapter: 23,
    verse: 1,
    translation: 'KJV',
    text: 'The LORD is my shepherd; I shall not want.',
    image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1200',
  },
  {
    ref: 'Jeremiah 29:11',
    bookName: 'Jeremiah',
    chapter: 29,
    verse: 11,
    translation: 'KJV',
    text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    image: 'https://images.unsplash.com/photo-1548625361-195fe57876a3?w=1200',
  },
];

export function getVerseOfTheDay() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return VOTD_LIST[dayOfYear % VOTD_LIST.length];
}

const CROSS_REFS = {
  'John-3-16': [
    { ref: 'Romans 5:8', text: 'God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.' },
    { ref: '1 John 4:9', text: 'In this was manifested the love of God toward us, because that God sent his only begotten Son into the world.' },
    { ref: 'Romans 8:32', text: 'He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?' },
  ],
  'Psalms-23-1': [
    { ref: 'John 10:11', text: 'I am the good shepherd: the good shepherd giveth his life for the sheep.' },
    { ref: 'Philippians 4:19', text: 'My God shall supply all your need according to his riches in glory by Christ Jesus.' },
    { ref: 'Isaiah 40:11', text: 'He shall feed his flock like a shepherd: he shall gather the lambs with his arm.' },
  ],
  'Genesis-1-1': [
    { ref: 'John 1:1-3', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
    { ref: 'Hebrews 11:3', text: 'Through faith we understand that the worlds were framed by the word of God.' },
    { ref: 'Colossians 1:16', text: 'For by him were all things created, that are in heaven, and that are in earth.' },
  ],
};

export function getCrossReferences(bookName, chapter, verse) {
  const key = `${bookName}-${chapter}-${verse}`;
  return CROSS_REFS[key] || [];
}

function getSampleNotes() {
  return [
    {
      id: 'sample-note-1',
      title: 'Walking in Supernatural Peace',
      speaker: 'Pastor David Karanja',
      church: 'CITAM Valley Road',
      scripture: 'Philippians 4:6-7',
      content: '1. Anxiety is solved at the altar of prayer.\n2. Gratitude shifts our perspective from fear to God\'s faithfulness.\n3. God\'s peace stands as a garrison guarding our minds in Christ.',
      tags: ['#Peace', '#Prayer', '#CITAM'],
      color: '#0ea5e9',
      createdAt: '2026-09-28T10:30:00Z',
      updatedAt: '2026-09-28T10:30:00Z',
    },
    {
      id: 'sample-note-2',
      title: 'The Good Shepherd\'s Table',
      speaker: 'Reverend Grace Mutua',
      church: 'Mavuno Church',
      scripture: 'Psalms 23:1-6',
      content: 'The cup overflowing symbolizes abundant grace. God prepares the table right in the presence of life’s pressures—not after they leave, but in the midst of them.',
      tags: ['#Shepherd', '#Grace', '#SundayService'],
      color: '#10b981',
      createdAt: '2026-09-21T11:00:00Z',
      updatedAt: '2026-09-21T11:00:00Z',
    },
  ];
}
