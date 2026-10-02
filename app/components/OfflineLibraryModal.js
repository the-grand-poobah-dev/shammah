'use client';
import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  getOfflineItems,
  removeOfflineItem,
  getRemainingDays,
} from '../lib/offlineSyncManager';
import Avatar from './Avatar';
import { playSound } from '../lib/soundEffects';

export default function OfflineLibraryModal({ onClose, onOpenItem }) {
  const [offlineItems, setOfflineItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // all | courses | audio | posts

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
              Downloaded media, lessons, and feeds remain available offline for up to 30 days without needing an internet connection.
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
                Tap the &quot;Save Offline (30 Days)&quot; icon on any post, course, sermon, or audio in the app to access it when you have no connection.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const daysLeft = getRemainingDays(item);
              return (
                <div key={item.id} className="offline-item-card">
                  <div className="offline-item-icon-wrap">
                    {item.type === 'course' ? (
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
                        By {item.profiles?.name || 'Author'}
                      </span>
                    </div>
                  </div>

                  <div className="offline-item-actions">
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
