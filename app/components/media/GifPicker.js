'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  Clock,
  Upload,
  X,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Check,
  FileImage,
} from 'lucide-react';
import { uploadPostMedia } from '../../lib/mediaUpload';
import { useSession } from '../../../lib/useSession';

const RECENT_GIFS_KEY = 'shammah_recent_gifs';
const MAX_RECENT = 24;

export default function GifPicker({ onSelect, onClose }) {
  const { session } = useSession();

  // Tabs: 'trending' | 'search' | 'recent' | 'upload'
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categories, setCategories] = useState([]);

  // Data & loading states
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfigured, setIsConfigured] = useState(true);

  // Recent GIFs from localStorage
  const [recentGifs, setRecentGifs] = useState([]);

  // Upload tab state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const containerRef = useRef(null);

  // Load Recent from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_GIFS_KEY);
      if (raw) setRecentGifs(JSON.parse(raw));
    } catch (_) {}
  }, []);

  // Fetch Categories on mount
  useEffect(() => {
    fetch('/api/gifs/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
        if (data.configured === false) {
          setIsConfigured(false);
          setActiveTab('upload');
        }
      })
      .catch(() => {});
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load GIFs for current tab & query
  const loadGifs = useCallback(async (isReset = false) => {
    if (activeTab === 'recent' || activeTab === 'upload') return;

    if (isReset) {
      setLoading(true);
      setErrorMsg('');
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    const currentOffset = isReset ? 0 : offset;
    const isSearch = activeTab === 'search' || Boolean(debouncedQuery);
    const endpoint = isSearch
      ? `/api/gifs/search?q=${encodeURIComponent(debouncedQuery || 'amen')}&limit=20&offset=${currentOffset}`
      : `/api/gifs/trending?limit=20&offset=${currentOffset}`;

    try {
      const res = await fetch(endpoint);
      const json = await res.json();

      if (json.configured === false) {
        setIsConfigured(false);
        setActiveTab('upload');
        return;
      }

      if (res.ok && json.data) {
        const items = json.data || [];
        setGifs((prev) => (isReset ? items : [...prev, ...items]));
        setHasMore(items.length === 20);
        setOffset(currentOffset + items.length);
      } else {
        setErrorMsg(json.error || 'Failed to load GIFs.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error fetching GIFs.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, debouncedQuery, offset]);

  // Trigger load when tab or debounced query changes
  useEffect(() => {
    if (activeTab === 'trending' || activeTab === 'search') {
      loadGifs(true);
    }
  }, [activeTab, debouncedQuery]);

  // Save selected GIF to recent and invoke onSelect callback
  const handlePickGif = (gif) => {
    try {
      const existing = recentGifs.filter((g) => g.id !== gif.id);
      const updated = [gif, ...existing].slice(0, MAX_RECENT);
      setRecentGifs(updated);
      localStorage.setItem(RECENT_GIFS_KEY, JSON.stringify(updated));
    } catch (_) {}

    if (onSelect) {
      onSelect({
        url: gif.url,
        previewUrl: gif.previewUrl,
        type: 'gif',
        media_type: 'gif',
        media_meta: {
          provider: gif.provider || 'giphy',
          gif_id: gif.id,
          width: gif.width || 300,
          height: gif.height || 200,
          aspect: gif.height > 0 ? Number((gif.width / gif.height).toFixed(3)) : 1,
        },
      });
    }

    if (onClose) onClose();
  };

  // Upload own GIF
  const handleSelectUploadFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
      setUploadError('Please select a valid .gif image file.');
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxBytes) {
      setUploadError('GIF file must be 10MB or smaller.');
      return;
    }

    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) return;
    const userId = session?.user?.id;
    if (!userId) {
      setUploadError('Please sign in to upload custom GIFs to your community storage.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const result = await uploadPostMedia(uploadFile, userId);
      handlePickGif({
        id: `upload-${Date.now()}`,
        title: uploadFile.name,
        url: result.url,
        previewUrl: result.url,
        width: 300,
        height: 300,
        provider: 'upload',
        attribution: 'Uploaded GIF',
      });
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="gif-picker-portal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="GIF Picker">
      <div
        className="gif-picker-modal-panel"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gif-picker-header">
          <div className="gif-picker-title-row">
            <div className="gif-picker-heading">
              <Sparkles size={18} className="text-teal-400" />
              <h3>Choose a GIF</h3>
            </div>
            {onClose && (
              <button
                type="button"
                className="gif-picker-close-btn"
                onClick={onClose}
                aria-label="Close GIF picker"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Search Bar (visible on search or trending tabs) */}
          {isConfigured && (activeTab === 'search' || activeTab === 'trending') && (
            <div className="gif-search-bar-wrap">
              <Search size={16} className="gif-search-icon" />
              <input
                type="text"
                className="gif-search-input"
                placeholder="Search GIFs (e.g. Amen, Worship, Blessings)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'search') setActiveTab('search');
                }}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="gif-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="gif-tabs-row" role="tablist">
            {isConfigured && (
              <>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'trending'}
                  className={`gif-tab-pill ${activeTab === 'trending' ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveTab('trending');
                    setSearchQuery('');
                  }}
                >
                  <TrendingUp size={14} />
                  <span>Trending</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'search'}
                  className={`gif-tab-pill ${activeTab === 'search' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('search')}
                >
                  <Search size={14} />
                  <span>Search</span>
                </button>
              </>
            )}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'recent'}
              className={`gif-tab-pill ${activeTab === 'recent' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              <Clock size={14} />
              <span>Recent</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'upload'}
              className={`gif-tab-pill ${activeTab === 'upload' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} />
              <span>Upload GIF</span>
            </button>
          </div>

          {/* Category Chips (if on search tab) */}
          {isConfigured && activeTab === 'search' && categories.length > 0 && (
            <div className="gif-categories-chips-scroll no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`gif-category-chip ${searchQuery.toLowerCase() === cat.toLowerCase() ? 'is-active' : ''}`}
                  onClick={() => setSearchQuery(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="gif-picker-body">
          {/* Note when GIPHY_API_KEY is not configured */}
          {!isConfigured && activeTab === 'upload' && (
            <div className="gif-unconfigured-banner">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <span>GIPHY API key not set in environment. You can upload custom .gif files directly.</span>
            </div>
          )}

          {/* 1. UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="gif-upload-pane">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif"
                style={{ display: 'none' }}
                onChange={handleSelectUploadFile}
              />

              {!uploadPreview ? (
                <div
                  className="gif-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <FileImage size={40} className="gif-dropzone-icon" />
                  <h4>Choose a GIF file to upload</h4>
                  <p>Supports animated .gif up to 10 MB</p>
                  <button type="button" className="gif-browse-btn">
                    Browse File
                  </button>
                </div>
              ) : (
                <div className="gif-upload-preview-card">
                  <div className="gif-upload-img-wrapper">
                    <img src={uploadPreview} alt="Selected GIF preview" className="gif-upload-img" />
                  </div>
                  <div className="gif-upload-info-row">
                    <span className="truncate">{uploadFile?.name}</span>
                    <span>{Math.round((uploadFile?.size || 0) / 1024)} KB</span>
                  </div>
                  <div className="gif-upload-actions-row">
                    <button
                      type="button"
                      className="gif-btn-secondary"
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview('');
                      }}
                      disabled={isUploading}
                    >
                      Choose Different
                    </button>
                    <button
                      type="button"
                      className="gif-btn-primary"
                      onClick={handleConfirmUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Use This GIF'}
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="gif-error-box">
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* 2. RECENT TAB */}
          {activeTab === 'recent' && (
            <div className="gif-recent-pane">
              {recentGifs.length === 0 ? (
                <div className="gif-empty-box">
                  <Clock size={36} className="text-[var(--ink-muted)] mb-2" />
                  <h4>No recent GIFs</h4>
                  <p>GIFs you pick will appear here for fast access.</p>
                </div>
              ) : (
                <div className="gif-masonry-grid">
                  {recentGifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      className="gif-grid-item"
                      onClick={() => handlePickGif(gif)}
                    >
                      <img
                        src={gif.previewUrl || gif.url}
                        alt={gif.title}
                        loading="lazy"
                        className="gif-grid-img"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. TRENDING & SEARCH MASONRY GRID */}
          {(activeTab === 'trending' || activeTab === 'search') && (
            <>
              {loading && gifs.length === 0 ? (
                <div className="gif-skeleton-grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="gif-skeleton-card" />
                  ))}
                </div>
              ) : errorMsg ? (
                <div className="gif-error-box">
                  <AlertCircle size={20} />
                  <span>{errorMsg}</span>
                  <button type="button" className="gif-retry-btn" onClick={() => loadGifs(true)}>
                    <RotateCcw size={14} /> Retry
                  </button>
                </div>
              ) : gifs.length === 0 ? (
                <div className="gif-empty-box">
                  <Search size={36} className="text-[var(--ink-muted)] mb-2" />
                  <h4>No GIFs found</h4>
                  <p>Try searching for faith words like &quot;Amen&quot;, &quot;Hallelujah&quot;, or &quot;Praise&quot;.</p>
                </div>
              ) : (
                <div className="gif-masonry-grid">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      className="gif-grid-item"
                      onClick={() => handlePickGif(gif)}
                      title={gif.title}
                    >
                      <img
                        src={gif.previewUrl || gif.url}
                        alt={gif.title}
                        loading="lazy"
                        className="gif-grid-img"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && gifs.length > 0 && !loading && (
                <div className="gif-load-more-row">
                  <button
                    type="button"
                    className="gif-load-more-btn"
                    onClick={() => loadGifs(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading more GIFs...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer: Attribution */}
        {isConfigured && (activeTab === 'trending' || activeTab === 'search') && (
          <div className="gif-picker-footer">
            <span className="gif-attribution-text">Powered by GIPHY</span>
          </div>
        )}
      </div>
    </div>
  );
}
