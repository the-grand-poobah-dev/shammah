'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Bookmark,
  Share2,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Check,
  ChevronDown,
  Volume2,
  WifiOff,
  Sparkles,
  Highlighter,
  ExternalLink,
  X,
  Copy,
  ChevronRight,
  Filter,
  DownloadCloud,
} from 'lucide-react';
import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  getSavedNotes,
  saveNote,
  deleteNote,
  getVerseHighlights,
  toggleVerseHighlight,
} from '../lib/bibleManager';
import {
  saveOfflineBibleChapter,
  isBibleChapterSavedOffline,
  removeOfflineBibleChapter,
  getOfflineBibleChapter,
} from '../lib/offlineSyncManager';
import { playSound } from '../lib/soundEffects';
import { formatPostDate, getPostDateTitle, useRelativeTimeTick } from '../lib/postDisplay';
import { ScrollAffordanceWrapper } from './ScrollAffordance';

export default function BibleReaderView({ session, currentUser, openAuth }) {
  const now = useRelativeTimeTick();
  const [selectedBookId, setSelectedBookId] = useState('PSA');
  const [selectedChapter, setSelectedChapter] = useState(23);
  const [translation, setTranslation] = useState('KJV');
  const [chapterVerses, setChapterVerses] = useState([]);
  const [chapterLoading, setChapterLoading] = useState(true);
  const [chapterError, setChapterError] = useState('');
  const [chapterRetry, setChapterRetry] = useState(0);
  const [isChapterOffline, setIsChapterOffline] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState('ALL'); // ALL, OT, NT
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [readingPlans, setReadingPlans] = useState([]);
  const [readingPlanProgress, setReadingPlanProgress] = useState([]);
  const [readingPlansLoading, setReadingPlansLoading] = useState(true);
  const [readingPlansError, setReadingPlansError] = useState('');
  const [activePlanId, setActivePlanId] = useState('');
  const [savingPlanProgress, setSavingPlanProgress] = useState(false);
  const [bookmarkedVerseKeys, setBookmarkedVerseKeys] = useState([]);
  const [highlights, setHighlights] = useState({});
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('gold');
  const [toastMsg, setToastMsg] = useState('');

  // Note Taker Drawer & State
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    speaker: '',
    church: '',
    scripture: '',
    content: '',
    tags: '#SundaySermon',
  });

  const currentBook = useMemo(
    () => BIBLE_BOOKS.find((b) => b.id === selectedBookId) || BIBLE_BOOKS[0],
    [selectedBookId]
  );

  useEffect(() => {
    setHighlights(getVerseHighlights());
    setNotes(getSavedNotes());

    function onNotesUpdated(e) {
      if (e.detail) setNotes(e.detail);
    }
    function onHighlightsUpdated(e) {
      if (e.detail) setHighlights(e.detail);
    }
    function onOpenSermonNote() {
      setShowNotesDrawer(true);
      handleOpenNewNote();
      const el = document.getElementById('sermon-notes-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    window.addEventListener('shammah:notes-updated', onNotesUpdated);
    window.addEventListener('shammah:highlights-updated', onHighlightsUpdated);
    window.addEventListener('shammah:open-sermon-note', onOpenSermonNote);
    return () => {
      window.removeEventListener('shammah:notes-updated', onNotesUpdated);
      window.removeEventListener('shammah:highlights-updated', onHighlightsUpdated);
      window.removeEventListener('shammah:open-sermon-note', onOpenSermonNote);
    };
  }, [currentBook?.name, selectedChapter]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadChapter() {
      setChapterLoading(true);
      setChapterError('');
      try {
        const response = await fetch(`/api/bible/chapter?translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(currentBook.id)}&chapter=${selectedChapter}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Could not load this chapter.');
        if (cancelled) return;
        setChapterVerses(Array.isArray(payload.verses) ? payload.verses : []);
        saveOfflineBibleChapter(currentBook.id, currentBook.name, selectedChapter, payload.verses || [], translation);
        setIsChapterOffline(true);
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return;
        const offlineChapter = getOfflineBibleChapter(currentBook.name, selectedChapter, translation);
        if (offlineChapter?.verses?.length) {
          setChapterVerses(offlineChapter.verses);
          setChapterError('You are offline. Showing your saved chapter.');
        } else {
          setChapterVerses([]);
          setChapterError(error?.message || 'Could not load this chapter. Check your connection and retry.');
        }
      } finally {
        if (!cancelled) setChapterLoading(false);
      }
    }
    loadChapter();
    return () => { cancelled = true; controller.abort(); };
  }, [currentBook.id, currentBook.name, selectedChapter, translation, chapterRetry]);

  // Warm the next chapter in the server cache without blocking the current reading.
  useEffect(() => {
    if (selectedChapter >= currentBook.chapters) return;
    fetch(`/api/bible/chapter?translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(currentBook.id)}&chapter=${selectedChapter + 1}`).catch(() => {});
  }, [currentBook.id, currentBook.chapters, selectedChapter, translation]);

  const verses = chapterVerses;

  useEffect(() => {
    let cancelled = false;
    async function loadBookmarks() {
      const localKey = 'shammah_bible_bookmarks_v1';
      let local = [];
      try { local = JSON.parse(window.localStorage.getItem(localKey) || '[]'); } catch {}
      const localMatches = local.filter((item) => item.translation === translation && item.book_id === currentBook.id && Number(item.chapter) === selectedChapter);
      if (!session?.access_token) {
        setBookmarkedVerseKeys(localMatches.map((item) => String(item.verse)));
        return;
      }
      try {
        const response = await fetch(`/api/bible/study?type=bookmarks&translation=${encodeURIComponent(translation)}&book_id=${encodeURIComponent(currentBook.id)}&chapter=${selectedChapter}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Could not load bookmarks.');
        if (!cancelled) setBookmarkedVerseKeys((payload.items || []).map((item) => String(item.verse)));
      } catch {
        if (!cancelled) setBookmarkedVerseKeys(localMatches.map((item) => String(item.verse)));
      }
    }
    loadBookmarks();
    return () => { cancelled = true; };
  }, [session?.access_token, currentBook.id, selectedChapter, translation]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      setReadingPlansLoading(true);
      setReadingPlansError('');
      try {
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const response = await fetch('/api/bible/plans', { headers });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Could not load reading plans.');
        if (!cancelled) { setReadingPlans(payload.plans || []); setReadingPlanProgress(payload.progress || []); }
      } catch (error) {
        if (!cancelled) setReadingPlansError(error?.message || 'Could not load reading plans.');
      } finally {
        if (!cancelled) setReadingPlansLoading(false);
      }
    }
    loadPlans();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  async function markReadingPlanDay(plan) {
    if (!session?.access_token) {
      showToast('Sign in to save your reading plan progress.');
      if (typeof openAuth === 'function') openAuth();
      return;
    }
    const completed = readingPlanProgress.filter((item) => item.plan_id === plan.id).length;
    const day = Math.min(plan.days, completed + 1);
    if (readingPlanProgress.some((item) => item.plan_id === plan.id && item.day === day)) return;
    setSavingPlanProgress(true);
    try {
      const response = await fetch('/api/bible/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ planId: plan.id, day })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Could not save reading progress.');
      setReadingPlanProgress((items) => [...items.filter((item) => !(item.plan_id === plan.id && item.day === day)), { plan_id: plan.id, day, completed_on: new Date().toISOString().slice(0, 10) }]);
      showToast(`Day ${day} marked complete!`);
    } catch (error) {
      showToast(error?.message || 'Could not save reading progress.');
    } finally {
      setSavingPlanProgress(false);
    }
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/bible/search?q=${encodeURIComponent(query)}&translation=${encodeURIComponent(translation)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Search could not be completed.');
        if (!cancelled) { setSearchResults(payload.results || []); setSearchError(''); }
      } catch (error) {
        if (!cancelled) { setSearchResults([]); setSearchError(error?.message || 'Search failed. Retry in a moment.'); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [searchQuery, translation]);

  const filteredBooks = useMemo(() => {
    return BIBLE_BOOKS.filter((b) => {
      if (testamentFilter === 'OT' && b.testament !== 'OT') return false;
      if (testamentFilter === 'NT' && b.testament !== 'NT') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [testamentFilter, searchQuery]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  }

  // Sync offline cached status for currently viewed chapter
  useEffect(() => {
    setIsChapterOffline(isBibleChapterSavedOffline(currentBook.name, selectedChapter, translation));

    function onOfflineUpdate(e) {
      if (!e.detail || e.detail.type === 'bible_chapter') {
        setIsChapterOffline(isBibleChapterSavedOffline(currentBook.name, selectedChapter, translation));
      }
    }
    window.addEventListener('shammah:offline-updated', onOfflineUpdate);
    return () => window.removeEventListener('shammah:offline-updated', onOfflineUpdate);
  }, [currentBook.name, selectedChapter, translation]);

  function handleToggleOfflineChapter() {
    playSound('reaction');
    if (isChapterOffline) {
      removeOfflineBibleChapter(currentBook.name, selectedChapter, translation);
      setIsChapterOffline(false);
      showToast(`${currentBook.name} ${selectedChapter} removed from offline cache`);
    } else {
      saveOfflineBibleChapter(currentBook.id, currentBook.name, selectedChapter, verses, translation);
      setIsChapterOffline(true);
      playSound('badge');
      showToast(`✓ ${currentBook.name} ${selectedChapter} saved for offline reading (30-day cache)`);
    }
  }

  function handleHighlight(vNum) {
    const key = `${currentBook.name}-${selectedChapter}-${vNum}`;
    const alreadyHighlighted = Boolean(highlights[key]);
    const next = toggleVerseHighlight(key, selectedHighlightColor);
    setHighlights({ ...next });
    if (session?.access_token) {
      fetch('/api/bible/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: 'highlight', action: alreadyHighlighted ? 'remove' : 'save', translation, book_id: currentBook.id, chapter: selectedChapter, verse: vNum, color: selectedHighlightColor })
      }).then(async (response) => { if (!response.ok) { const payload = await response.json(); throw new Error(payload?.error || 'Could not sync highlight.'); } }).catch((error) => showToast(error?.message || 'Highlight saved on this device only.'));
    }
    playSound('reaction');
    showToast(alreadyHighlighted ? 'Highlight removed.' : 'Verse highlighted!');
  }

  async function handleBookmarkVerse(vNum) {
    const item = { translation, book_id: currentBook.id, chapter: selectedChapter, verse: vNum };
    const key = 'shammah_bible_bookmarks_v1';
    let local = [];
    try { local = JSON.parse(window.localStorage.getItem(key) || '[]'); } catch {}
    const exists = local.some((entry) => entry.translation === item.translation && entry.book_id === item.book_id && Number(entry.chapter) === item.chapter && Number(entry.verse) === item.verse);
    const next = exists ? local.filter((entry) => !(entry.translation === item.translation && entry.book_id === item.book_id && Number(entry.chapter) === item.chapter && Number(entry.verse) === item.verse)) : [...local, item];
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
    setBookmarkedVerseKeys((items) => exists ? items.filter((value) => value !== String(vNum)) : [...new Set([...items, String(vNum)])]);
    if (session?.access_token) {
      try {
        const response = await fetch('/api/bible/study', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ type: 'bookmark', action: exists ? 'remove' : 'save', ...item })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Could not sync bookmark.');
        showToast(exists ? 'Bookmark removed.' : 'Bookmark saved.');
      } catch (error) {
        showToast(error?.message || 'Bookmark saved on this device only.');
      }
    } else {
      showToast(exists ? 'Bookmark removed from this device.' : 'Bookmark saved on this device.');
    }
  }

  async function handleShareVerse(v) {
    const text = `"${v.text}" — ${currentBook.name} ${selectedChapter}:${v.num} (${translation})`;
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Bible Scripture' });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Scripture copied to clipboard!');
      playSound('reaction');
    } catch {}
  }

  function handleOpenNewNote(prefillRef = '') {
    const defaultScripture = prefillRef || `${currentBook.name} ${selectedChapter}`;
    setNoteForm({
      title: `${currentBook.name} ${selectedChapter} Sermon Reflection`,
      speaker: '',
      church: '',
      scripture: defaultScripture,
      content: '',
      tags: '#FellowshipNotes #WordOfGod',
    });
    setActiveNote({ id: null });
    setShowNotesDrawer(true);
    playSound('reaction');
  }

  function handleEditNote(note) {
    setActiveNote(note);
    setNoteForm({
      title: note.title,
      speaker: note.speaker || '',
      church: note.church || '',
      scripture: note.scripture || '',
      content: note.content || '',
      tags: (note.tags || []).join(' '),
    });
    setShowNotesDrawer(true);
    playSound('reaction');
  }

  function handleSaveNoteSubmit(e) {
    e.preventDefault();
    if (!noteForm.title.trim()) {
      showToast('Please enter a note title.');
      return;
    }
    const tagsArr = noteForm.tags
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    const saved = saveNote({
      id: activeNote?.id,
      title: noteForm.title.trim(),
      speaker: noteForm.speaker.trim(),
      church: noteForm.church.trim(),
      scripture: noteForm.scripture.trim(),
      content: noteForm.content.trim(),
      tags: tagsArr,
    });
    setNotes(saved);
    setShowNotesDrawer(false);
    setActiveNote(null);
    showToast('Sermon note saved offline! 📝');
    playSound('reaction');
  }

  function handleDeleteNote(id) {
    if (window.confirm('Delete this sermon note?')) {
      const remaining = deleteNote(id);
      setNotes(remaining);
      if (activeNote?.id === id) {
        setShowNotesDrawer(false);
        setActiveNote(null);
      }
      showToast('Note deleted');
    }
  }

  return (
    <div className="section-feed-view bible-reader-view">
      {/* Daily Scripture Banner with Offline & Note Taker Trigger */}
      <div className="bible-hero-banner">
        <div className="bible-hero-topline">
          <div className="bible-badge-tag">
            <BookOpen size={16} />
            <span>Holy Bible · Word of Life</span>
          </div>
          <span className="bible-offline-chip" title="Chapters you open can be saved for offline reading">
            <WifiOff size={13} />
            <span>100% Offline Ready</span>
          </span>
        </div>

        <h2 className="bible-title">Thy Word is a Lamp Unto My Feet</h2>
        <p className="bible-subtitle">
          Read Scripture in KJV or WEB, highlight verses, and capture sermon and fellowship notes.
        </p>

        {/* Quick Action Ribbon */}
        <div className="bible-hero-actions">
          <button
            type="button"
            className="bible-cta-btn"
            onClick={() => handleOpenNewNote(`${currentBook.name} ${selectedChapter}`)}
          >
            <FileText size={16} />
            <span>Take Sermon Note</span>
          </button>
          <button
            type="button"
            className="bible-cta-ghost"
            onClick={() => setShowNotesDrawer(true)}
          >
            <Bookmark size={15} />
            <span>My Notes ({notes.length})</span>
          </button>
        </div>
      </div>

      {toastMsg && <div className="video-toast-pill">{toastMsg}</div>}

      {/* Reading plans */}
      <section className="bible-reading-plans" style={{ margin: '0 0 16px', padding: '14px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--surface)' }} aria-labelledby="bible-reading-plans-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div><h3 id="bible-reading-plans-title" style={{ margin: 0 }}>Reading Plans</h3><p style={{ margin: '4px 0 0', color: 'var(--ink-muted)', fontSize: '0.9rem' }}>Build a steady rhythm in Scripture.</p></div>
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{readingPlans.length} plans</span>
        </div>
        {readingPlansLoading ? <p role="status">Loading reading plans…</p> : readingPlansError ? <p role="alert">{readingPlansError} <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setReadingPlansLoading(true) || fetch('/api/bible/plans').then(r => r.json()).then(p => { setReadingPlans(p.plans || []); setReadingPlansError(''); }).catch(() => setReadingPlansError('Could not load reading plans.')).finally(() => setReadingPlansLoading(false))}>Retry</button></p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px' }}>
            {readingPlans.map((plan) => {
              const done = readingPlanProgress.filter((item) => item.plan_id === plan.id).length;
              const isActive = activePlanId === plan.id;
              return <article key={plan.id} style={{ border: '1px solid var(--border)', borderTop: `3px solid ${plan.accent || '#0d9488'}`, borderRadius: '12px', padding: '12px', background: 'var(--bg)' }}>
                <h4 style={{ margin: '0 0 5px' }}>{plan.title}</h4>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', margin: '0 0 8px' }}>{plan.description}</p>
                <p style={{ fontSize: '0.84rem', margin: '0 0 9px' }}>{done} / {plan.days} days complete</p>
                <div style={{ height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}><div style={{ width: `${Math.min(100, (done / plan.days) * 100)}%`, height: '100%', background: plan.accent || '#0d9488' }} /></div>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setActivePlanId(isActive ? '' : plan.id)}>{isActive ? 'Hide plan' : 'View plan'}</button>
                  {done < plan.days && <button type="button" className="cx-btn cx-btn-primary" disabled={savingPlanProgress} onClick={() => markReadingPlanDay(plan)}>{savingPlanProgress ? 'Saving…' : 'Complete next day'}</button>}
                </div>
                {isActive && <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}><strong>Next reading</strong><p style={{ margin: '5px 0 0', color: 'var(--ink-muted)', fontSize: '0.9rem' }}>Day {Math.min(done + 1, plan.days)} of {plan.days}. Mark the day complete after you finish the listed reading in your Bible.</p></div>}
              </article>;
            })}
          </div>
        )}
      </section>

      {/* Search references and cached scripture text */}
      <div className="bible-search-panel" style={{ margin: '0 0 14px', padding: '12px', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface)' }}>
        <label htmlFor="bible-scripture-search" style={{ display: 'block', fontWeight: 600, marginBottom: '7px' }}>Search Scripture or enter a reference</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Search size={17} aria-hidden="true" />
          <input id="bible-scripture-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. John 3:16 or faith" aria-label="Search Bible text or reference" style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
          {searchQuery && <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setSearchQuery('')} aria-label="Clear Bible search">Clear</button>}
        </div>
        {searchQuery.trim().length >= 2 && (
          <div style={{ marginTop: '10px' }} aria-live="polite">
            {searching ? <p>Searching Scripture…</p> : searchError ? <p role="alert">{searchError} <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setSearchQuery((q) => q + ' ')}>Retry</button></p> : searchResults.length ? (
              <div style={{ display: 'grid', gap: '6px' }}>
                {searchResults.slice(0, 12).map((result) => (
                  <button key={`${result.book_id}-${result.chapter}-${result.verse}`} type="button" onClick={() => { setSelectedBookId(result.book_id); setSelectedChapter(result.chapter); setSearchQuery(''); setChapterRetry((n) => n + 1); }} style={{ textAlign: 'left', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer' }}>
                    <strong>{result.reference}</strong><span style={{ display: 'block', marginTop: '3px', color: 'var(--ink-muted)' }}>{result.verse_text}</span>
                  </button>
                ))}
              </div>
            ) : <p>No matches in chapters cached so far. Open a chapter first, then try again.</p>}
          </div>
        )}
      </div>

      {/* Bible Navigation Controls */}
      <div className="bible-controls-card">
        {/* Testament and Translation row */}
        <div className="bible-controls-row">
          <div className="bible-filter-group">
            <button
              type="button"
              className={`bible-filter-btn${testamentFilter === 'ALL' ? ' active' : ''}`}
              onClick={() => setTestamentFilter('ALL')}
            >
              All Books (66)
            </button>
            <button
              type="button"
              className={`bible-filter-btn${testamentFilter === 'OT' ? ' active' : ''}`}
              onClick={() => setTestamentFilter('OT')}
            >
              Old Testament
            </button>
            <button
              type="button"
              className={`bible-filter-btn${testamentFilter === 'NT' ? ' active' : ''}`}
              onClick={() => setTestamentFilter('NT')}
            >
              New Testament
            </button>
          </div>

          <div className="bible-trans-selector">
            <span className="bible-trans-label">Version:</span>
            <select
              className="bible-select"
              value={translation}
              onChange={(e) => { setTranslation(e.target.value); setChapterRetry((n) => n + 1); }}
              aria-label="Bible Translation"
            >
              {BIBLE_TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short} — {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Book Selector Bar */}
        <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll books left" rightLabel="Scroll books right">
          <div className="bible-books-scroll no-scrollbar">
            {filteredBooks.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`bible-book-pill${selectedBookId === b.id ? ' active' : ''}`}
                onClick={() => {
                  setSelectedBookId(b.id);
                  setSelectedChapter(1);
                  playSound('reaction');
                }}
              >
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </ScrollAffordanceWrapper>

        {/* Chapter numbers row */}
        <div className="bible-chapters-wrapper">
          <span className="bible-chapters-label">Chapter:</span>
          <ScrollAffordanceWrapper axis="horizontal" leftLabel="Scroll chapters left" rightLabel="Scroll chapters right">
            <div className="bible-chapters-scroll no-scrollbar">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={`bible-ch-btn${selectedChapter === ch ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedChapter(ch);
                    playSound('reaction');
                  }}
                >
                  {ch}
                </button>
              ))}
            </div>
          </ScrollAffordanceWrapper>
        </div>
      </div>

      {/* Main Chapter Reader Card */}
      <article
        className="post-card bible-chapter-card article-reading-target"
        data-article-title={`${currentBook.name} ${selectedChapter}`}
      >
        <div className="bible-chapter-header">
          <div>
            <div className="chapter-heading-row">
              <h3 className="chapter-heading">
                {currentBook.name} {selectedChapter}
              </h3>
              {isChapterOffline && (
                <span className="chapter-offline-pill" title="Saved locally in offline storage">
                  <WifiOff size={11} />
                  <span>Available Offline</span>
                </span>
              )}
            </div>
            <span className="chapter-subheading">
              {currentBook.genre} · {translation} Translation
            </span>
          </div>

          <div className="bible-header-actions">
            {/* Download for Offline Button */}
            <button
              type="button"
              className={`chapter-offline-download-btn${isChapterOffline ? ' is-downloaded' : ''}`}
              onClick={handleToggleOfflineChapter}
              title={isChapterOffline ? 'Click to remove from offline cache' : 'Download this chapter to access without internet'}
            >
              {isChapterOffline ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span>Saved Offline</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={13} />
                  <span>Download Offline</span>
                </>
              )}
            </button>

            {/* Highlighter Color Picker */}
            <div className="bible-color-picker">
              <span className="color-picker-label">
                <Highlighter size={14} />
              </span>
              {['gold', 'aqua', 'emerald', 'rose'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`hl-color-dot hl-${c}${selectedHighlightColor === c ? ' selected' : ''}`}
                  onClick={() => setSelectedHighlightColor(c)}
                  title={`Highlight in ${c}`}
                />
              ))}
            </div>

            <button
              type="button"
              className="chapter-note-btn"
              onClick={() => handleOpenNewNote(`${currentBook.name} ${selectedChapter}`)}
              title="Add note for this chapter"
            >
              <FileText size={15} />
              <span>Note</span>
            </button>
          </div>
        </div>

        {/* Verses List */}
        {chapterLoading ? (
          <div className="bible-verses-list" role="status" aria-live="polite">
            {[1, 2, 3, 4, 5].map((n) => <div className="bible-verse-row" key={n}><span className="verse-number-btn" aria-hidden="true">{n}</span><p className="verse-text" style={{ opacity: 0.35 }}>Loading scripture…</p></div>)}
          </div>
        ) : chapterError ? (
          <div className="bible-verses-list" role="alert">
            <div className="bible-empty-state">
              <p>{chapterError}</p>
              <button type="button" className="cx-btn cx-btn-primary" onClick={() => setChapterRetry((n) => n + 1)}>Retry chapter</button>
            </div>
          </div>
        ) : verses.length === 0 ? (
          <div className="bible-verses-list" role="status"><p>No verses were returned for this chapter.</p><button type="button" className="cx-btn cx-btn-ghost" onClick={() => setChapterRetry((n) => n + 1)}>Retry</button></div>
        ) : (
        <div className="bible-verses-list">
          {verses.map((v) => {
            const vKey = `${currentBook.name}-${selectedChapter}-${v.num}`;
            const highlightColor = highlights[vKey];
            return (
              <div
                key={v.num}
                className={`bible-verse-row${highlightColor ? ` is-highlighted hl-${highlightColor}` : ''}`}
              >
                <button
                  type="button"
                  className="verse-number-btn"
                  onClick={() => handleHighlight(v.num)}
                  title="Click to highlight verse"
                >
                  {v.num}
                </button>

                <p className="verse-text" onClick={() => handleHighlight(v.num)}>
                  {v.text}
                </p>

                <div className="verse-actions-mini">
                  <button
                    type="button"
                    className={`verse-icon-btn${highlightColor ? ' active' : ''}`}
                    onClick={() => handleHighlight(v.num)}
                    title="Highlight verse"
                  >
                    <Highlighter size={13} />
                  </button>
                  <button
                    type="button"
                    className="verse-icon-btn"
                    onClick={() => handleShareVerse(v)}
                    title="Copy & share verse"
                  >
                    <Share2 size={13} />
                  </button>
                  <button
                    type="button"
                    className={`verse-icon-btn${bookmarkedVerseKeys.includes(String(v.num)) ? ' active' : ''}`}
                    onClick={() => handleBookmarkVerse(v.num)}
                    title={bookmarkedVerseKeys.includes(String(v.num)) ? 'Remove bookmark' : 'Bookmark verse'}
                    aria-label={bookmarkedVerseKeys.includes(String(v.num)) ? 'Remove bookmark' : 'Bookmark verse'}
                  >
                    <Bookmark size={13} />
                  </button>
                  <button
                    type="button"
                    className="verse-icon-btn"
                    onClick={() => handleOpenNewNote(`${currentBook.name} ${selectedChapter}:${v.num}`)}
                    title="Attach to sermon note"
                  >
                    <FileText size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Chapter Navigation Buttons */}
        <div className="bible-ch-nav-row">
          <button
            type="button"
            className="ch-prev-next-btn"
            disabled={selectedChapter <= 1}
            onClick={() => { setSelectedChapter((c) => Math.max(1, c - 1)); setChapterRetry((n) => n + 1); }}
          >
            ← Previous Chapter
          </button>
          <button
            type="button"
            className="ch-prev-next-btn"
            disabled={selectedChapter >= currentBook.chapters}
            onClick={() => { setSelectedChapter((c) => Math.min(currentBook.chapters, c + 1)); setChapterRetry((n) => n + 1); }}
          >
            Next Chapter →
          </button>
        </div>
      </article>

      {/* Sermon Notes Section on Page */}
      <section className="sermon-notes-section">
        <div className="sermon-notes-header">
          <div className="snotes-title-group">
            <FileText size={18} className="snotes-icon" />
            <h3 className="snotes-heading">Sermon Notes ({notes.length})</h3>
          </div>
          <button
            type="button"
            className="add-sermon-note-btn"
            onClick={() => handleOpenNewNote(`${currentBook.name} ${selectedChapter}`)}
          >
            <Plus size={15} />
            <span>New Note</span>
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="empty-notes-card">
            <FileText size={32} className="empty-notes-icon" />
            <h4>No sermon notes saved yet</h4>
            <p>Capture key sermon takeaways, scriptures, and personal reflections during Sunday service or mid-week fellowship.</p>
            <button
              type="button"
              className="create-first-note-btn"
              onClick={() => handleOpenNewNote(`${currentBook.name} ${selectedChapter}`)}
            >
              Start Your First Note
            </button>
          </div>
        ) : (
          <div className="sermon-notes-grid">
            {notes.map((n) => (
              <div key={n.id} className="sermon-note-card">
                <div className="sn-card-top">
                  <span className="sn-scripture-badge">{n.scripture || 'Fellowship'}</span>
                  <div className="sn-actions">
                    <button
                      type="button"
                      className="sn-action-icon"
                      onClick={() => handleEditNote(n)}
                      title="Edit note"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="sn-action-icon sn-delete"
                      onClick={() => handleDeleteNote(n.id)}
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h4 className="sn-card-title">{n.title}</h4>

                {(n.speaker || n.church) && (
                  <p className="sn-card-meta">
                    {[n.speaker && `👤 ${n.speaker}`, n.church && `⛪ ${n.church}`].filter(Boolean).join(' · ')}
                  </p>
                )}

                <p className="sn-card-preview">{n.content}</p>

                <div className="sn-card-footer">
                  <div className="sn-tags">
                    {(n.tags || []).map((t, idx) => (
                      <span key={idx} className="sn-tag-pill">{t}</span>
                    ))}
                  </div>
                  <span
                    className="sn-date"
                    title={getPostDateTitle(n.updatedAt || n.createdAt)}
                    suppressHydrationWarning
                  >
                    {formatPostDate(n.updatedAt || n.createdAt, now)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Note Editor Drawer / Modal */}
      {showNotesDrawer && (
        <div className="vis-modal-backdrop" onClick={() => setShowNotesDrawer(false)} role="dialog" aria-modal="true">
          <div className="vis-modal-card neon-glow-modal note-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="note-editor-header">
              <div className="note-ed-title-row">
                <FileText size={18} className="note-ed-icon" />
                <h3>{activeNote?.id ? 'Edit Sermon Note' : 'New Sermon Note'}</h3>
              </div>
              <button
                type="button"
                className="note-ed-close"
                onClick={() => setShowNotesDrawer(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNoteSubmit} className="note-editor-form">
              <label className="note-form-field">
                <span className="note-form-label">Note / Sermon Title *</span>
                <input
                  type="text"
                  className="onb-input"
                  required
                  placeholder="e.g. Walking in Supernatural Peace"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                />
              </label>

              <div className="note-form-row">
                <label className="note-form-field">
                  <span className="note-form-label">Preacher / Speaker</span>
                  <input
                    type="text"
                    className="onb-input"
                    placeholder="e.g. Pastor David"
                    value={noteForm.speaker}
                    onChange={(e) => setNoteForm({ ...noteForm, speaker: e.target.value })}
                  />
                </label>

                <label className="note-form-field">
                  <span className="note-form-label">Church / Campus Branch</span>
                  <input
                    type="text"
                    className="onb-input"
                    placeholder="e.g. CITAM Valley Road"
                    value={noteForm.church}
                    onChange={(e) => setNoteForm({ ...noteForm, church: e.target.value })}
                  />
                </label>
              </div>

              <label className="note-form-field">
                <span className="note-form-label">Key Scripture Reference</span>
                <input
                  type="text"
                  className="onb-input"
                  placeholder="e.g. Philippians 4:6-7"
                  value={noteForm.scripture}
                  onChange={(e) => setNoteForm({ ...noteForm, scripture: e.target.value })}
                />
              </label>

              <label className="note-form-field">
                <span className="note-form-label">Sermon Notes & Takeaways</span>
                <textarea
                  className="onb-input note-textarea"
                  rows={6}
                  placeholder="Capture sermon points, personal prayer prompts, revelations, and practical action items…"
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                />
              </label>

              <label className="note-form-field">
                <span className="note-form-label">Tags (separated by space)</span>
                <input
                  type="text"
                  className="onb-input"
                  placeholder="#Faith #Grace #SundayService"
                  value={noteForm.tags}
                  onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
                />
              </label>

              <div className="note-editor-actions">
                <button
                  type="button"
                  className="cx-btn cx-btn-ghost"
                  onClick={() => setShowNotesDrawer(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cx-btn cx-btn-primary">
                  Save Note to Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
