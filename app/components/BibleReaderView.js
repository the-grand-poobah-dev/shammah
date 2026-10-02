'use client';
import { useState } from 'react';
import { BookOpen, Search, Bookmark, Share2, Sparkles, Heart, Check, ChevronRight } from 'lucide-react';
import ReactionBar from './ReactionBar';

const SCRIPTURE_PRESETS = [
  {
    book: 'Psalms',
    chapter: 23,
    verses: [
      { num: 1, text: 'The Lord is my shepherd; I shall not want.' },
      { num: 2, text: 'He makes me to lie down in green pastures; He leads me beside the still waters.' },
      { num: 3, text: 'He restores my soul; He leads me in the paths of righteousness for His name’s sake.' },
      { num: 4, text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil; For You are with me; Your rod and Your staff, they comfort me.' },
      { num: 5, text: 'You prepare a table before me in the presence of my enemies; You anoint my head with oil; My cup runs over.' },
      { num: 6, text: 'Surely goodness and mercy shall follow me all the days of my life; And I will dwell in the house of the Lord forever.' },
    ],
  },
  {
    book: 'Romans',
    chapter: 8,
    verses: [
      { num: 1, text: 'There is therefore now no condemnation to those who are in Christ Jesus, who do not walk according to the flesh, but according to the Spirit.' },
      { num: 28, text: 'And we know that all things work together for good to those who love God, to those who are the called according to His purpose.' },
      { num: 31, text: 'What then shall we say to these things? If God is for us, who can be against us?' },
      { num: 37, text: 'Yet in all these things we are more than conquerors through Him who loved us.' },
      { num: 38, text: 'For I am persuaded that neither death nor life, nor angels nor principalities nor powers, nor things present nor things to come,' },
      { num: 39, text: 'nor height nor depth, nor any other created thing, shall be able to separate us from the love of God which is in Christ Jesus our Lord.' },
    ],
  },
  {
    book: 'John',
    chapter: 14,
    verses: [
      { num: 1, text: 'Let not your heart be troubled; you believe in God, believe also in Me.' },
      { num: 2, text: 'In My Father’s house are many mansions; if it were not so, I would have told you. I go to prepare a place for you.' },
      { num: 6, text: 'Jesus said to him, "I am the way, the truth, and the life. No one comes to the Father except through Me."' },
      { num: 27, text: 'Peace I leave with you, My peace I give to you; not as the world gives do I give to you. Let not your heart be troubled, neither let it be afraid.' },
    ],
  },
  {
    book: 'Philippians',
    chapter: 4,
    verses: [
      { num: 4, text: 'Rejoice in the Lord always. Again I will say, rejoice!' },
      { num: 6, text: 'Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God;' },
      { num: 7, text: 'and the peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.' },
      { num: 13, text: 'I can do all things through Christ who strengthens me.' },
      { num: 19, text: 'And my God shall supply all your need according to His riches in glory by Christ Jesus.' },
    ],
  },
];

export default function BibleReaderView({ session, currentUser, openAuth }) {
  const [selectedBookIdx, setSelectedBookIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedVerses, setBookmarkedVerses] = useState(new Set());
  const [shareToast, setShareToast] = useState('');

  const currentPassage = SCRIPTURE_PRESETS[selectedBookIdx];

  function toggleBookmark(key) {
    setBookmarkedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleShareVerse(v) {
    const text = `"${v.text}" — ${currentPassage.book} ${currentPassage.chapter}:${v.num}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Bible Verse' });
      } catch {}
      return;
    }
    navigator.clipboard?.writeText(text);
    setShareToast('Verse copied to clipboard!');
    setTimeout(() => setShareToast(''), 2000);
  }

  return (
    <div className="section-feed-view bible-reader-view">
      {/* Daily Scripture Banner */}
      <div className="bible-hero-banner">
        <div className="bible-badge-tag">
          <BookOpen size={15} />
          <span>Holy Bible · Word of Life</span>
        </div>
        <h2 className="bible-title">Thy Word is a Lamp Unto My Feet</h2>
        <p className="bible-subtitle">
          Read, meditate, and reflect upon sacred scripture with the Shammah church family.
        </p>
      </div>

      {/* Book Tabs */}
      <div className="bible-book-tabs no-scrollbar" role="tablist">
        {SCRIPTURE_PRESETS.map((p, idx) => (
          <button
            key={`${p.book}-${p.chapter}`}
            type="button"
            role="tab"
            aria-selected={selectedBookIdx === idx}
            className={`bible-book-pill${selectedBookIdx === idx ? ' active' : ''}`}
            onClick={() => setSelectedBookIdx(idx)}
          >
            <span>{p.book} {p.chapter}</span>
          </button>
        ))}
      </div>

      {shareToast && <div className="video-toast-pill">{shareToast}</div>}

      {/* Chapter Reader Card */}
      <article className="post-card bible-chapter-card">
        <div className="bible-chapter-header">
          <h3 className="chapter-heading">{currentPassage.book} Chapter {currentPassage.chapter}</h3>
          <span className="bible-translation-badge">NKJV</span>
        </div>

        <div className="bible-verses-list">
          {currentPassage.verses.map((v) => {
            const vKey = `${currentPassage.book}-${currentPassage.chapter}-${v.num}`;
            const isBookmarked = bookmarkedVerses.has(vKey);
            return (
              <div key={v.num} className={`bible-verse-row${isBookmarked ? ' is-bookmarked' : ''}`}>
                <span className="verse-number">{v.num}</span>
                <p className="verse-text">{v.text}</p>
                <div className="verse-actions-mini">
                  <button
                    type="button"
                    className={`verse-icon-btn${isBookmarked ? ' active' : ''}`}
                    onClick={() => toggleBookmark(vKey)}
                    title={isBookmarked ? 'Bookmarked' : 'Bookmark verse'}
                  >
                    <Bookmark size={14} fill={isBookmarked ? 'var(--gold)' : 'none'} />
                  </button>
                  <button
                    type="button"
                    className="verse-icon-btn"
                    onClick={() => handleShareVerse(v)}
                    title="Share verse"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}
