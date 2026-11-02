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
  const [jumpVerse, setJumpVerse] = useState('');
  const [pendingVerseJump, setPendingVerseJump] = useState(null);
  const [translation, setTranslation] = useState('KJV');
  const [chapterVerses, setChapterVerses] = useState([]);
  const [chapterLoading, setChapterLoading] = useState(true);
  const [chapterError, setChapterError] = useState('');
  const [chapterRetry, setChapterRetry] = useState(0);
  const [parallelEnabled, setParallelEnabled] = useState(false);
  const [parallelVerses, setParallelVerses] = useState([]);
  const [parallelLoading, setParallelLoading] = useState(false);
  const [parallelError, setParallelError] = useState('');
  const [parallelRetry, setParallelRetry] = useState(0);
  const [bookDownloadProgress, setBookDownloadProgress] = useState(null);
  const [isChapterOffline, setIsChapterOffline] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState('ALL'); // ALL, OT, NT
  const [scriptureSearchQuery, setScriptureSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [readingPlans, setReadingPlans] = useState([]);
  const [readingPlanDays, setReadingPlanDays] = useState([]);
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
    if (session?.access_token) {
      fetch('/api/bible/notes', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error || 'Could not sync notes.');
          const cloudNotes = (payload.notes || []).map((note) => ({
            id: note.id,
            title: note.title || 'Bible note',
            speaker: note.speaker || '',
            church: note.church || '',
            scripture: note.ref_range || `${note.book || note.book_id || 'Bible'} ${note.chapter}${note.verse ? `:${note.verse}` : ''}`,
            content: note.content || note.body_md || '',
            tags: Array.isArray(note.tags) ? note.tags : [],
            color: note.color || '#0ea5e9',
            createdAt: note.created_at,
            updatedAt: note.updated_at
          }));
          setNotes((localNotes) => [
            ...cloudNotes,
            ...localNotes.filter((localNote) => !cloudNotes.some((cloudNote) => cloudNote.id === localNote.id))
          ]);
        })
        .catch(() => {});
    }

    function onNotesUpdated(e) {
      if (e.detail) setNotes((current) => [
        ...e.detail,
        ...current.filter((note) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(note.id)) && !e.detail.some((localNote) => localNote.id === note.id))
      ]);
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
  }, [currentBook?.name, selectedChapter, session?.access_token]);

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
          setChapterError('');
          showToast('You are offline. Showing your saved chapter.');
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

  const parallelTranslation = translation === 'KJV' ? 'WEB' : 'KJV';

  useEffect(() => {
    if (!parallelEnabled) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    async function loadParallel() {
      setParallelLoading(true);
      setParallelError('');
      try {
        const response = await fetch(`/api/bible/chapter?translation=${parallelTranslation}&book=${encodeURIComponent(currentBook.id)}&chapter=${selectedChapter}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Could not load the parallel translation.');
        if (!cancelled) setParallelVerses(payload.verses || []);
      } catch (error) {
        if (!cancelled && error?.name !== 'AbortError') { setParallelVerses([]); setParallelError(error?.message || 'Could not load the parallel translation.'); }
      } finally {
        if (!cancelled) setParallelLoading(false);
      }
    }
    loadParallel();
    return () => { cancelled = true; controller.abort(); };
  }, [parallelEnabled, parallelTranslation, currentBook.id, selectedChapter, parallelRetry]);

  // Warm the next chapter in the server cache without blocking the current reading.
  useEffect(() => {
    if (selectedChapter >= currentBook.chapters) return;
    fetch(`/api/bible/chapter?translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(currentBook.id)}&chapter=${selectedChapter + 1}`).catch(() => {});
  }, [currentBook.id, currentBook.chapters, selectedChapter, translation]);

  const verses = chapterVerses;

  useEffect(() => {
    if (!session?.access_token) return undefined;
    let cancelled = false;
    async function loadHighlights() {
      try {
        const response = await fetch(`/api/bible/study?type=highlights&translation=${encodeURIComponent(translation)}&book_id=${encodeURIComponent(currentBook.id)}&book=${encodeURIComponent(currentBook.name)}&chapter=${selectedChapter}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json();
        if (!response.ok) return;
        const bookName = currentBook.name;
        if (!cancelled) setHighlights((previous) => {
          const next = { ...previous };
          (payload.items || []).forEach((item) => { next[`${bookName}-${item.chapter}-${item.verse}`] = item.color || 'gold'; });
          return next;
        });
      } catch {}
    }
    loadHighlights();
    return () => { cancelled = true; };
  }, [session?.access_token, currentBook.id, currentBook.name, selectedChapter, translation]);

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
        if (!cancelled) { setReadingPlans(payload.plans || []); setReadingPlanDays(payload.planDays || []); setReadingPlanProgress(payload.progress || []); }
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
    const query = scriptureSearchQuery.trim();
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
  }, [scriptureSearchQuery, translation]);

  const filteredBooks = useMemo(
    () => BIBLE_BOOKS.filter((book) => testamentFilter === 'ALL' || book.testament === testamentFilter),
    [testamentFilter]
  );

  function jumpToPassage() {
    const verseNumber = Number.parseInt(jumpVerse, 10);
    setPendingVerseJump(Number.isInteger(verseNumber) && verseNumber > 0 ? verseNumber : null);
    setChapterRetry((n) => n + 1);
    document.getElementById('bible-chapter-reader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    if (chapterLoading || pendingVerseJump == null) return;
    const target = document.getElementById(`bible-verse-${pendingVerseJump}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else showToast(`Verse ${pendingVerseJump} was not found in this chapter.`);
    setPendingVerseJump(null);
  }, [chapterLoading, pendingVerseJump, chapterVerses]);

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

  async function handleDownloadBookOffline() {
    if (bookDownloadProgress) return;
    const total = currentBook.chapters;
    setBookDownloadProgress({ done: 0, total });
    try {
      for (let chapterNumber = 1; chapterNumber <= total; chapterNumber += 1) {
        let chapterData = chapterNumber === selectedChapter ? verses : null;
        if (!chapterData?.length) {
          const response = await fetch(`/api/bible/chapter?translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(currentBook.id)}&chapter=${chapterNumber}`);
          const payload = await response.json();
          if (!response.ok || !Array.isArray(payload.verses) || !payload.verses.length) throw new Error(payload?.error || `Could not download chapter ${chapterNumber}.`);
          chapterData = payload.verses;
        }
        saveOfflineBibleChapter(currentBook.id, currentBook.name, chapterNumber, chapterData, translation);
        setBookDownloadProgress({ done: chapterNumber, total });
      }
      let storageMessage = '';
      try {
        if (navigator.storage?.estimate) {
          const estimate = await navigator.storage.estimate();
          if (Number.isFinite(estimate.usage)) storageMessage = ` Device storage currently uses ${(estimate.usage / (1024 * 1024)).toFixed(1)} MB.`;
        }
      } catch {}
      showToast(`${currentBook.name} saved for offline reading (${total} chapters).${storageMessage}`);
    } catch (error) {
      showToast(error?.message || 'The book download stopped. Download again to continue.');
    } finally {
      setBookDownloadProgress(null);
      setIsChapterOffline(isBibleChapterSavedOffline(currentBook.name, selectedChapter, translation));
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
        body: JSON.stringify({ type: 'highlight', action: alreadyHighlighted ? 'remove' : 'save', translation, book: currentBook.name, book_id: currentBook.id, chapter: selectedChapter, verse: vNum, color: selectedHighlightColor })
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
    const exists = bookmarkedVerseKeys.includes(String(vNum)) || local.some((entry) => entry.translation === item.translation && entry.book_id === item.book_id && Number(entry.chapter) === item.chapter && Number(entry.verse) === item.verse);
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
    const localNoteId = activeNote?.id || saved[0]?.id;
    setShowNotesDrawer(false);
    setActiveNote(null);
    showToast('Sermon note saved offline! 📝');
    if (session?.access_token) {
      const verseMatch = noteForm.scripture.match(/:(\d+)/);
      fetch('/api/bible/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          id: localNoteId,
          title: noteForm.title.trim(),
          speaker: noteForm.speaker.trim(),
          church: noteForm.church.trim(),
          scripture: noteForm.scripture.trim(),
          content: noteForm.content.trim(),
          tags: tagsArr,
          book: currentBook.name,
          book_id: currentBook.id,
          chapter: selectedChapter,
          verse: verseMatch ? Number(verseMatch[1]) : null,
          translation
        })
      }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Note sync failed.');
        const cloud = payload.note;
        const cloudNote = {
          id: cloud.id,
          title: cloud.title || 'Bible note',
          speaker: cloud.speaker || '',
          church: cloud.church || '',
          scripture: cloud.ref_range || noteForm.scripture.trim(),
          content: cloud.content || cloud.body_md || '',
          tags: Array.isArray(cloud.tags) ? cloud.tags : tagsArr,
          color: cloud.color || '#0ea5e9',
          createdAt: cloud.created_at,
          updatedAt: cloud.updated_at
        };
        const current = getSavedNotes();
        const synced = current.map((item) => item.id === localNoteId ? cloudNote : item);
        window.localStorage.setItem('shammah_sermon_notes_v1', JSON.stringify(synced));
        setNotes([
          cloudNote,
          ...notes.filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(item.id)) && item.id !== localNoteId && item.id !== cloudNote.id),
          ...synced.filter((item) => item.id !== cloudNote.id)
        ]);
      }).catch((error) => showToast(error?.message || 'Note saved locally; cloud sync failed.'));
    }
    playSound('reaction');
  }

  function handleDeleteNote(id) {
    if (window.confirm('Delete this sermon note?')) {
      const remaining = deleteNote(id);
      setNotes((items) => [...items.filter((item) => item.id !== id), ...remaining.filter((localItem) => !items.some((item) => item.id === localItem.id))]);
      if (session?.access_token && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id))) {
        fetch('/api/bible/notes', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id }) })
          .then(async (response) => { if (!response.ok) { const payload = await response.json(); throw new Error(payload?.error || 'Cloud delete failed.'); } })
          .catch((error) => showToast(error?.message || 'Could not sync note deletion.'));
      }
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
            <span>Offline chapters</span>
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
              const nextDay = Math.min(done + 1, plan.days);
              const nextRefs = readingPlanDays.find((item) => item.plan_id === plan.id && item.day === nextDay)?.refs || [];
              return <article key={plan.id} style={{ border: '1px solid var(--border)', borderTop: `3px solid ${plan.accent || '#0d9488'}`, borderRadius: '12px', padding: '12px', background: 'var(--bg)' }}>
                <h4 style={{ margin: '0 0 5px' }}>{plan.title}</h4>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', margin: '0 0 8px' }}>{plan.description}</p>
                <p style={{ fontSize: '0.84rem', margin: '0 0 9px' }}>{done} / {plan.days} days complete</p>
                <div style={{ height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}><div style={{ width: `${Math.min(100, (done / plan.days) * 100)}%`, height: '100%', background: plan.accent || '#0d9488' }} /></div>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setActivePlanId(isActive ? '' : plan.id)}>{isActive ? 'Hide plan' : 'View plan'}</button>
                  {done < plan.days && <button type="button" className="cx-btn cx-btn-primary" disabled={savingPlanProgress} onClick={() => markReadingPlanDay(plan)}>{savingPlanProgress ? 'Saving…' : 'Complete next day'}</button>}
                </div>
                {isActive && <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}><strong>Next reading</strong><p style={{ margin: '5px 0 0', color: 'var(--ink-muted)', fontSize: '0.9rem' }}>Day {nextDay} of {plan.days}</p><ul style={{ margin: '6px 0 0', paddingLeft: '18px', color: 'var(--ink-muted)', fontSize: '0.9rem' }}>{nextRefs.map((ref, index) => <li key={index}>{String(ref).replace(/^\"|\"$/g, '')}</li>)}</ul></div>}
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
          <input id="bible-scripture-search" type="search" value={scriptureSearchQuery} onChange={(e) => setScriptureSearchQuery(e.target.value)} placeholder="e.g. John 3:16 or faith" aria-label="Search Bible text or reference" style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }} />
          {scriptureSearchQuery && <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setScriptureSearchQuery('')} aria-label="Clear Bible search">Clear</button>}
        </div>
        {scriptureSearchQuery.trim().length >= 2 && (
          <div style={{ marginTop: '10px' }} aria-live="polite">
            {searching ? <p>Searching Scripture…</p> : searchError ? <p role="alert">{searchError} <button type="button" className="cx-btn cx-btn-ghost" onClick={() => setScriptureSearchQuery((q) => q + ' ')}>Retry</button></p> : searchResults.length ? (
              <div style={{ display: 'grid', gap: '6px' }}>
                {searchResults.slice(0, 12).map((result) => (
                  <button key={`${result.book_id}-${result.chapter}-${result.verse}`} type="button" onClick={() => { setSelectedBookId(result.book_id); setSelectedChapter(result.chapter); setScriptureSearchQuery(''); setChapterRetry((n) => n + 1); }} style={{ textAlign: 'left', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer' }}>
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
            <button type="button" className={`bible-filter-btn${parallelEnabled ? ' active' : ''}`} onClick={() => setParallelEnabled((enabled) => !enabled)} aria-pressed={parallelEnabled} style={{ marginLeft: '8px' }}>
              {parallelEnabled ? 'Hide parallel' : 'Parallel view'}
            </button>
          </div>
        </div>

        {/* Direct passage navigator: book, chapter, and optional verse */}
        <div className="bible-direct-navigator" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '10px', padding: '12px 0 4px' }} aria-label="Jump to a Bible passage">
          <label style={{ display: 'grid', gap: '5px', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
            Book
            <select className="bible-select" value={selectedBookId} onChange={(e) => { setSelectedBookId(e.target.value); setSelectedChapter(1); setJumpVerse(''); setPendingVerseJump(null); }} aria-label="Choose Bible book">
              {filteredBooks.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '5px', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
            Chapter
            <select className="bible-select" value={selectedChapter} onChange={(e) => { setSelectedChapter(Number(e.target.value)); setJumpVerse(''); setPendingVerseJump(null); }} aria-label="Choose chapter">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '5px', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
            Verse (optional)
            <input className="bible-select" type="number" min="1" max="200" inputMode="numeric" value={jumpVerse} onChange={(e) => setJumpVerse(e.target.value)} placeholder="e.g. 16" aria-label="Optional verse number" />
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button type="button" className="cx-btn cx-btn-primary" onClick={jumpToPassage} style={{ width: '100%', minHeight: '42px' }}>Go to passage</button>
          </div>
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
            <button
              type="button"
              className="chapter-offline-download-btn"
              onClick={handleDownloadBookOffline}
              disabled={Boolean(bookDownloadProgress)}
              title={`Download all ${currentBook.chapters} chapters of ${currentBook.name} for offline reading`}
            >
              <DownloadCloud size={13} />
              <span>{bookDownloadProgress ? `Saving ${bookDownloadProgress.done}/${bookDownloadProgress.total}` : 'Download Book'}</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: parallelEnabled ? 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' : 'minmax(0, 1fr)', gap: '14px', alignItems: 'start' }}>
        <section aria-label={`${translation} scripture`}>
          {parallelEnabled && <h4 style={{ margin: '0 0 8px', color: 'var(--ink-muted)' }}>{translation}</h4>}
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
        </section>
        {parallelEnabled && <section aria-label={`${parallelTranslation} parallel scripture`}>
          <h4 style={{ margin: '0 0 8px', color: 'var(--ink-muted)' }}>{parallelTranslation}</h4>
          {parallelLoading ? <div role="status" className="bible-verses-list"><p>Loading parallel translation…</p></div> : parallelError ? <div role="alert" className="bible-verses-list"><p>{parallelError}</p><button type="button" className="cx-btn cx-btn-ghost" onClick={() => setParallelRetry((n) => n + 1)}>Retry parallel view</button></div> : <div className="bible-verses-list">{parallelVerses.map((v) => <div className="bible-verse-row" key={v.num}><span className="verse-number-btn" aria-hidden="true">{v.num}</span><p className="verse-text">{v.text}</p></div>)}</div>}
        </section>}
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
