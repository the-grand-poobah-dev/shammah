'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { saveProgress, getProgress, toggleLike as apiToggleLike, toggleSave as apiToggleSave } from './data/mediaApi';
import { saveOfflineItem, removeOfflineItem, isItemSavedOffline } from './offlineSyncManager';

const AudioPlayerContext = createContext(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return ctx;
}

export function AudioPlayerProvider({ children }) {
  const audioRef = useRef(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Queue & Navigation state
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOfflineTrack, setIsOfflineTrack] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null); // null | 15 | 30 | 45 | 60 | 'end'
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(null);
  const sleepTimerRef = useRef(null);

  // Last progress sync timestamp to debounce saves
  const lastSyncTimeRef = useRef(0);

  // Sync offline status and engagement when track changes
  useEffect(() => {
    if (!currentTrack?.id) {
      setIsOfflineTrack(false);
      setIsLiked(false);
      setIsSaved(false);
      return;
    }

    setIsOfflineTrack(isItemSavedOffline(currentTrack.id));
    setIsLiked(Boolean(currentTrack.is_liked));
    setLikeCount(currentTrack.like_count || 0);
    setIsSaved(Boolean(currentTrack.is_saved));

    // Listen for external offline updates
    function handleOfflineUpdated(e) {
      if (e.detail?.id === currentTrack.id) {
        setIsOfflineTrack(isItemSavedOffline(currentTrack.id));
      }
    }

    window.addEventListener('shammah:offline-updated', handleOfflineUpdated);
    return () => {
      window.removeEventListener('shammah:offline-updated', handleOfflineUpdated);
    };
  }, [currentTrack]);

  // Exclusive media playback: pause audio if a video starts playing
  useEffect(() => {
    function handleVideoPlay() {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }

    window.addEventListener('shammah:video-play', handleVideoPlay);
    return () => {
      window.removeEventListener('shammah:video-play', handleVideoPlay);
    };
  }, []);

  // Sleep timer interval
  useEffect(() => {
    if (sleepTimerSecondsLeft === null) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      return;
    }

    if (sleepTimerSecondsLeft <= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      return;
    }

    sleepTimerRef.current = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimerSecondsLeft]);

  // Media Session API Setup
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artistName =
      currentTrack.author?.display_name ||
      currentTrack.speaker ||
      currentTrack.profiles?.display_name ||
      currentTrack.profiles?.name ||
      'Shammah Audio';

    const albumName =
      currentTrack.series?.title ||
      currentTrack.church?.name ||
      currentTrack.category ||
      'Shammah Sanctuary';

    const artworkUrl =
      currentTrack.thumb_url ||
      currentTrack.cover_image ||
      currentTrack.cover_url ||
      'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500';

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Faith Audio',
        artist: artistName,
        album: albumName,
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        resumeTrack();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pauseTrack();
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        skip(-(details.seekOffset || 15));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        skip(details.seekOffset || 30);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('[audioPlayer] MediaSession error:', err);
    }
  }, [currentTrack]);

  // Periodic Progress Sync to watch_progress
  const syncPlaybackProgress = useCallback((pos, dur, force = false) => {
    if (!currentTrack?.id || !dur || dur <= 0) return;
    const now = Date.now();
    if (!force && now - lastSyncTimeRef.current < 10000) return; // debounce 10s

    lastSyncTimeRef.current = now;
    saveProgress(currentTrack.id, pos, dur).catch(() => {});
  }, [currentTrack]);

  // Play a specific track (and optionally supply a new queue list)
  const playTrack = useCallback((track, newQueue = null) => {
    if (!track) return;

    // Notify other components (videos) to pause
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shammah:audio-play', { detail: { id: track.id } }));
    }

    if (newQueue && Array.isArray(newQueue)) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((t) => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    } else {
      setQueue((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === track.id);
        if (existingIdx >= 0) {
          setQueueIndex(existingIdx);
          return prev;
        }
        const updated = [...prev, track];
        setQueueIndex(updated.length - 1);
        return updated;
      });
    }

    setCurrentTrack(track);
    setIsLoading(true);

    if (audioRef.current) {
      const src = track.media_url || track.audio_url;
      if (audioRef.current.src !== src) {
        audioRef.current.src = src;
      }

      // Check if resuming from saved progress
      const resumePos = track.playback_position || track.watch_progress?.position_seconds || 0;
      if (resumePos > 5 && (!track.playback_percent || track.playback_percent < 92)) {
        audioRef.current.currentTime = resumePos;
        setCurrentTime(resumePos);
      } else {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('[audioPlayer] Auto-play prevented or failed:', err);
          setIsLoading(false);
        });
    }
  }, [playbackSpeed]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      syncPlaybackProgress(audioRef.current.currentTime, audioRef.current.duration, true);
    }
  }, [syncPlaybackProgress]);

  const resumeTrack = useCallback(() => {
    if (audioRef.current && currentTrack) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shammah:audio-play', { detail: { id: currentTrack.id } }));
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  }, [isPlaying, pauseTrack, resumeTrack]);

  const seekTo = useCallback((seconds) => {
    if (audioRef.current) {
      const target = Math.max(0, Math.min(seconds, audioRef.current.duration || seconds));
      audioRef.current.currentTime = target;
      setCurrentTime(target);
      syncPlaybackProgress(target, audioRef.current.duration, true);
    }
  }, [syncPlaybackProgress]);

  const skip = useCallback((seconds) => {
    if (audioRef.current) {
      const target = Math.max(0, Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration || 99999));
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all') {
          nextIdx = 0;
        } else {
          // Reached end of queue
          pauseTrack();
          return;
        }
      }
    }

    setQueueIndex(nextIdx);
    const track = queue[nextIdx];
    if (track) {
      playTrack(track, queue);
    }
  }, [queue, queueIndex, isShuffle, repeatMode, pauseTrack, playTrack]);

  const prevTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      // If played more than 3 seconds, jump to start of current track
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === 'all' ? queue.length - 1 : 0;
    }

    setQueueIndex(prevIdx);
    const track = queue[prevIdx];
    if (track) {
      playTrack(track, queue);
    }
  }, [queue, queueIndex, repeatMode, playTrack]);

  const setSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const next = !isMuted;
      audioRef.current.muted = next;
      setIsMuted(next);
    }
  }, [isMuted]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((v) => !v);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((current) => {
      if (current === 'off') return 'all';
      if (current === 'all') return 'one';
      return 'off';
    });
  }, []);

  const setSleepTimer = useCallback((minutes) => {
    setSleepTimerMinutes(minutes);
    if (!minutes) {
      setSleepTimerSecondsLeft(null);
    } else if (minutes === 'end') {
      setSleepTimerSecondsLeft(null); // will stop on track ended
    } else {
      setSleepTimerSecondsLeft(minutes * 60);
    }
  }, []);

  const addToQueue = useCallback((track) => {
    if (!track) return;
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setQueue((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setQueueIndex((curr) => {
      if (index === curr) {
        return Math.max(0, curr - 1);
      }
      if (index < curr) {
        return curr - 1;
      }
      return curr;
    });
  }, []);

  const reorderQueue = useCallback((fromIndex, toIndex) => {
    setQueue((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(currentTrack ? [currentTrack] : []);
    setQueueIndex(0);
  }, [currentTrack]);

  const toggleLikeTrack = useCallback(async () => {
    if (!currentTrack?.id) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    try {
      const res = await apiToggleLike(currentTrack.id);
      if (res.error) {
        // Rollback
        setIsLiked(!nextLiked);
        setLikeCount((c) => (!nextLiked ? c + 1 : Math.max(0, c - 1)));
      } else {
        setIsLiked(res.liked);
        setLikeCount(res.likeCount);
      }
    } catch {
      setIsLiked(!nextLiked);
      setLikeCount((c) => (!nextLiked ? c + 1 : Math.max(0, c - 1)));
    }
  }, [currentTrack, isLiked]);

  const toggleSaveTrack = useCallback(async () => {
    if (!currentTrack?.id) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const res = await apiToggleSave(currentTrack.id);
      if (res.error) {
        setIsSaved(!nextSaved);
      } else {
        setIsSaved(res.saved);
      }
    } catch {
      setIsSaved(!nextSaved);
    }
  }, [currentTrack, isSaved]);

  const toggleOfflineTrack = useCallback(() => {
    if (!currentTrack?.id) return;
    if (isOfflineTrack) {
      removeOfflineItem(currentTrack.id);
      setIsOfflineTrack(false);
    } else {
      const res = saveOfflineItem(currentTrack, 'audio');
      if (res.success) {
        setIsOfflineTrack(true);
      }
    }
  }, [currentTrack, isOfflineTrack]);

  // Audio HTML5 event callbacks
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pos = audioRef.current.currentTime;
    setCurrentTime(pos);
    syncPlaybackProgress(pos, audioRef.current.duration);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || currentTrack?.duration_seconds || 0;
    setDuration(dur);
    setIsLoading(false);
  };

  const handleEnded = () => {
    // If sleep timer was set to 'end', pause and stop
    if (sleepTimerMinutes === 'end') {
      setSleepTimerMinutes(null);
      pauseTrack();
      return;
    }
    nextTrack();
  };

  const contextValue = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    volume,
    isMuted,
    isLoading,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    isExpanded,
    isOfflineTrack,
    isLiked,
    likeCount,
    isSaved,
    sleepTimerMinutes,
    sleepTimerSecondsLeft,
    playTrack,
    pauseTrack,
    resumeTrack,
    togglePlay,
    seekTo,
    skip,
    nextTrack,
    prevTrack,
    setSpeed,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setSleepTimer,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    expandPlayer: () => setIsExpanded(true),
    collapsePlayer: () => setIsExpanded(false),
    toggleLikeTrack,
    toggleSaveTrack,
    toggleOfflineTrack,
    closePlayer: () => {
      pauseTrack();
      setCurrentTrack(null);
      setIsExpanded(false);
    },
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />
    </AudioPlayerContext.Provider>
  );
}
