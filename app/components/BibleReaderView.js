'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ChevronUp,
  Volume2,
  VolumeX,
  Pause,
  Play,
  WifiOff,
  Sparkles,
  Highlighter,
  ExternalLink,
  X,
  Copy,
  ChevronRight,
  ChevronLeft,
  Filter,
  DownloadCloud,
  Settings,
  Columns,
  Layers,
  Type,
  Sun,
  Moon,
  Flame,
  ArrowRight,
  RotateCcw,
  Compass,
  Calendar,
  Eye,
  EyeOff,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import {
  BIBLE_BOOKS,
  BIBLE_TRANSLATIONS,
  GENRE_COLORS,
  fetchChapterVerses,
  getSavedNotes,
  saveNote,
  deleteNote,
  getVerseHighlights,
  toggleVerseHighlight,
  getVerseBookmarks,
  toggleVerseBookmark,
  saveRecentReading,
  getRecentReading,
  getVerseOfTheDay,
  getCrossReferences,
} from '../lib/bibleManager';
import {
  saveOfflineBibleChapter,
  isBibleChapterSavedOffline,
  removeOfflineBibleChapter,
  getOfflineBibleChapter,
  downloadBibleBook,
  getStorageEstimate,
} from '../lib/offlineSyncManager';
import { playSound } from '../lib/soundEffects';
import { formatPostDate, useRelativeTimeTick } from '../lib/postDisplay';
import { ScrollAffordanceWrapper } from './ScrollAffordance';
import { downloadWatermarkedImage, copyWatermarkedImage } from '../lib/watermarkManager';

const HIGHLIGHT_COLORS = [
  { id: 'gold', color: '#eab308', label: 'Golden Word' },
  { id: 'emerald', color: '#10b981', label: 'Life & Grace' },
  { id: 'aqua', color: '#06b6d4', label: 'Peace & Truth' },
  { id: 'rose', color: '#ec4899', label: 'Love & Covenant' },
  { id: 'purple', color: '#a855f7', label: 'Kingship & Prophecy' },
];

export default function BibleReaderView({ session, currentUser, openAuth }) {
  const now = useRelativeTimeTick();

  // Navigation state
  const [selectedBookId, setSelectedBookId] = useState('PSA');
  const [selectedChapter, setSelectedChapter] = useState(23);
  const [translation, setTranslation] = useState('KJV');
  const [parallelTranslation, setParallelTranslation] = useState('WEB');
  const [isParallelActive, setIsParallelActive] = useState(false);

  // Content state
  const [verses, setVerses] = useState([]);
  const [parallelVerses, setParallelVerses] = useState([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isChapterOffline, setIsChapterOffline] = useState(false);

  // Active view tab: 'reader' or 'discover'
  const [activeTab, setActiveTab] = useState('reader');

  // Modals & Drawers
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [pickerTestament, setPickerTestament] = useState('ALL');
  const [pickerSearch, setPickerSearch] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showCrossRefsModal, setShowCrossRefsModal] = useState(false);
  const [crossRefData, setCrossRefData] = useState({ ref: '', list: [] });

  // Selected verse for action bar
  const [selectedVerseNum, setSelectedVerseNum] = useState(null);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState('gold');

  // Offline management & storage estimate
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);

  // Reading Plans
  const [readingPlans, setReadingPlans] = useState([]);
  const [plansDaysMap, setPlansDaysMap] = useState({});
  const [userPlanProgress, setUserPlanProgress] = useState({});
  const [activePlanId, setActivePlanId] = useState('bible-year');

  // Highlights, Bookmarks, Notes
  const [highlights, setHighlights] = useState({});
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({
    title: '',
    speaker: '',
    church: '',
    scripture: '',
    content: '',
    tags: '#Scripture',
    color: '#0ea5e9',
  });

  // Reader Settings
  const [fontSize, setFontSize] = useState('medium');
  const [fontFamily, setFontFamily] = useState('sans');
  const [lineHeight, setLineHeight] = useState('relaxed');
  const [readerTheme, setReaderTheme] = useState('default');
  const [showVerseNumbers, setShowVerseNumbers] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Audio SpeechSynthesis state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentSpokenVerse, setCurrentSpokenVerse] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  const speechUtteranceRef = useRef(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState('');
  const readerScrollRef = useRef(null);

  const currentBook = useMemo(
    () => BIBLE_BOOKS.find((b) => b.id === selectedBookId) || BIBLE_BOOKS[0],
    [selectedBookId]
  );

  const verseOfTheDay = useMemo(() => getVerseOfTheDay(), []);
  const recentReading = useMemo(() => getRecentReading(), [selectedBookId, selectedChapter]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2600);
  }

  // Deep linking & URL ref handler (?ref=John.3.16 or ?section=bible&ref=PSA.23)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref');
      if (refParam) {
        const parts = refParam.split('.');
        const b = parts[0];
        const ch = parseInt(parts[1], 10);
        const vs = parts[2] ? parseInt(parts[2], 10) : null;
        if (b) {
          const matched = BIBLE_BOOKS.find(
            (bk) => bk.id.toUpperCase() === b.toUpperCase() || bk.name.toLowerCase() === b.toLowerCase()
          );
          if (matched) {
            setSelectedBookId(matched.id);
            if (!isNaN(ch) && ch >= 1 && ch <= matched.chapters) {
              setSelectedChapter(ch);
            }
            if (vs) {
              setSelectedVerseNum(vs);
              setTimeout(() => {
                const el = document.getElementById(`verse-${vs}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 600);
            }
          }
        }
      }
    } catch {}
  }, []);

  // Fetch Primary Chapter Verses
  const loadChapter = useCallback(
    async (bookId, chapterNum, trans) => {
      setIsLoadingVerses(true);
      setLoadError(null);
      try {
        const result = await fetchChapterVerses(bookId, chapterNum, trans);
        if (result && result.length > 0) {
          setVerses(result);
          saveRecentReading(bookId, currentBook.name, chapterNum, trans);
        } else {
          setVerses([]);
          setLoadError('Scripture text is temporarily unreachable. Tap retry or check your connection.');
        }
      } catch (err) {
        setLoadError(err?.message || 'Failed to load chapter');
      } finally {
        setIsLoadingVerses(false);
      }
    },
    [currentBook.name]
  );

  // Fetch Parallel Chapter Verses when parallel view is active
  const loadParallelChapter = useCallback(async (bookId, chapterNum, pTrans) => {
    try {
      const pResult = await fetchChapterVerses(bookId, chapterNum, pTrans);
      setParallelVerses(pResult || []);
    } catch {
      setParallelVerses([]);
    }
  }, []);

  useEffect(() => {
    loadChapter(selectedBookId, selectedChapter, translation);
    if (isParallelActive) {
      loadParallelChapter(selectedBookId, selectedChapter, parallelTranslation);
    }
  }, [selectedBookId, selectedChapter, translation, isParallelActive, parallelTranslation, loadChapter, loadParallelChapter]);

  // Prefetch next chapter in background
  useEffect(() => {
    if (selectedChapter < currentBook.chapters) {
      fetchChapterVerses(selectedBookId, selectedChapter + 1, translation).catch(() => {});
    }
  }, [selectedBookId, selectedChapter, translation, currentBook.chapters]);

  // Load stored user state (highlights, bookmarks, notes, plans)
  useEffect(() => {
    setHighlights(getVerseHighlights());
    setBookmarks(getVerseBookmarks());
    setNotes(getSavedNotes());

    function onNotes(e) {
      if (e.detail) setNotes(e.detail);
    }
    function onHl(e) {
      if (e.detail) setHighlights(e.detail);
    }
    function onBm(e) {
      if (e.detail) setBookmarks(e.detail);
    }

    window.addEventListener('shammah:notes-updated', onNotes);
    window.addEventListener('shammah:highlights-updated', onHl);
    window.addEventListener('shammah:bookmarks-updated', onBm);

    fetch(`/api/bible/plans${currentUser?.id ? `?userId=${currentUser.id}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plans) setReadingPlans(data.plans);
        if (data.daysMap) setPlansDaysMap(data.daysMap);
        if (data.userProgress) setUserPlanProgress(data.userProgress);
      })
      .catch(() => {});

    getStorageEstimate().then((est) => setStorageEstimate(est));

    return () => {
      window.removeEventListener('shammah:notes-updated', onNotes);
      window.removeEventListener('shammah:highlights-updated', onHl);
      window.removeEventListener('shammah:bookmarks-updated', onBm);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    setIsChapterOffline(isBibleChapterSavedOffline(currentBook.name, selectedChapter, translation));
  }, [currentBook.name, selectedChapter, translation]);

  const toggleWakeLock = async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockActive) {
          await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          showToast('Screen wake lock active: screen will remain on');
        } else {
          setWakeLockActive(false);
          showToast('Screen wake lock released');
        }
      } catch {
        showToast('WakeLock not supported on this browser');
      }
    } else {
      showToast('WakeLock API unavailable');
    }
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (showBookPicker || showSettingsModal || showSearchModal || showNotesDrawer) return;
      if (e.key === 'ArrowLeft') {
        goToPrevChapter();
      } else if (e.key === 'ArrowRight') {
        goToNextChapter();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function goToPrevChapter() {
    playSound('tap');
    if (selectedChapter > 1) {
      setSelectedChapter((prev) => prev - 1);
      setSelectedVerseNum(null);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.id === selectedBookId);
      if (idx > 0) {
        const prevBook = BIBLE_BOOKS[idx - 1];
        setSelectedBookId(prevBook.id);
        setSelectedChapter(prevBook.chapters);
        setSelectedVerseNum(null);
      }
    }
  }

  function goToNextChapter() {
    playSound('tap');
    if (selectedChapter < currentBook.chapters) {
      setSelectedChapter((prev) => prev + 1);
      setSelectedVerseNum(null);
    } else {
      const idx = BIBLE_BOOKS.findIndex((b) => b.id === selectedBookId);
      if (idx < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[idx + 1];
        setSelectedBookId(nextBook.id);
        setSelectedChapter(1);
        setSelectedVerseNum(null);
      }
    }
  }

  function handleToggleOffline() {
    playSound('reaction');
    if (isChapterOffline) {
      removeOfflineBibleChapter(currentBook.name, selectedChapter, translation);
      setIsChapterOffline(false);
      showToast(`${currentBook.name} ${selectedChapter} removed from offline cache`);
    } else {
      saveOfflineBibleChapter(currentBook.id, currentBook.name, selectedChapter, verses, translation);
      setIsChapterOffline(true);
      playSound('badge');
      showToast(`✓ ${currentBook.name} ${selectedChapter} saved for offline reading`);
    }
  }

  async function handleDownloadEntireBook(book) {
    playSound('tap');
    setDownloadProgress({ bookId: book.id, current: 0, total: book.chapters });
    showToast(`Downloading all ${book.chapters} chapters of ${book.name} (${translation})...`);
    await downloadBibleBook(book, translation, (current, total) => {
      setDownloadProgress({ bookId: book.id, current, total });
    });
    setDownloadProgress(null);
    playSound('badge');
    showToast(`✓ ${book.name} completely downloaded for offline study!`);
    getStorageEstimate().then((est) => setStorageEstimate(est));
  }

  function stopAudio() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setCurrentSpokenVerse(null);
  }

  function startAudioReadAloud(startFromVerse = 1) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      showToast('Speech synthesis is not supported on this browser');
      return;
    }
    window.speechSynthesis.cancel();

    if (!verses || verses.length === 0) return;
    const startIndex = verses.findIndex((v) => v.num === startFromVerse);
    const versesToRead = startIndex >= 0 ? verses.slice(startIndex) : verses;

    setIsPlayingAudio(true);
    playSound('tap');

    let vIdx = 0;
    function readNext() {
      if (vIdx >= versesToRead.length) {
        setIsPlayingAudio(false);
        setCurrentSpokenVerse(null);
        return;
      }
      const v = versesToRead[vIdx];
      setCurrentSpokenVerse(v.num);

      const el = document.getElementById(`verse-${v.num}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const utterance = new SpeechSynthesisUtterance(`Verse ${v.num}. ${v.text}`);
      utterance.rate = speechRate;
      utterance.onend = () => {
        vIdx++;
        readNext();
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setCurrentSpokenVerse(null);
      };
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }

    readNext();
  }

  function handleVerseHighlight(verseNum, color) {
    playSound('reaction');
    const key = `${currentBook.name}-${selectedChapter}-${verseNum}`;
    const updated = toggleVerseHighlight(key, color);
    setHighlights(updated);
    showToast(`Verse ${verseNum} highlighted in ${color}`);
  }

  function handleVerseBookmark(verse) {
    playSound('reaction');
    const updated = toggleVerseBookmark({
      bookId: currentBook.id,
      bookName: currentBook.name,
      chapter: selectedChapter,
      verse: verse.num,
      text: verse.text,
      translation,
    });
    setBookmarks(updated);
    showToast(`Verse ${verse.num} bookmarked`);
  }

  function handleCopyVerse(verse) {
    playSound('tap');
    const text = `"${verse.text}" — ${currentBook.name} ${selectedChapter}:${verse.num} (${translation})`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Copied verse to clipboard');
    }
  }

  async function handleShareImageCard(verse) {
    playSound('tap');
    showToast('Generating watermarked scripture card...');
    const cardData = {
      text: `"${verse.text}"\n\n— ${currentBook.name} ${selectedChapter}:${verse.num} (${translation})`,
      category: 'Scripture',
      authorName: currentUser?.display_name || 'Shammah Fellowship',
      authorBadge: 'believer',
      verified: true,
      churchName: 'Holy Bible',
    };
    const ok = await downloadWatermarkedImage(cardData, `${currentBook.name}-${selectedChapter}-${verse.num}.png`);
    if (ok) {
      showToast('✓ Scripture card saved to device');
    } else {
      showToast('Sharing scripture card...');
    }
  }

  function handleAddVerseNote(verse) {
    playSound('tap');
    setNoteForm({
      title: `${currentBook.name} ${selectedChapter}:${verse.num} Study`,
      speaker: '',
      church: '',
      scripture: `${currentBook.name} ${selectedChapter}:${verse.num}`,
      content: `Scripture: "${verse.text}"\n\nNotes & Reflections:\n`,
      tags: '#ScriptureStudy',
      color: '#0ea5e9',
    });
    setShowNotesDrawer(true);
  }

  function handleShowCrossRefs(verse) {
    playSound('tap');
    const list = getCrossReferences(currentBook.name, selectedChapter, verse.num);
    setCrossRefData({
      ref: `${currentBook.name} ${selectedChapter}:${verse.num}`,
      list,
    });
    setShowCrossRefsModal(true);
  }

  async function handleTogglePlanDay(planId, day) {
    playSound('badge');
    const currentList = userPlanProgress[planId] || [];
    const isDone = currentList.includes(day);
    const updated = isDone ? currentList.filter((d) => d !== day) : [...currentList, day];

    setUserPlanProgress((prev) => ({ ...prev, [planId]: updated }));

    if (currentUser?.id) {
      try {
        await fetch('/api/bible/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            planId,
            day,
            completed: !isDone,
          }),
        });
      } catch {}
    }
    showToast(!isDone ? `✓ Day ${day} reading completed!` : `Day ${day} unmarked`);
  }

  const filteredBooksInPicker = useMemo(() => {
    return BIBLE_BOOKS.filter((b) => {
      if (pickerTestament === 'OT' && b.testament !== 'OT') return false;
      if (pickerTestament === 'NT' && b.testament !== 'NT') return false;
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [pickerTestament, pickerSearch]);

  const readerFontClass = fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  const readerLineHeightClass =
    lineHeight === 'compact' ? 'leading-normal' : lineHeight === 'loose' ? 'leading-loose' : 'leading-relaxed';
  const readerFontSizeStyle =
    fontSize === 'small' ? '14.5px' : fontSize === 'large' ? '18px' : fontSize === 'xlarge' ? '21px' : '16px';

  return (
    <div className={`bible-reader-view pb-16 ${readerTheme !== 'default' ? `reader-theme-${readerTheme}` : ''}`}>
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-teal-500/40 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          {toastMsg}
        </div>
      )}

      {/* Hero Banner with Modern Tabs */}
      <div className="bible-hero-banner relative overflow-hidden mb-4">
        <div className="bible-hero-topline flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="bible-badge-tag flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>Holy Scriptures</span>
            </span>
            {isChapterOffline && (
              <span className="bible-offline-chip flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Check className="w-3 h-3" />
                <span>Offline Cached</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearchModal(true)}
              aria-label="Search Scriptures"
              className="topbar-toggle-btn p-2 rounded-full border border-white/10 hover:border-teal-500/50 bg-white/5 text-slate-300 hover:text-white transition"
              title="Search Scriptures"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              aria-label="Reader Settings"
              className="topbar-toggle-btn p-2 rounded-full border border-white/10 hover:border-teal-500/50 bg-white/5 text-slate-300 hover:text-white transition"
              title="Font & Theme Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
          <button
            onClick={() => setActiveTab('reader')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              activeTab === 'reader'
                ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chapter Reader</span>
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              activeTab === 'discover'
                ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Bible Hub & Plans</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CHAPTER READER VIEW */}
      {activeTab === 'reader' && (
        <div className="flex flex-col gap-4">
          {/* Sticky Reader Controls Header */}
          <div className="bible-sticky-controls sticky top-14 z-30 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setShowBookPicker(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: GENRE_COLORS[currentBook.genre] || '#06b6d4' }}
              />
              <span>
                {currentBook.name} {selectedChapter}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-teal-400 cursor-pointer focus:outline-none"
              >
                {BIBLE_TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.short}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsParallelActive(!isParallelActive)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isParallelActive
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
                title="Parallel View (2 Translations)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Parallel</span>
              </button>

              <button
                onClick={handleToggleOffline}
                className={`p-2 rounded-xl border transition ${
                  isChapterOffline
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title={isChapterOffline ? 'Saved for offline' : 'Save offline'}
                aria-label="Toggle offline reading"
              >
                <DownloadCloud className="w-4 h-4" />
              </button>

              <button
                onClick={() => (isPlayingAudio ? stopAudio() : startAudioReadAloud(1))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  isPlayingAudio
                    ? 'bg-teal-500 text-slate-950 border-teal-400 animate-pulse'
                    : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                }`}
              >
                {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-teal-400" />}
                <span className="hidden sm:inline">{isPlayingAudio ? 'Stop' : 'Listen'}</span>
              </button>
            </div>
          </div>

          {/* Audio SpeechSynthesis Control Bar */}
          {isPlayingAudio && (
            <div className="bg-gradient-to-r from-teal-950/80 to-slate-900/90 border border-teal-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-fade-in flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span className="text-xs font-bold text-teal-300">
                  Reading {currentBook.name} {selectedChapter}
                  {currentSpokenVerse ? ` : Verse ${currentSpokenVerse}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10 text-xs">
                  <span className="text-slate-400 text-[10px]">Speed:</span>
                  {[0.75, 1, 1.25, 1.5].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        speechRate === rate ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={stopAudio}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold hover:bg-red-500/30 transition"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Parallel Secondary Translation Bar */}
          {isParallelActive && (
            <div className="bg-slate-900/80 border border-white/10 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Comparing with Parallel Version:</span>
              <select
                value={parallelTranslation}
                onChange={(e) => setParallelTranslation(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-teal-400 cursor-pointer"
              >
                {BIBLE_TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.short} — {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reader Main Content Card */}
          <div
            ref={readerScrollRef}
            className={`bible-chapter-card bg-slate-950/70 border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl relative ${readerFontClass} ${readerLineHeightClass}`}
            style={{ fontSize: readerFontSizeStyle }}
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 flex-wrap gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{currentBook.name}</span>
                  <span className="text-teal-400">Chapter {selectedChapter}</span>
                </h1>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  {currentBook.testament === 'OT' ? 'Old Testament' : 'New Testament'} · {currentBook.genre} · {translation}
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">Highlight:</span>
                {HIGHLIGHT_COLORS.map((hl) => (
                  <button
                    key={hl.id}
                    onClick={() => {
                      setSelectedHighlightColor(hl.id);
                      playSound('tap');
                    }}
                    style={{ backgroundColor: hl.color }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      selectedHighlightColor === hl.id ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={hl.label}
                    aria-label={hl.label}
                  />
                ))}
              </div>
            </div>

            {isLoadingVerses && (
              <div className="flex flex-col gap-3 py-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="flex items-start gap-3 animate-pulse">
                    <div className="w-6 h-4 bg-white/10 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-full" />
                      <div className="h-4 bg-white/5 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingVerses && loadError && (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <WifiOff className="w-8 h-8 text-rose-400" />
                <p className="text-sm text-slate-300 max-w-md">{loadError}</p>
                <button
                  onClick={() => loadChapter(selectedBookId, selectedChapter, translation)}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition"
                >
                  Retry Loading Chapter
                </button>
              </div>
            )}

            {!isLoadingVerses && !loadError && (
              <div
                className={`bible-verses-flow ${
                  isParallelActive ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-3'
                }`}
              >
                <div className="flex flex-col gap-3">
                  {isParallelActive && (
                    <div className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-white/10">
                      {translation} (Primary)
                    </div>
                  )}

                  {verses.map((verse) => {
                    const verseKey = `${currentBook.name}-${selectedChapter}-${verse.num}`;
                    const hlColor = highlights[verseKey];
                    const isBookmarked = bookmarks.some((b) => b.key === verseKey);
                    const isSpeaking = currentSpokenVerse === verse.num;
                    const isSelected = selectedVerseNum === verse.num;

                    return (
                      <div
                        id={`verse-${verse.num}`}
                        key={verse.num}
                        onClick={() => setSelectedVerseNum(isSelected ? null : verse.num)}
                        className={`bible-verse-row group p-2.5 rounded-xl cursor-pointer transition relative ${
                          hlColor ? `is-highlighted hl-${hlColor}` : ''
                        } ${isSpeaking ? 'speaking' : ''} ${isSelected ? 'ring-2 ring-teal-400/80 bg-teal-500/10' : ''}`}
                      >
                        {verse.heading && (
                          <h4 className="text-sm font-bold text-teal-300 mb-1.5 font-sans">{verse.heading}</h4>
                        )}

                        <div className="flex items-start gap-2.5">
                          {showVerseNumbers && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerseHighlight(verse.num, selectedHighlightColor);
                              }}
                              className="verse-number-btn font-sans text-xs font-black text-slate-500 hover:text-teal-400 min-w-[24px] text-right pt-0.5"
                              title="Highlight verse"
                            >
                              {verse.num}
                            </button>
                          )}

                          <p className="verse-text flex-1 text-slate-100">{verse.text}</p>

                          <div className="verse-actions-mini flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerseBookmark(verse);
                              }}
                              aria-label="Bookmark verse"
                              className={`verse-icon-btn ${isBookmarked ? 'active text-teal-400' : ''}`}
                              title={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyVerse(verse);
                              }}
                              aria-label="Copy verse text"
                              className="verse-icon-btn"
                              title="Copy text"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareImageCard(verse);
                              }}
                              aria-label="Share verse card"
                              className="verse-icon-btn"
                              title="Share as Image Card"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddVerseNote(verse);
                              }}
                              aria-label="Add study note"
                              className="verse-icon-btn"
                              title="Add Study Note"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowCrossRefs(verse);
                              }}
                              aria-label="Cross references"
                              className="verse-icon-btn"
                              title="Cross references"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap bg-slate-900/90 p-2.5 rounded-xl"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-slate-400 font-sans mr-1">Highlight:</span>
                              {HIGHLIGHT_COLORS.map((hl) => (
                                <button
                                  key={hl.id}
                                  onClick={() => handleVerseHighlight(verse.num, hl.id)}
                                  style={{ backgroundColor: hl.color }}
                                  className="w-5 h-5 rounded-full hover:scale-110 transition shadow"
                                  title={hl.label}
                                />
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleShareImageCard(verse)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold hover:bg-teal-500/30 transition"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Image Card</span>
                              </button>
                              <button
                                onClick={() => handleAddVerseNote(verse)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Note</span>
                              </button>
                              <button
                                onClick={() => startAudioReadAloud(verse.num)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>Read Aloud</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isParallelActive && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-bold text-teal-400 uppercase tracking-wider pb-2 border-b border-white/10">
                      {parallelTranslation} (Secondary)
                    </div>
                    {parallelVerses.map((pVerse) => (
                      <div key={pVerse.num} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-start gap-2.5">
                          <span className="font-sans text-xs font-bold text-slate-500 min-w-[24px] text-right pt-0.5">
                            {pVerse.num}
                          </span>
                          <p className="text-slate-300">{pVerse.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bible-ch-nav-row flex items-center justify-between gap-3 pt-6 mt-8 border-t border-white/10">
              <button
                onClick={goToPrevChapter}
                className="ch-prev-next-btn flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Chapter</span>
              </button>

              <span className="text-xs font-bold text-slate-400">
                {currentBook.name} {selectedChapter} / {currentBook.chapters}
              </span>

              <button
                onClick={goToNextChapter}
                className="ch-prev-next-btn flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition"
              >
                <span>Next Chapter</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BIBLE HUB, PLANS, DISCOVER & STUDY TOOLS */}
      {activeTab === 'discover' && (
        <div className="flex flex-col gap-6">
          {recentReading && (
            <div className="bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                    Jump Back In · Continue Reading
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {recentReading.bookName} Chapter {recentReading.chapter}
                  </h3>
                  <p className="text-xs text-slate-400">Translation: {recentReading.translation || 'KJV'}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedBookId(recentReading.bookId);
                  setSelectedChapter(recentReading.chapter);
                  if (recentReading.translation) setTranslation(recentReading.translation);
                  setActiveTab('reader');
                  playSound('tap');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition shadow-lg"
              >
                <span>Resume Reading</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Verse of the Day</span>
              </span>
              <span className="text-xs font-bold text-slate-400">{verseOfTheDay.translation}</span>
            </div>

            <blockquote className="text-lg sm:text-xl font-serif italic text-white leading-relaxed mb-4">
              &quot;{verseOfTheDay.text}&quot;
            </blockquote>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-wrap gap-2">
              <span className="text-sm font-bold text-teal-400">{verseOfTheDay.ref}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleShareImageCard({ text: verseOfTheDay.text, num: verseOfTheDay.verse });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Card</span>
                </button>
                <button
                  onClick={() => {
                    const matched = BIBLE_BOOKS.find((b) => b.name === verseOfTheDay.bookName);
                    if (matched) {
                      setSelectedBookId(matched.id);
                      setSelectedChapter(verseOfTheDay.chapter);
                      setSelectedVerseNum(verseOfTheDay.verse);
                      setActiveTab('reader');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read In Context</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>Guided Reading Plans</span>
                </h3>
                <p className="text-xs text-slate-400">Structured daily portions across the 66 books</p>
              </div>
              <button
                onClick={() => setShowPlansModal(true)}
                className="text-xs font-bold text-teal-400 hover:underline"
              >
                View All (6)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {readingPlans.slice(0, 3).map((plan) => {
                const doneCount = (userPlanProgress[plan.id] || []).length;
                const pct = Math.round((doneCount / plan.days) * 100);

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setActivePlanId(plan.id);
                      setShowPlansModal(true);
                      playSound('tap');
                    }}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 hover:border-teal-500/50 cursor-pointer transition flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${plan.accent}20`, color: plan.accent }}
                        >
                          {plan.kind}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{plan.days} Days</span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition">
                        {plan.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{plan.description}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Progress</span>
                        <span className="font-bold text-white">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: plan.accent }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>Explore Books by Genre</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {Object.entries(GENRE_COLORS).map(([genre, color]) => {
                const count = BIBLE_BOOKS.filter((b) => b.genre === genre).length;
                return (
                  <button
                    key={genre}
                    onClick={() => {
                      setPickerSearch(genre);
                      setShowBookPicker(true);
                      playSound('tap');
                    }}
                    className="p-3 rounded-xl border border-white/10 bg-slate-950/60 hover:bg-white/5 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold text-white">{genre}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{count} books</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-teal-400" />
                <span>My Bookmarked Verses ({bookmarks.length})</span>
              </h3>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-white/15 text-center text-slate-400 text-xs">
                No verses bookmarked yet. Tap the bookmark icon on any verse while reading to save it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bookmarks.slice(0, 6).map((bm) => (
                  <div
                    key={bm.key}
                    onClick={() => {
                      setSelectedBookId(bm.bookId || 'PSA');
                      setSelectedChapter(bm.chapter);
                      setSelectedVerseNum(bm.verse);
                      setActiveTab('reader');
                      playSound('tap');
                    }}
                    className="p-3.5 rounded-xl border border-white/10 bg-slate-950/70 hover:border-teal-500/40 cursor-pointer transition flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-400">
                        {bm.bookName} {bm.chapter}:{bm.verse}
                      </span>
                      <span className="text-[10px] text-slate-400">{bm.translation}</span>
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-2 italic">&quot;{bm.text}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: BOOK & CHAPTER GRID PICKER */}
      {showBookPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-400" />
                <span>Select Book & Chapter</span>
              </h3>
              <button
                onClick={() => setShowBookPicker(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-white/10 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                {['ALL', 'OT', 'NT'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPickerTestament(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      pickerTestament === t ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'ALL' ? 'All (66)' : t === 'OT' ? 'Old Testament (39)' : 'New Testament (27)'}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-[140px] relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by book name or genre..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Book ({filteredBooksInPicker.length})
                </div>
                {filteredBooksInPicker.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBookId(b.id);
                      setSelectedChapter(1);
                      playSound('tap');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition ${
                      selectedBookId === b.id
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: GENRE_COLORS[b.genre] || '#06b6d4' }}
                      />
                      <span className="font-bold">{b.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-sans">{b.chapters} chs</span>
                  </button>
                ))}
              </div>

              <div className="max-h-[55vh] overflow-y-auto pl-1 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                    {currentBook.name} Chapters ({currentBook.chapters})
                  </div>
                  <button
                    onClick={() => handleDownloadEntireBook(currentBook)}
                    disabled={downloadProgress?.bookId === currentBook.id}
                    className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10"
                  >
                    <DownloadCloud className="w-3 h-3 text-teal-400" />
                    <span>Download Book</span>
                  </button>
                </div>

                {downloadProgress?.bookId === currentBook.id && (
                  <div className="mb-3 p-2 bg-teal-500/10 border border-teal-500/30 rounded-xl text-xs text-teal-300">
                    Downloading: {downloadProgress.current} / {downloadProgress.total} chapters...
                  </div>
                )}

                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                  {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((chNum) => (
                    <button
                      key={chNum}
                      onClick={() => {
                        setSelectedChapter(chNum);
                        setShowBookPicker(false);
                        playSound('tap');
                      }}
                      className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                        selectedChapter === chNum
                          ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                          : 'bg-white/5 text-slate-300 hover:bg-white/15 border border-white/5'
                      }`}
                    >
                      {chNum}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: READER SETTINGS */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-400" />
                <span>Reading Experience Settings</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'small', label: 'Small' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'large', label: 'Large' },
                  { id: 'xlarge', label: 'X-Large' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setFontSize(s.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      fontSize === s.id
                        ? 'bg-teal-500 text-slate-950 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Typography
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFontFamily('sans')}
                  className={`py-2 px-3 rounded-xl text-xs font-sans font-bold transition ${
                    fontFamily === 'sans' ? 'bg-teal-500 text-slate-950' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  Sans-Serif (Modern)
                </button>
                <button
                  onClick={() => setFontFamily('serif')}
                  className={`py-2 px-3 rounded-xl text-xs font-serif font-bold transition ${
                    fontFamily === 'serif' ? 'bg-teal-500 text-slate-950' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  Serif (Editorial)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Line Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['compact', 'relaxed', 'loose'].map((lh) => (
                  <button
                    key={lh}
                    onClick={() => setLineHeight(lh)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition ${
                      lineHeight === lh ? 'bg-teal-500 text-slate-950' : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    {lh}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Reading Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'default', label: 'Dark Charcoal' },
                  { id: 'sepia', label: 'Warm Sepia' },
                  { id: 'light', label: 'Clean Paper' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setReaderTheme(th.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      readerTheme === th.id ? 'bg-teal-500 text-slate-950' : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Verse Numbers</div>
                  <div className="text-[11px] text-slate-400">Show numeric identifiers beside each verse</div>
                </div>
                <button
                  onClick={() => setShowVerseNumbers(!showVerseNumbers)}
                  className={`w-11 h-6 rounded-full transition-colors p-1 ${
                    showVerseNumbers ? 'bg-teal-500' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      showVerseNumbers ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Keep Screen On</div>
                  <div className="text-[11px] text-slate-400">Prevent screen dimming while reading</div>
                </div>
                <button
                  onClick={toggleWakeLock}
                  className={`w-11 h-6 rounded-full transition-colors p-1 ${
                    wakeLockActive ? 'bg-teal-500' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      wakeLockActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {storageEstimate && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Offline Storage Used: {storageEstimate.usageMB} MB</span>
                <span>Available: {storageEstimate.availableMB} MB</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: SCRIPTURE SEARCH & REFERENCE PARSER */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-teal-400" />
                <span>Scripture Search & Reference Parser</span>
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const q = e.target.elements.searchQ.value.trim();
                if (!q) return;
                playSound('tap');
                try {
                  const res = await fetch(`/api/bible/search?q=${encodeURIComponent(q)}&translation=${translation}`);
                  const data = await res.json();
                  if (data.type === 'reference' && data.bookName) {
                    const matched = BIBLE_BOOKS.find((b) => b.name === data.bookName);
                    if (matched) {
                      setSelectedBookId(matched.id);
                      setSelectedChapter(data.chapter);
                      if (data.verseStart) setSelectedVerseNum(data.verseStart);
                      setShowSearchModal(false);
                      setActiveTab('reader');
                      showToast(`Opened ${data.reference}`);
                    }
                  } else if (data.results && data.results.length > 0) {
                    const first = data.results[0];
                    setSelectedBookId(first.bookId);
                    setSelectedChapter(first.chapter);
                    setSelectedVerseNum(first.verse);
                    setShowSearchModal(false);
                    setActiveTab('reader');
                    showToast(`Opened ${first.reference}`);
                  } else {
                    showToast(data.message || 'No direct matches found. Try "John 3:16" or "Psalm 23".');
                  }
                } catch {
                  showToast('Search request error');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                name="searchQ"
                type="text"
                autoFocus
                placeholder="Type 'John 3:16', 'Ps 23', 'Romans 8' or keywords..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition"
              >
                Go
              </button>
            </form>

            <div className="text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300">Popular Quick References:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['John 3:16', 'Psalms 23:1', 'Romans 8:28', 'Philippians 4:13', 'Genesis 1:1', 'Matthew 5:1'].map(
                  (ref) => (
                    <button
                      key={ref}
                      onClick={() => {
                        const parts = ref.split(' ');
                        const bName = parts[0];
                        const chVs = parts[1].split(':');
                        const matched = BIBLE_BOOKS.find((b) => b.name === bName);
                        if (matched) {
                          setSelectedBookId(matched.id);
                          setSelectedChapter(parseInt(chVs[0], 10));
                          if (chVs[1]) setSelectedVerseNum(parseInt(chVs[1], 10));
                          setShowSearchModal(false);
                          setActiveTab('reader');
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-teal-400 text-[11px] font-semibold border border-white/5"
                    >
                      {ref}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CROSS REFERENCES */}
      {showCrossRefsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-teal-400" />
                <span>Cross References for {crossRefData.ref}</span>
              </h3>
              <button
                onClick={() => setShowCrossRefsModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {crossRefData.list.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No direct cross-references logged for this verse yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {crossRefData.list.map((cr, idx) => (
                  <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-teal-400 block mb-1">{cr.ref}</span>
                    <p className="text-xs text-slate-200 italic">&quot;{cr.text}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: READING PLANS */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-xl max-h-[85vh] p-6 shadow-2xl flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>Reading Plans & Daily Portions</span>
              </h3>
              <button
                onClick={() => setShowPlansModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {readingPlans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlanId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      activePlanId === p.id
                        ? 'bg-teal-500 text-slate-950 font-black'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              {(() => {
                const plan = readingPlans.find((p) => p.id === activePlanId) || readingPlans[0];
                if (!plan) return null;
                const days = plansDaysMap[plan.id] || [
                  { day: 1, refs: [{ book: 'Genesis', chapter: 1 }] },
                  { day: 2, refs: [{ book: 'Genesis', chapter: 2 }] },
                ];
                const completedList = userPlanProgress[plan.id] || [];

                return (
                  <div className="space-y-3">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
                        {plan.title} · {plan.days} Days
                      </div>
                      <p className="text-xs text-slate-300">{plan.description}</p>
                    </div>

                    <div className="text-xs font-bold text-white">Daily Reading Schedule:</div>
                    <div className="space-y-2">
                      {days.map((d) => {
                        const isDone = completedList.includes(d.day);
                        return (
                          <div
                            key={d.day}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                              isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleTogglePlanDay(plan.id, d.day)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                    : 'border-white/20 hover:border-white/50 text-transparent'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <div>
                                <span className="text-xs font-bold text-white block">Day {d.day}</span>
                                <span className="text-[11px] text-slate-400">
                                  {d.refs.map((r) => `${r.book} ${r.chapter}`).join(', ')}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (d.refs[0]) {
                                  const matched = BIBLE_BOOKS.find((b) => b.name === d.refs[0].book);
                                  if (matched) {
                                    setSelectedBookId(matched.id);
                                    setSelectedChapter(d.refs[0].chapter);
                                    setShowPlansModal(false);
                                    setActiveTab('reader');
                                  }
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold hover:bg-teal-500/30 transition"
                            >
                              Read
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 6: SERMON & STUDY NOTE CREATOR */}
      {showNotesDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-white/15 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <span>Scripture Study Note</span>
              </h3>
              <button
                onClick={() => setShowNotesDrawer(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveNote({
                  title: noteForm.title,
                  speaker: noteForm.speaker,
                  church: noteForm.church,
                  scripture: noteForm.scripture,
                  content: noteForm.content,
                  tags: [noteForm.tags],
                });
                setShowNotesDrawer(false);
                playSound('badge');
                showToast('✓ Scripture note saved');
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Scripture Reference</label>
                  <input
                    type="text"
                    value={noteForm.scripture}
                    onChange={(e) => setNoteForm({ ...noteForm, scripture: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Topic / Tag</label>
                  <input
                    type="text"
                    value={noteForm.tags}
                    onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Reflection & Notes</label>
                <textarea
                  rows={5}
                  required
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNotesDrawer(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold hover:bg-teal-400 transition"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
