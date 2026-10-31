'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  TrendingUp,
  Clock,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadPostMedia, getImageSize } from '../../lib/mediaUpload';

const RECENT_GIFS_KEY = 'shammah_recent_gifs_v1';

function getRecentGifs() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_GIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentGif(gif) {
  if (typeof window === 'undefined' || !gif) return;
  try {
    const list = getRecentGifs();
    const filtered = list.filter((g) => g.id !== gif.id && g.url !== gif.url);
    const updated = [gif, ...filtered].slice(0, 30);
    localStorage.setItem(RECENT_GIFS_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * GifPicker component
 *
 * @param {Object} props
 * @param {Function} props.onSelect - Called with { url, media_meta: { provider, id, width, height, title } }
 * @param {Function} props.onClose - Called to close picker
 * @param {string} [props.userId] - Current user id for custom uploads
 */
export default function GifPicker({ onSelect, onClose, userId }) {
  const [activeTab, setActiveTab] = useState('trending'); // 'trending' | 'search' | 'recent' | 'upload'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categories, setCategories] = useState([]);

  // Results state
  const [gifs, setGifs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [missingApiKey, setMissingApiKey] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const scrollContainerRef = useRef(null);
  const uploadInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Debounce search query input (300ms)
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (activeTab !== 'search') setActiveTab('search');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(val.trim());
      setOffset(0);
    }, 300);
  };

  // Fetch Categories once
  useEffect(() => {
    fetch('/api/gifs/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  // Fetch GIFs (Trending or Search)
  const loadGifs = useCallback(async (isLoadMore = false) => {
    if (activeTab === 'recent') {
      setGifs(getRecentGifs());
      setIsLoading(false);
      return;
    }
    if (activeTab === 'upload') {
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    const targetOffset = isLoadMore ? offset + 20 : 0;
    const isSearch = Boolean(debouncedQuery);
    const endpoint = isSearch
      ? `/api/gifs/search?q=${encodeURIComponent(debouncedQuery)}&limit=20&offset=${targetOffset}`
      : `/api/gifs/trending?limit=20&offset=${targetOffset}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.missingKey) {
        setMissingApiKey(true);
        setActiveTab('upload');
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load GIFs.');
      }

      const newResults = data.results || [];
      if (isLoadMore) {
        setGifs((prev) => [...prev, ...newResults]);
        setOffset(targetOffset);
      } else {
        setGifs(newResults);
        setOffset(0);
      }
      setHasMore(data.hasMore || newResults.length >= 20);
    } catch (err) {
      console.warn('Gif fetch error:', err);
      setHasError(true);
      setErrorMessage(err.message || 'Could not load GIFs.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedQuery, offset]);

  // Trigger load when tab or debounced query changes
  useEffect(() => {
    if (activeTab === 'trending' || activeTab === 'search') {
      loadGifs(false);
    } else if (activeTab === 'recent') {
      setGifs(getRecentGifs());
    }
  }, [activeTab, debouncedQuery]);

  // Infinite scroll trigger
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || isLoading || !hasMore || activeTab === 'recent' || activeTab === 'upload') return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
      loadGifs(true);
    }
  };

  // Select a GIF
  const handleSelectGif = (gif) => {
    saveRecentGif(gif);
    if (onSelect) {
      onSelect({
        url: gif.url,
        previewUrl: gif.previewUrl,
        media_type: 'gif',
        media_meta: {
          provider: gif.provider || 'giphy',
          id: gif.id,
          title: gif.title || 'GIF',
          width: gif.width || 300,
          height: gif.height || 200,
          aspect: gif.height > 0 ? Number((gif.width / gif.height).toFixed(3)) : 1,
        },
      });
    }
    if (onClose) onClose();
  };

  // Upload own GIF file
  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
      setUploadError('Only valid .gif animation files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('GIF file size exceeds the 10 MB limit.');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const sizeMeta = await getImageSize(file);
      const res = await uploadPostMedia(file, userId || 'community-member');

      const uploadedGif = {
        id: `uploaded-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: res.url,
        previewUrl: res.url,
        width: sizeMeta.width || 400,
        height: sizeMeta.height || 300,
        provider: 'upload',
        attribution: 'Uploaded GIF',
      };

      handleSelectGif(uploadedGif);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload GIF file.');
    } finally {
      setUploading(false);
    }
  };

  // Portal into document.body
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Esc key listener to close
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 transition-opacity"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">Select a GIF</span>
            {missingApiKey && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                Upload Mode
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
            aria-label="Close GIF picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar (unless in Upload only mode) */}
        {!missingApiKey && (
          <div className="p-3 border-b border-white/10 bg-slate-950/40">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search GIFs on GIPHY..."
                value={searchQuery}
                onChange={handleQueryChange}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-teal-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedQuery('');
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Curated Faith & Emotion Category Chips */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none mt-1">
                {categories.map((cat) => (
                  <button
                    key={cat.query}
                    type="button"
                    onClick={() => {
                      setSearchQuery(cat.name);
                      setDebouncedQuery(cat.query);
                      setActiveTab('search');
                    }}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-teal-500/20 hover:text-teal-300 text-slate-300 border border-white/5 transition"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center justify-around border-b border-white/10 bg-slate-950/70 p-1 text-xs">
          {!missingApiKey && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('trending');
                  setSearchQuery('');
                  setDebouncedQuery('');
                }}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold transition ${
                  activeTab === 'trending' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Trending</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold transition ${
                  activeTab === 'search' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recent')}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold transition ${
                  activeTab === 'recent' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Recent</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl font-bold transition ${
              activeTab === 'upload' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload GIF</span>
          </button>
        </div>

        {/* Body / 2-Column Masonry Feed */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 min-h-[260px] max-h-[50dvh]"
        >
          {/* UPLOAD TAB */}
          {activeTab === 'upload' ? (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-4">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/gif"
                onChange={handleUploadFile}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-lg">
                <ImageIcon className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">Upload Your Own Animated GIF</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {missingApiKey
                    ? 'GIPHY API key is not configured on the server. You can upload any GIF directly from your device!'
                    : 'Choose a .gif file from your computer or phone (up to 10 MB).'}
                </p>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 text-red-300 text-xs border border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 transition shadow-lg disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading GIF...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Browse .GIF Files</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Masonry 2-Column Layout */}
              {gifs.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSelectGif(gif)}
                      className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                      style={{ aspectRatio: `${gif.width || 300}/${gif.height || 200}` }}
                    >
                      <img
                        src={gif.previewUrl || gif.url}
                        alt={gif.title || 'GIF'}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[10px] font-bold text-white truncate drop-shadow">
                          {gif.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center justify-center p-6 text-slate-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  <span>Loading GIFs...</span>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !hasError && gifs.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                  <span>
                    {activeTab === 'recent'
                      ? 'No recently picked GIFs yet.'
                      : 'No GIFs found for this search.'}
                  </span>
                </div>
              )}

              {/* Error State with Retry */}
              {hasError && (
                <div className="text-center py-8 flex flex-col items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => loadGifs(false)}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
                  >
                    Retry
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Powered by GIPHY Attribution */}
        <div className="p-2.5 border-t border-white/10 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span className="font-semibold text-slate-300">
            {activeTab === 'upload' ? 'Upload Local Media' : 'Powered by GIPHY'}
          </span>
          <span className="text-[10px] text-slate-500">Rating: PG</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
