'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DownloadCloud,
  Clock,
  Trash2,
  Play,
  FileText,
  BookOpen,
  Music,
  Video,
  X,
  Sparkles,
  WifiOff,
  Share2,
  Church,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  getOfflineItems,
  removeOfflineItem,
  getRemainingDays,
  getOfflineChurchFeed,
  getOfflineBibleChapter,
} from '../lib/offlineSyncManager';
import Avatar from './Avatar';
import { playSound } from '../lib/soundEffects';

export default function OfflineLibraryModal({ onClose, onOpenItem }) {
  const router = useRouter();
  const [offlineItems, setOfflineItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // all | church_feed | bible_chapter | courses | audio | posts
  const [expandedItemId, setExpandedItemId] = useState(null);

  function refresh() {
    setOfflineItems(getOfflineItems());
  }

  useEffect(() => {
    refresh();
    function onUpdate() {
      refresh();
    }
    window.addEventListener('shammah:offline-updated', onUpdate);
    return () => window.removeEventListener('shammah:offline-updated', onUpdate);
  }, []);

  function handleDelete(id) {
    playSound('reaction');
    removeOfflineItem(id);
    refresh();
  }

  const filtered = offlineItems.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'church_feed') return item.type === 'church_feed';
    if (activeFilter === 'bible_chapter') return item.type === 'bible_chapter';
    if (activeFilter === 'courses') return item.type === 'course';
    if (activeFilter === 'audio') return item.type === 'audio' || item.media_type === 'audio';
    if (activeFilter === 'posts') return item.type === 'post';
    return true;
  });

  return (
    <div className="vis-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="vis-modal-card neon-glow-modal offline-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="offline-modal-header">
          <div className="offline-modal-title">
            <DownloadCloud size={20} className="text-cyan-400" />
            <h3>Offline Synced Library</h3>
          </div>
          <button
            type="button"
            className="inst-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 30-Day Guarantee Banner */}
        <div className="offline-guarantee-banner">
          <WifiOff size={16} className="text-sky-400 flex-shrink-0" />
          <div>
            <strong>30-Day Offline Storage Enabled</strong>
            <p>
              Downloaded church feeds, Bible chapters, media, and notes remain available offline for up to 30 days without needing an internet connection.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="offline-filter-row">
          <button
            type="button"
            className={`offline-filter-pill${activeFilter === 'all' ? ' active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Items ({offlineItems.length})
          </button>
          <button
            type="button"
            className={`offline-filter-pill${activeFilter === 'church_feed' ? ' active' : ''}`}
            onClick={() => setActiveFilter('church_feed')}
          >
            <Church size={13} />
            <span>Church Feeds</span>
          </button>
          <button
            type="button"
            className={`offline-filter-pill${activeFilter === 'bible_chapter' ? ' active' : ''}`}
            onClick={() => setActiveFilter('bible_chapter')}
          >
            <BookOpen size={13} />
            <span>Bible Chapters</span>
          </button>
          <button
            type="button"
            className={`offline-filter-pill${activeFilter === 'courses' ? ' active' : ''}`}
            onClick={() => setActiveFilter('courses')}
          >
            <BookOpen size={13} />
            <span>Courses</span>
          </button>
          <button
            type="button"
            className={`offline-filter-pill${activeFilter === 'audio' ? ' active' : ''}`}
            onClick={() => setActiveFilter('audio')}
          >
            <Music size={13} />
            <span>Audio &amp; Sermons</span>
          </button>
          <button
            type="button"
            className={`offline-filter-pill${activeFilter === 'posts' ? ' active' : ''}`}
            onClick={() => setActiveFilter('posts')}
          >
            <FileText size={13} />
            <span>Feeds &amp; Notes</span>
          </button>
        </div>

        {/* List of Offline Items */}
        <div className="offline-items-list">
          {filtered.length === 0 ? (
            <div className="offline-empty-state">
              <DownloadCloud size={36} className="text-slate-500 mb-2" />
              <h4>No offline items saved</h4>
              <p>
                Download any church feed, Bible chapter, sermon note, or course to access it anytime without internet.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const daysLeft = getRemainingDays(item);
              const isExpanded = expandedItemId === item.id;
              const churchFeed = item.type === 'church_feed' ? (item.churchFeedData || getOfflineChurchFeed(item.id.replace('church-feed-', ''))) : null;
              const bibleChapter = item.type === 'bible_chapter' ? (item.bibleChapterData || getOfflineBibleChapter(item.bibleChapterData?.bookName, item.bibleChapterData?.chapterNum, item.bibleChapterData?.translation)) : null;

              function handleOpenItemTarget() {
                playSound('reaction');
                onClose?.();
                if (item.type === 'church_feed') {
                  const chId = churchFeed?.churchId || item.id.replace('church-feed-', '');
                  router.push(`/churches/${chId}`);
                } else if (item.type === 'bible_chapter') {
                  router.push('/?section=bible');
                } else if (onOpenItem) {
                  onOpenItem(item);
                }
              }

              return (
                <div key={item.id} className={`offline-item-card${isExpanded ? ' is-expanded' : ''}`}>
                  <div className="offline-item-main-row">
                    <div className="offline-item-icon-wrap">
                      {item.type === 'church_feed' ? (
                        <Church size={18} className="text-teal-400" />
                      ) : item.type === 'bible_chapter' ? (
                        <BookOpen size={18} className="text-emerald-400" />
                      ) : item.type === 'course' ? (
                        <BookOpen size={18} className="text-purple-400" />
                      ) : item.type === 'audio' ? (
                        <Music size={18} className="text-pink-400" />
                      ) : (
                        <FileText size={18} className="text-cyan-400" />
                      )}
                    </div>

                    <div className="offline-item-details">
                      <h4 className="offline-item-title">{item.title}</h4>
                      {item.text_content && (
                        <p className="offline-item-snippet">{item.text_content.slice(0, 100)}...</p>
                      )}
                      <div className="offline-item-meta">
                        <span className="offline-days-pill">
                          <Clock size={11} />
                          <span>{daysLeft} days remaining</span>
                        </span>
                        <span className="offline-author-name">
                          {item.type === 'church_feed' ? 'Church Feed Cache' : item.type === 'bible_chapter' ? 'Scripture Chapter Cache' : `By ${item.profiles?.name || 'Author'}`}
                        </span>
                      </div>
                    </div>

                    <div className="offline-item-actions">
                      {/* Read / Expand offline content toggle */}
                      {(churchFeed || bibleChapter) && (
                        <button
                          type="button"
                          className="offline-read-toggle-btn"
                          onClick={() => {
                            playSound('reaction');
                            setExpandedItemId(isExpanded ? null : item.id);
                          }}
                          title={isExpanded ? 'Collapse offline content' : 'Read offline cached content'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}

                      <button
                        type="button"
                        className="offline-open-btn"
                        onClick={handleOpenItemTarget}
                        title="Open interactive page"
                      >
                        <ExternalLink size={15} />
                      </button>

                      <button
                        type="button"
                        className="offline-delete-btn"
                        onClick={() => handleDelete(item.id)}
                        title="Remove from offline cache"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Offline Church Feed Posts Viewer */}
                  {isExpanded && churchFeed && (
                    <div className="offline-expanded-content">
                      <div className="offline-feed-preview-header">
                        <strong>📖 Cached Church Posts ({churchFeed.posts?.length || 0})</strong>
                        <button
                          type="button"
                          className="offline-link-action"
                          onClick={handleOpenItemTarget}
                        >
                          Open Church Page →
                        </button>
                      </div>
                      {(!churchFeed.posts || churchFeed.posts.length === 0) ? (
                        <p className="offline-empty-note">No posts were recorded in this church at download time.</p>
                      ) : (
                        <div className="offline-cached-posts-list">
                          {churchFeed.posts.map((post, pIdx) => (
                            <div key={post.id || pIdx} className="offline-cached-post-item">
                              <div className="cached-post-header">
                                <span className="cached-author">{post.profiles?.display_name || churchFeed.churchName}</span>
                                <span className="cached-date">{new Date(post.created_at || Date.now()).toLocaleDateString()}</span>
                              </div>
                              <p className="cached-post-text">{post.text_content || 'Shared media/announcement'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Offline Bible Chapter Verses Viewer */}
                  {isExpanded && bibleChapter && (
                    <div className="offline-expanded-content">
                      <div className="offline-feed-preview-header">
                        <strong>📖 {bibleChapter.bookName} {bibleChapter.chapterNum} ({bibleChapter.translation})</strong>
                        <button
                          type="button"
                          className="offline-link-action"
                          onClick={handleOpenItemTarget}
                        >
                          Open in Bible Reader →
                        </button>
                      </div>
                      <div className="offline-cached-verses-list">
                        {bibleChapter.verses?.map((verse) => (
                          <div key={verse.num} className="offline-cached-verse-line">
                            <span className="cached-verse-num">{verse.num}</span>
                            <span className="cached-verse-text">{verse.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="offline-modal-footer">
          <button
            type="button"
            className="signin-btn"
            onClick={onClose}
            style={{ width: '100%', padding: '10px 0' }}
          >
            Close Offline Library
          </button>
        </div>
      </div>
    </div>
  );
}
