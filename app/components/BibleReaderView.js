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
  getChapterVerses,
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

export default function BibleReaderView({ session, currentUser, openAuth }) {
  const [selectedBookId, setSelectedBookId] = useState('PSA');
  const [selectedChapter, setSelectedChapter] = useState(23);
  const [translation, setTranslation] = useState('NIV');
  const [isChapterOffline, setIsChapterOffline] = useState(false);
  const [testamentFilter, setTestamentFilter] = useState('ALL'); // ALL, OT, NT
  const [searchQuery, setSearchQuery] = useState('');
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

    window.addEventListener('shammah:notes-updated', onNotesUpdated);
    window.addEventListener('shammah:highlights-updated', onHighlightsUpdated);
    return () => {
      window.removeEventListener('shammah:notes-updated', onNotesUpdated);
      window.removeEventListener('shammah:highlights-updated', onHighlightsUpdated);
    };
  }, []);

  const verses = useMemo(
    () => getChapterVerses(currentBook.name, selectedChapter, translation),
    [currentBook.name, selectedChapter, translation]
  );

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
    const next = toggleVerseHighlight(key, selectedHighlightColor);
    setHighlights({ ...next });
    playSound('reaction');
    showToast('Verse highlighted!');
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
            <span>Complete Holy Bible · Word of Life</span>
          </div>
          <span className="bible-offline-chip" title="Complete Bible and notes are fully available offline on this device">
            <WifiOff size={13} />
            <span>100% Offline Ready</span>
          </span>
        </div>

        <h2 className="bible-title">Thy Word is a Lamp Unto My Feet</h2>
        <p className="bible-subtitle">
          Read the complete NIV Bible, highlight life-giving verses, and capture sermon & fellowship notes during service.
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
              onChange={(e) => setTranslation(e.target.value)}
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

        {/* Chapter numbers row */}
        <div className="bible-chapters-wrapper">
          <span className="bible-chapters-label">Chapter:</span>
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

        {/* Chapter Navigation Buttons */}
        <div className="bible-ch-nav-row">
          <button
            type="button"
            className="ch-prev-next-btn"
            disabled={selectedChapter <= 1}
            onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
          >
            ← Previous Chapter
          </button>
          <button
            type="button"
            className="ch-prev-next-btn"
            disabled={selectedChapter >= currentBook.chapters}
            onClick={() => setSelectedChapter((c) => Math.min(currentBook.chapters, c + 1))}
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
            <h3 className="snotes-heading">Sermon & Fellowship Notes ({notes.length})</h3>
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
                  <span className="sn-date">
                    {new Date(n.updatedAt || n.createdAt).toLocaleDateString()}
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
                <h3>{activeNote?.id ? 'Edit Sermon Note' : 'New Sermon & Fellowship Note'}</h3>
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
