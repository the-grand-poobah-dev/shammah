'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Search,
  Plus,
  Sparkles,
  Music,
  Mic,
  Disc,
  Clock,
  Download,
  Share2,
  Bookmark,
  Heart,
  Check,
  FolderPlus,
  Compass,
  ArrowRight,
  Sliders,
  X,
  Volume2,
} from 'lucide-react';
import { useAudioPlayer } from '../lib/audioPlayer';
import {
  listMedia,
  listSeries,
  listContinueWatching,
  listPlaylists,
  createPlaylist,
  toggleLike,
  toggleSave,
} from '../lib/data/mediaApi';
import { saveOfflineItem, removeOfflineItem, isItemSavedOffline } from '../lib/offlineSyncManager';
import { formatPostDate, useRelativeTimeTick } from '../lib/postDisplay';
import { playSound } from '../lib/soundEffects';

import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MemberBadge from './MemberBadge';
import MediaUploadModal from './MediaUploadModal';
import SeriesEpisodesModal from './SeriesEpisodesModal';
import PlaylistDetailModal from './PlaylistDetailModal';

import {
  ContentLayout,
  AccentCard,
  SectionBlock,
  LayoutSwitcher,
  MediaThumb,
  MetaChips,
  ProgressBar,
  FilterChips,
  SortMenu,
  SkeletonLayout,
  EmptyState,
  ErrorState,
  InfiniteSentinel,
  accentFor,
} from './layoutkit';

// Compatibility export in case external components import SAMPLE_AUDIO_TRACKS
export const SAMPLE_AUDIO_TRACKS = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    title: 'Finding Peace in the Secret Place (Psalm 23)',
    speaker: 'Pastor David Mwangi',
    church: 'Shammah Assembly of Saints',
    type: 'podcast',
    category_id: 'lessons',
    duration_label: '15:00',
    duration_seconds: 900,
    audio_url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg',
    cover_image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500',
    description: 'Morning devotion on Psalm 23. Starting your day conscious of the Shepherd who leads beside still waters.',
  },
];

const AUDIO_CATEGORIES = [
  { id: 'All', label: 'All Audio' },
  { id: 'Sermon', label: 'Sermons' },
  { id: 'Worship', label: 'Worship & Praise' },
  { id: 'Prayer', label: 'Prayer & Devotionals' },
  { id: 'Youth', label: 'Youth & Young Adults' },
  { id: 'Theology', label: 'Bible Study & Theology' },
  { id: 'Leadership', label: 'Leadership & Marketplace' },
  { id: 'Family', label: 'Family & Parenting' },
];

const SORT_OPTIONS = [
  { id: 'recent', label: 'Newest' },
  { id: 'views', label: 'Most Played' },
  { id: 'likes', label: 'Most Liked' },
  { id: 'duration', label: 'Duration' },
];

function formatDuration(sec) {
  if (!sec || isNaN(sec) || sec <= 0) return '0 min';
  const mins = Math.floor(sec / 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }
  return `${mins} min`;
}

export default function AudioView({ session, currentUser, openAuth }) {
  const now = useRelativeTimeTick();
  const { playTrack, currentTrack, isPlaying, pauseTrack, resumeTrack } = useAudioPlayer();

  // Toolbar & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('recent');
  const [activeLayout, setActiveLayout] = useState('list-rich');

  // Multi-block data states
  const [continueListening, setContinueListening] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [worshipTracks, setWorshipTracks] = useState([]);
  const [devotionals, setDevotionals] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);

  // Pagination & Loading states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [hasMoreCatalog, setHasMoreCatalog] = useState(true);
  const [catalogOffset, setCatalogOffset] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const debounceTimerRef = useRef(null);

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  }

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 320);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Initial load of multi-block content
  const loadInitialBlocks = useCallback(async () => {
    setLoadingInitial(true);
    setErrorMsg('');

    try {
      const [
        continueRes,
        sermonsRes,
        seriesRes,
        worshipRes,
        prayerRes,
        playlistsRes,
      ] = await Promise.all([
        listContinueWatching({ kind: 'audio', limit: 4 }),
        listMedia({ kind: 'audio', category: 'Sermon', limit: 6, sort: 'recent' }),
        listSeries({ kind: 'audio', limit: 8 }),
        listMedia({ kind: 'audio', category: 'Worship', limit: 6, sort: 'views' }),
        listMedia({ kind: 'audio', category: 'Prayer', limit: 6, sort: 'recent' }),
        listPlaylists({ kind: 'audio' }),
      ]);

      setContinueListening(continueRes.data || []);
      setSermons(sermonsRes.data || []);
      setSeriesList(seriesRes.data || []);
      setWorshipTracks(worshipRes.data || []);
      setDevotionals(prayerRes.data || []);
      setPlaylists(playlistsRes.data || []);
    } catch (err) {
      console.warn('[AudioView] loadInitialBlocks error:', err);
      setErrorMsg('Failed to load audio sections. Please check your connection and retry.');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadInitialBlocks();
  }, [loadInitialBlocks]);

  // Load catalog items based on category, search, and sort
  const fetchCatalog = useCallback(async (reset = false) => {
    const offset = reset ? 0 : catalogOffset;
    if (reset) {
      setCatalogOffset(0);
      setHasMoreCatalog(true);
    }

    setLoadingCatalog(true);
    try {
      const res = await listMedia({
        kind: 'audio',
        category: activeCategory !== 'All' ? activeCategory : null,
        query: debouncedQuery || null,
        sort: activeSort,
        limit: 12,
        offset,
      });

      const newItems = res.data || [];
      if (reset) {
        setCatalogItems(newItems);
      } else {
        setCatalogItems((prev) => [...prev, ...newItems]);
      }

      setCatalogOffset(offset + newItems.length);
      setHasMoreCatalog(newItems.length >= 12);
    } catch (err) {
      console.warn('[AudioView] fetchCatalog error:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [activeCategory, debouncedQuery, activeSort, catalogOffset]);

  // Trigger catalog fetch on filter change
  useEffect(() => {
    fetchCatalog(true);
  }, [activeCategory, debouncedQuery, activeSort]);

  // Track playback trigger
  function handlePlay(track, contextQueue = null) {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
      return;
    }
    playSound('play');
    playTrack(track, contextQueue || catalogItems);
  }

  // Create Playlist Handler
  async function handleCreatePlaylist(e) {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    if (!session?.user?.id) {
      openAuth?.('signin');
      return;
    }

    const res = await createPlaylist({
      title: newPlaylistTitle.trim(),
      description: newPlaylistDesc.trim(),
      kind: 'audio',
      isPublic: true,
    });

    if (res.data) {
      setPlaylists((prev) => [res.data, ...prev]);
      setNewPlaylistTitle('');
      setNewPlaylistDesc('');
      setIsCreatePlaylistOpen(false);
      triggerToast('Audio playlist created successfully!');
    } else {
      triggerToast('Failed to create playlist');
    }
  }

  // Check if filtering/searching is active
  const isFilteringActive = activeCategory !== 'All' || Boolean(debouncedQuery);

  return (
    <div className="section-feed-view audio-view-container shammah-layout-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="video-toast-banner" role="status">
          {toastMessage}
        </div>
      )}

      {/* Top Header Banner */}
      <div className="audio-header-banner">
        <div>
          <h1 className="audio-header-title">Audio Sanctuary</h1>
          <p className="audio-header-sub">
            Expository sermons, spontaneous worship, podcasts, and daily Scripture devotionals
          </p>
        </div>

        <div className="audio-header-actions">
          <button
            type="button"
            className="audio-cta-btn secondary"
            onClick={() => {
              if (!session) return openAuth?.('signin');
              setIsCreatePlaylistOpen(true);
            }}
            title="Create a new audio playlist"
          >
            <FolderPlus size={15} />
            <span>New Playlist</span>
          </button>

          <button
            type="button"
            className="audio-cta-btn primary"
            onClick={() => {
              if (!session) return openAuth?.('signin');
              setIsUploadOpen(true);
            }}
            title="Upload audio sermon, song or podcast"
          >
            <Plus size={16} />
            <span>Upload Audio</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sort, and Layout Switcher */}
      <div className="audio-view-toolbar" style={{ marginTop: '16px' }}>
        <div className="audio-search-row">
          <div className="audio-search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              className="audio-search-input"
              placeholder="Search sermons, pastors, worship songs, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <SortMenu
            options={SORT_OPTIONS}
            value={activeSort}
            onChange={setActiveSort}
          />

          <LayoutSwitcher
            layouts={['list-rich', 'compact', 'tiles', 'magazine-flat']}
            activeLayout={activeLayout}
            onChange={setActiveLayout}
          />
        </div>

        <FilterChips
          chips={AUDIO_CATEGORIES}
          activeId={activeCategory}
          onChange={setActiveCategory}
        />
      </div>

      {/* Error State */}
      {errorMsg && (
        <ErrorState
          message={errorMsg}
          onRetry={loadInitialBlocks}
        />
      )}

      {/* Loading Skeleton */}
      {loadingInitial && (
        <div style={{ marginTop: '24px' }}>
          <SkeletonLayout layout="magazine-flat" count={3} />
        </div>
      )}

      {/* CURATED BLOCKS (Shown when not filtering/searching) */}
      {!loadingInitial && !isFilteringActive && (
        <>
          {/* BLOCK 1: CONTINUE LISTENING / SPOTLIGHT */}
          {continueListening.length > 0 && (
            <SectionBlock
              title="Continue Listening"
              subtitle="Pick up where you left off in your study and devotion"
              icon={Clock}
              accent="#8b5cf6"
              count={continueListening.length}
            >
              <ContentLayout
                layout="spotlight"
                items={continueListening.slice(0, 1)}
                renderItem={(item) => {
                  const isCurrent = currentTrack?.id === item.id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  const durLabel = formatDuration(item.duration_seconds);
                  const posSec = item.playback_position || 0;
                  const durSec = item.playback_duration || item.duration_seconds || 1;
                  const percent = Math.min(100, Math.round((posSec / durSec) * 100));

                  return (
                    <AccentCard
                      accent="#8b5cf6"
                      variant="wash"
                      className="audio-spotlight-card"
                      onClick={() => handlePlay(item, continueListening)}
                    >
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '16px', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            position: 'relative',
                            flexShrink: 0,
                            backgroundImage: `url(${item.thumb_url || item.cover_image || 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500'})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            border: '1.5px solid rgba(139, 92, 246, 0.4)',
                          }}
                        >
                          <button
                            type="button"
                            className="audio-play-fab"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              margin: 'auto',
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              border: 'none',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.6)',
                            }}
                            title={isCurrentPlaying ? 'Pause' : 'Resume'}
                            aria-label={isCurrentPlaying ? 'Pause' : 'Resume'}
                          >
                            {isCurrentPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" style={{ marginLeft: '3px' }} />}
                          </button>
                        </div>

                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: '#8b5cf6',
                            }}
                          >
                            Resume Listening · {percent}% Complete
                          </span>

                          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 6px', color: 'var(--ink)' }}>
                            {item.title}
                          </h3>

                          <p
                            style={{
                              fontSize: '12px',
                              color: 'var(--ink-muted)',
                              margin: '0 0 10px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.description}
                          </p>

                          <div style={{ width: '100%', maxWidth: '340px', marginBottom: '8px' }}>
                            <ProgressBar value={percent} max={100} accent="#8b5cf6" showLabel={false} height="5px" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                              <span>{formatDuration(posSec)} played</span>
                              <span>{durLabel} total</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccentCard>
                  );
                }}
              />
            </SectionBlock>
          )}

          {/* BLOCK 2: SERMON PODCASTS (magazine-flat) */}
          {sermons.length > 0 && (
            <SectionBlock
              title="Expository Sermons"
              subtitle="Grounded verse-by-verse teachings from respected pastors and elders"
              icon={Headphones}
              accent="#06b6d4"
              count={sermons.length}
            >
              <ContentLayout
                layout="magazine-flat"
                items={sermons}
                renderItem={(track, idx, { isHero }) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  const authorName = track.author?.display_name || track.speaker || 'Pastor';
                  const cover = track.thumb_url || track.cover_image || 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=500';

                  return (
                    <AccentCard
                      key={track.id}
                      accent="#06b6d4"
                      variant="wash"
                      onClick={() => handlePlay(track, sermons)}
                      className={`audio-sermon-card${isCurrent ? ' active-playing' : ''}`}
                    >
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                          <div
                            style={{
                              width: isHero ? '90px' : '72px',
                              height: isHero ? '90px' : '72px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              backgroundImage: `url(${cover})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              position: 'relative',
                              border: '1.5px solid rgba(6, 182, 212, 0.4)',
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                position: 'absolute',
                                inset: 0,
                                margin: 'auto',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'rgba(6, 182, 212, 0.9)',
                                border: 'none',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={isCurrentPlaying ? 'Pause' : 'Play sermon'}
                            >
                              {isCurrentPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" style={{ marginLeft: '2px' }} />}
                            </button>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#06b6d4' }}>
                                Sermon
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                                · {formatDuration(track.duration_seconds)}
                              </span>
                            </div>

                            <h4
                              style={{
                                fontSize: isHero ? '16px' : '14px',
                                fontWeight: 700,
                                margin: '0 0 6px',
                                color: isCurrent ? '#06b6d4' : 'var(--ink)',
                                lineHeight: 1.3,
                              }}
                            >
                              {track.title}
                            </h4>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Avatar name={authorName} src={track.author?.avatar_url} className="avatar-xs" />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                                {authorName}
                              </span>
                              {track.author?.badge && <MemberBadge badgeId={track.author.badge} size="sm" />}
                              {track.author?.badge_verified && <VerifiedBadge badge={track.author.badge} size={12} />}
                            </div>
                          </div>
                        </div>

                        {track.description && isHero && (
                          <p
                            style={{
                              fontSize: '12.5px',
                              color: 'var(--ink-muted)',
                              margin: '12px 0 0',
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {track.description}
                          </p>
                        )}
                      </div>
                    </AccentCard>
                  );
                }}
              />
            </SectionBlock>
          )}

          {/* BLOCK 3: PODCAST SERIES (rail) */}
          {seriesList.length > 0 && (
            <SectionBlock
              title="Podcast Series"
              subtitle="Episodic audio journeys tackling discipleship, theology and culture"
              icon={Sparkles}
              accent="#8b5cf6"
              count={seriesList.length}
            >
              <ContentLayout
                layout="rail"
                items={seriesList}
                railCardWidth="210px"
                renderItem={(series) => {
                  const cover = series.cover_url || 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500';
                  const episodeCount = series.episodes?.[0]?.count || 0;

                  return (
                    <AccentCard
                      key={series.id}
                      accent="#8b5cf6"
                      variant="minimal"
                      onClick={() => setSelectedSeries(series)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '1/1',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            backgroundImage: `url(${cover})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              left: '8px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              background: 'rgba(0,0,0,0.7)',
                              backdropFilter: 'blur(4px)',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {episodeCount} Episodes
                          </span>
                        </div>

                        <div>
                          <h4
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              margin: '0 0 4px',
                              color: 'var(--ink)',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {series.title}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            {series.owner?.display_name || 'Community Series'}
                          </span>
                        </div>
                      </div>
                    </AccentCard>
                  );
                }}
              />
            </SectionBlock>
          )}

          {/* BLOCK 4: WORSHIP & PRAISE (magazine-x2) */}
          {worshipTracks.length > 0 && (
            <SectionBlock
              title="Worship &amp; Spontaneous Praise"
              subtitle="Anointed live praise, acoustic devotionals, and soaking instrumentals"
              icon={Music}
              accent="#ec4899"
              count={worshipTracks.length}
            >
              <ContentLayout
                layout="magazine-x2"
                items={worshipTracks}
                renderItem={(track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  const artist = track.author?.display_name || track.speaker || 'Worship Team';
                  const cover = track.thumb_url || track.cover_image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';

                  return (
                    <AccentCard
                      key={track.id}
                      accent="#ec4899"
                      variant="wash"
                      onClick={() => handlePlay(track, worshipTracks)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            backgroundImage: `url(${cover})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)',
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              margin: 'auto',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#ec4899',
                              border: 'none',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={isCurrentPlaying ? 'Pause' : 'Play worship song'}
                          >
                            {isCurrentPlaying ? <Pause size={14} fill="#fff" /> : <Play size={14} fill="#fff" style={{ marginLeft: '2px' }} />}
                          </button>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#ec4899' }}>
                            Worship Song
                          </span>
                          <h4
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              margin: '2px 0 4px',
                              color: isCurrent ? '#ec4899' : 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {track.title}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            {artist} · {formatDuration(track.duration_seconds)}
                          </span>
                        </div>
                      </div>
                    </AccentCard>
                  );
                }}
              />
            </SectionBlock>
          )}

          {/* BLOCK 5: DAILY DEVOTIONALS (list-rich) */}
          {devotionals.length > 0 && (
            <SectionBlock
              title="Daily Devotionals &amp; Voice Prayers"
              subtitle="Short morning declarations, bedtime intercessions, and faith exhortations"
              icon={Mic}
              accent="#10b981"
              count={devotionals.length}
            >
              <ContentLayout
                layout="list-rich"
                items={devotionals}
                renderItem={(track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  const speaker = track.author?.display_name || track.speaker || 'Member';

                  return (
                    <AccentCard
                      key={track.id}
                      accent="#10b981"
                      variant="minimal"
                      onClick={() => handlePlay(track, devotionals)}
                      style={{ cursor: 'pointer', padding: '12px 16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                          type="button"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isCurrent ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                            border: 'none',
                            color: isCurrent ? '#fff' : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          title={isCurrentPlaying ? 'Pause' : 'Play voice note'}
                        >
                          {isCurrentPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              margin: '0 0 4px',
                              color: isCurrent ? '#10b981' : 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {track.title}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                            <span>{speaker}</span>
                            <span>·</span>
                            <span>{formatDuration(track.duration_seconds)}</span>
                            {track.created_at && (
                              <>
                                <span>·</span>
                                <span>{formatPostDate(track.created_at, now)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {isItemSavedOffline(track.id) && (
                          <span title="Available offline" style={{ display: 'flex', alignItems: 'center', color: '#10b981' }}>
                            <Check size={16} />
                          </span>
                        )}
                      </div>
                    </AccentCard>
                  );
                }}
              />
            </SectionBlock>
          )}

          {/* BLOCK 6: COMMUNITY PLAYLISTS (rail) */}
          {playlists.length > 0 && (
            <SectionBlock
              title="Curated Audio Playlists"
              subtitle="Continuous prayer atmospheres and thematic sermon anthologies"
              icon={Disc}
              accent="#f59e0b"
              count={playlists.length}
            >
              <ContentLayout
                layout="rail"
                items={playlists}
                railCardWidth="220px"
                renderItem={(pl) => {
                  const cover = pl.cover_url || pl.cover || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500';
                  const trackCount = pl.items?.[0]?.count || pl.trackCount || 0;

                  return (
                    <AccentCard
                      key={pl.id}
                      accent="#f59e0b"
                      variant="wash"
                      onClick={() => setSelectedPlaylist(pl)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            backgroundImage: `url(${cover})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '6px',
                              left: '6px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: 'rgba(0,0,0,0.7)',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            <Headphones size={11} style={{ display: 'inline', marginRight: '4px' }} />
                            {trackCount} Tracks
                          </span>
                        </div>

                        <div>
                          <h4
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              margin: '0 0 3px',
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {pl.title}
                          </h4>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                            {pl.owner?.display_name || pl.curator || 'Community Curator'}
                          </span>
                        </div>
                      </div>
                    </AccentCard>
                  );
                }}
              />
            </SectionBlock>
          )}
        </>
      )}

      {/* ALL AUDIO CATALOG / SEARCH RESULTS */}
      <SectionBlock
        title={
          debouncedQuery
            ? `Search Results for "${debouncedQuery}"`
            : activeCategory !== 'All'
              ? `${activeCategory} Audio`
              : 'Browse Audio Library'
        }
        subtitle={
          debouncedQuery
            ? `Found ${catalogItems.length} matching audio messages`
            : 'Explore all published audio messages, worship recordings and teachings'
        }
        icon={Headphones}
        accent="#0d766e"
        count={catalogItems.length}
      >
        {catalogItems.length === 0 && !loadingCatalog ? (
          <EmptyState
            icon={Headphones}
            title="No audio found"
            message={
              debouncedQuery
                ? `No audio matching "${debouncedQuery}". Try a different keyword or category.`
                : 'No audio messages published yet in this category.'
            }
            actionLabel="Reset Filters"
            onAction={() => {
              setActiveCategory('All');
              setSearchQuery('');
            }}
          />
        ) : (
          <ContentLayout
            layout={activeLayout}
            items={catalogItems}
            renderItem={(track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isCurrentPlaying = isCurrent && isPlaying;
              const authorName = track.author?.display_name || track.speaker || 'Member';
              const cover = track.thumb_url || track.cover_image || 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500';
              const itemAccent = track.accent || accentFor(track.category || track.title);

              return (
                <AccentCard
                  key={track.id}
                  accent={itemAccent}
                  variant="wash"
                  onClick={() => handlePlay(track, catalogItems)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ padding: '14px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundImage: `url(${cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        border: `1.5px solid ${itemAccent}55`,
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          margin: 'auto',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: itemAccent,
                          border: 'none',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={isCurrentPlaying ? 'Pause' : 'Play audio'}
                      >
                        {isCurrentPlaying ? <Pause size={14} fill="#fff" /> : <Play size={14} fill="#fff" style={{ marginLeft: '2px' }} />}
                      </button>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: itemAccent }}>
                          {track.category || 'Audio'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                          · {formatDuration(track.duration_seconds)}
                        </span>
                      </div>

                      <h4
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          margin: '0 0 4px',
                          color: isCurrent ? itemAccent : 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {track.title}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Avatar name={authorName} src={track.author?.avatar_url} className="avatar-xs" />
                        <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                          {authorName}
                        </span>
                        {track.author?.badge && <MemberBadge badgeId={track.author.badge} size="sm" />}
                        {track.author?.badge_verified && <VerifiedBadge badge={track.author.badge} size={12} />}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isItemSavedOffline(track.id) && (
                        <Check size={16} color="#10b981" title="Saved for offline listening" />
                      )}
                    </div>
                  </div>
                </AccentCard>
              );
            }}
          />
        )}

        {/* Infinite Sentinel */}
        {hasMoreCatalog && (
          <InfiniteSentinel
            onIntersect={() => fetchCatalog(false)}
            loading={loadingCatalog}
          />
        )}
      </SectionBlock>

      {/* SERIES EPISODES MODAL */}
      {selectedSeries && (
        <SeriesEpisodesModal
          series={selectedSeries}
          isOpen={Boolean(selectedSeries)}
          onClose={() => setSelectedSeries(null)}
        />
      )}

      {/* PLAYLIST DETAIL MODAL */}
      {selectedPlaylist && (
        <PlaylistDetailModal
          playlist={selectedPlaylist}
          isOpen={Boolean(selectedPlaylist)}
          onClose={() => setSelectedPlaylist(null)}
          currentUserId={session?.user?.id}
        />
      )}

      {/* MEDIA UPLOAD MODAL */}
      {isUploadOpen && (
        <MediaUploadModal
          isOpen={isUploadOpen}
          defaultKind="audio"
          onClose={() => setIsUploadOpen(false)}
          sessionUser={session?.user}
          onSuccess={(newMedia) => {
            setIsUploadOpen(false);
            triggerToast('Audio message uploaded successfully!');
            loadInitialBlocks();
            fetchCatalog(true);
          }}
        />
      )}

      {/* CREATE PLAYLIST MODAL */}
      {isCreatePlaylistOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreatePlaylistOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--surface, #121814)',
              borderRadius: '20px',
              padding: '24px',
              border: '1.5px solid var(--border, rgba(255,255,255,0.12))',
              color: 'var(--ink, #fff)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Create Audio Playlist</h3>
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink-muted)' }}>
                  Playlist Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight Intercessions & Warfare"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    background: 'var(--surface-muted, rgba(255,255,255,0.05))',
                    color: 'var(--ink, #fff)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink-muted)' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this collection about?"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    background: 'var(--surface-muted, rgba(255,255,255,0.05))',
                    color: 'var(--ink, #fff)',
                    fontSize: '13px',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreatePlaylistOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistTitle.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    background: 'var(--teal, #0d766e)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px',
                    opacity: !newPlaylistTitle.trim() ? 0.5 : 1,
                  }}
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
