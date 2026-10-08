'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  QrCode,
  Sparkles,
  BarChart3,
  BookOpen,
  Clock,
  Volume2,
  Eye,
  EyeOff,
  Flame,
  Award,
  Users,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function ProjectionModeModal({
  type = 'course', // 'course' | 'poll' | 'scripture'
  data = {},
  onClose,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showPresenterNotes, setShowPresenterNotes] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [pollVotes, setPollVotes] = useState(data?.counts || {});
  const [pollRevealed, setPollRevealed] = useState(true);
  const [themeMode, setThemeMode] = useState('sanctuary'); // 'sanctuary' (dark neon) | 'high-contrast' (black/gold)
  const [elapsedTime, setElapsedTime] = useState(0);
  const containerRef = useRef(null);

  // Timer for service/class
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent background scroll & eliminate screen glitch
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Listen to fullscreen changes to sync state accurately
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function formatTimer(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Keyboard navigation for presentation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex, slides.length]);

  function toggleFullscreen() {
    playSound('reaction');
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }

  // Prepare slides if course
  const slides = data?.modules
    ? data.modules.map((m, idx) => ({
        index: idx + 1,
        title: m.title,
        duration: m.duration,
        instructor: data.instructor || 'Pastor David Mwangi',
        courseTitle: data.title || 'Discipleship Curriculum',
        scripture: m.scripture || 'Matthew 28:19-20',
        content:
          m.notes ||
          `"Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to observe all that I have commanded you. And behold, I am with you always, to the end of the age."`,
        keyPoints: m.keyPoints || [
          'Foundation: Established in the Grace & Truth of Jesus Christ',
          'Practice: Daily communion, prayer, and meditating on the Word',
          'Application: Exercising authority in family, work, and community',
        ],
        notes: m.presenterNotes || 'Remind class to write down the memory verse. Invite 2 volunteers for quick reflection.',
      }))
    : [
        {
          index: 1,
          title: data.title || 'Teaching & Scripture',
          courseTitle: data.category || 'Kingdom Ministry',
          scripture: 'Romans 12:1-2',
          content:
            data.text_content ||
            `"Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God’s will is—his good, pleasing and perfect will."`,
          keyPoints: ['Renewing the mind with the Word', 'Living sacrifice of worship', 'Discerning God’s will together'],
          notes: 'Encourage congregants to scan the QR code to participate on their mobile devices.',
        },
      ];

  const currentSlide = slides[currentSlideIndex] || slides[0];

  function handleNextSlide() {
    if (currentSlideIndex < slides.length - 1) {
      playSound('reaction');
      setCurrentSlideIndex((prev) => prev + 1);
    }
  }

  function handlePrevSlide() {
    if (currentSlideIndex > 0) {
      playSound('reaction');
      setCurrentSlideIndex((prev) => prev - 1);
    }
  }

  // Calculate Poll total votes
  const pollOptions = data.options || [
    { id: 'opt-1', label: 'Option 1' },
    { id: 'opt-2', label: 'Option 2' },
  ];
  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + (b || 0), 0);

  function simulateAudienceVote(optId) {
    playSound('reaction');
    setPollVotes((prev) => ({
      ...prev,
      [optId]: (prev[optId] || 0) + 1,
    }));
  }

  return (
    <div
      ref={containerRef}
      className={`projection-mode-shell ${themeMode === 'sanctuary' ? 'sanctuary-theme' : 'contrast-theme'}`}
    >
      {/* Top Stage Control Header Bar */}
      <header className="projection-top-bar">
        <div className="projection-brand-col">
          <span className="projection-live-badge">
            <span className="live-dot" /> LIVE SANCTUARY PROJECTION
          </span>
          <span className="projection-institution-name">
            {data.churchName || 'Shammah Fellowship & Discipleship Academy'}
          </span>
        </div>

        {/* Presentation Title */}
        <div className="projection-stage-title">
          {type === 'poll' ? (
            <span className="stage-title-pill">
              <BarChart3 size={16} className="text-amber-400" />
              <span>Interactive Fellowship Poll</span>
            </span>
          ) : (
            <span className="stage-title-pill">
              <BookOpen size={16} className="text-cyan-400" />
              <span>{currentSlide.courseTitle}</span>
            </span>
          )}
        </div>

        {/* Stage Presenter Controls */}
        <div className="projection-ctrl-col">
          <div className="projection-timer" title="Elapsed service time">
            <Clock size={13} />
            <span>{formatTimer(elapsedTime)}</span>
          </div>

          <button
            type="button"
            className={`projection-btn icon${showQrCode ? ' active-toggle' : ''}`}
            onClick={() => setShowQrCode(!showQrCode)}
            title={showQrCode ? 'Hide Live Audience QR' : 'Show Live Audience QR'}
            aria-label="Toggle QR Code"
          >
            <QrCode size={15} />
            <span className="btn-label-desktop">QR</span>
          </button>

          <button
            type="button"
            className={`projection-btn icon${showPresenterNotes ? ' active-toggle' : ''}`}
            onClick={() => setShowPresenterNotes(!showPresenterNotes)}
            title="Toggle Presenter Notes"
            aria-label="Toggle Presenter Notes"
          >
            {showPresenterNotes ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="btn-label-desktop">Notes</span>
          </button>

          <button
            type="button"
            className="projection-btn icon"
            onClick={() => setThemeMode(themeMode === 'sanctuary' ? 'high-contrast' : 'sanctuary')}
            title="Switch Projector Contrast"
            aria-label="Switch Theme"
          >
            <Sparkles size={15} />
          </button>

          <button
            type="button"
            className="projection-btn icon fullscreen-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            type="button"
            className="projection-btn exit-btn"
            onClick={onClose}
            title="Exit Projection Mode (Esc)"
            aria-label="Exit Projection Mode"
          >
            <X size={15} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Sanctuary Projection Canvas */}
      <main className="projection-stage-canvas">
        {/* ================= POLL PROJECTION ================= */}
        {type === 'poll' ? (
          <div className="projection-poll-stage">
            <div className="projection-poll-header">
              <span className="poll-badge-stage">FELLOWSHIP LIVE VOTE</span>
              <h1 className="projection-poll-question">
                {data.text_content || 'Which spiritual discipline has deepened your walk most this season?'}
              </h1>
              <p className="projection-poll-sub">
                Scan the QR code with your phone or choose an option on screen.
              </p>
            </div>

            {/* Poll Bars */}
            <div className="projection-poll-options">
              {pollOptions.map((opt, i) => {
                const count = pollVotes[opt.id] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return (
                  <div
                    key={opt.id || i}
                    className="projection-poll-option-card"
                    onClick={() => simulateAudienceVote(opt.id)}
                    title="Click to simulate live audience vote"
                  >
                    <div className="projection-poll-bar-fill" style={{ width: `${pct}%` }} />
                    <div className="projection-poll-option-content">
                      <span className="poll-letter-badge">{String.fromCharCode(65 + i)}</span>
                      <span className="poll-option-label-large">{opt.label}</span>
                      <div className="poll-option-stats">
                        <span className="poll-stat-pct">{pct}%</span>
                        <span className="poll-stat-count">({count} votes)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Poll Bottom Stat */}
            <div className="projection-poll-footer-stats">
              <div className="stat-pill">
                <Users size={18} className="text-cyan-400" />
                <span>Total Live Votes: <strong>{totalVotes}</strong></span>
              </div>
              <button
                type="button"
                className="projection-reveal-btn"
                onClick={() => {
                  playSound('reaction');
                  setPollRevealed(true);
                }}
              >
                <Sparkles size={16} />
                <span>Reveal Final Breakdown</span>
              </button>
            </div>
          </div>
        ) : (
          /* ================= COURSE & SCRIPTURE PROJECTION ================= */
          <div className="projection-course-stage">
            {/* Slide Header */}
            <div className="projection-slide-top">
              <span className="slide-num-pill">
                MODULE {currentSlide.index} OF {slides.length}
              </span>
              <h2 className="projection-slide-title">{currentSlide.title}</h2>
              {currentSlide.scripture && (
                <div className="projection-scripture-ref">
                  <span>📖 {currentSlide.scripture}</span>
                </div>
              )}
            </div>

            {/* Main Slide Content / Scripture Verse */}
            <div className="projection-slide-body">
              <div className="projection-scripture-quote-box">
                <p className="projection-scripture-text">
                  {currentSlide.content}
                </p>
              </div>

              {/* Key points for study / discussion */}
              {currentSlide.keyPoints && (
                <div className="projection-keypoints-box">
                  <h3 className="keypoints-title">Core Discipleship Points:</h3>
                  <div className="keypoints-grid">
                    {currentSlide.keyPoints.map((pt, i) => (
                      <div key={i} className="keypoint-card">
                        <span className="keypoint-bullet">{i + 1}</span>
                        <p>{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Audience QR Code Badge (Docked Non-Overlapping) */}
        {showQrCode && (
          <aside className="projection-qr-overlay" role="complementary" aria-label="Audience Live Sync">
            <div className="qr-box-inner">
              {/* SVG QR Code Simulation */}
              <div className="qr-visual-box">
                <svg viewBox="0 0 100 100" className="qr-svg-mock">
                  <rect x="0" y="0" width="100" height="100" fill="#ffffff" rx="8" />
                  {/* Position squares */}
                  <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                  <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                  <rect x="18" y="18" width="9" height="9" fill="#0f172a" />

                  <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                  <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                  <rect x="73" y="18" width="9" height="9" fill="#0f172a" />

                  <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                  <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                  <rect x="18" y="73" width="9" height="9" fill="#0f172a" />

                  {/* QR pattern dots */}
                  <rect x="42" y="12" width="6" height="6" fill="#0f172a" />
                  <rect x="52" y="18" width="6" height="6" fill="#0f172a" />
                  <rect x="42" y="26" width="6" height="6" fill="#0f172a" />
                  <rect x="42" y="42" width="16" height="16" fill="#0f172a" />
                  <rect x="68" y="45" width="8" height="8" fill="#0f172a" />
                  <rect x="80" y="55" width="8" height="8" fill="#0f172a" />
                  <rect x="45" y="68" width="8" height="8" fill="#0f172a" />
                  <rect x="60" y="72" width="12" height="12" fill="#0f172a" />
                  <rect x="78" y="78" width="10" height="10" fill="#0f172a" />
                </svg>
              </div>
              <div className="qr-text-meta">
                <strong>Scan with Phone</strong>
                <span>Join &amp; vote live</span>
                <span className="qr-link-badge">shammah.faith</span>
              </div>
              <button
                type="button"
                className="qr-dismiss-btn"
                onClick={() => setShowQrCode(false)}
                title="Dismiss QR overlay"
                aria-label="Dismiss QR code"
              >
                <X size={14} />
              </button>
            </div>
          </aside>
        )}

        {/* Presenter Notes Confidence Monitor Drawer */}
        {showPresenterNotes && currentSlide?.notes && (
          <div className="projection-presenter-notes-drawer">
            <div className="presenter-notes-head">
              <span>🎙️ Instructor / Pastor Notes (Hidden from Congregation)</span>
              <button
                type="button"
                className="notes-close-btn"
                onClick={() => setShowPresenterNotes(false)}
              >
                ✕
              </button>
            </div>
            <p className="presenter-notes-body">{currentSlide.notes}</p>
          </div>
        )}
      </main>

      {/* Bottom Stage Navigation Controls */}
      <footer className="projection-bottom-bar">
        <button
          type="button"
          className="stage-nav-btn prev"
          onClick={handlePrevSlide}
          disabled={currentSlideIndex === 0}
          aria-label="Previous Slide"
        >
          <ChevronLeft size={20} />
          <span className="stage-nav-text">Previous</span>
        </button>

        {/* Slide Progress Indicator Dots */}
        <div className="stage-dots-row">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`stage-dot${i === currentSlideIndex ? ' active' : ''}`}
              onClick={() => setCurrentSlideIndex(i)}
              title={`Go to slide ${i + 1}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="stage-nav-btn next"
          onClick={handleNextSlide}
          disabled={currentSlideIndex === slides.length - 1}
          aria-label="Next Slide"
        >
          <span className="stage-nav-text">Next</span>
          <ChevronRight size={20} />
        </button>
      </footer>
    </div>
  );
}
