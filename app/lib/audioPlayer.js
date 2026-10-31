'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

let globalAudioElement = null;
let listeners = new Set();
let globalState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
};

function notify() {
  listeners.forEach((fn) => fn({ ...globalState }));
}

function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!globalAudioElement) {
    globalAudioElement = new Audio();
    globalAudioElement.preload = 'metadata';

    globalAudioElement.addEventListener('timeupdate', () => {
      globalState.progress = globalAudioElement.currentTime;
      globalState.duration = globalAudioElement.duration || 0;
      notify();
    });

    globalAudioElement.addEventListener('play', () => {
      globalState.isPlaying = true;
      // Pause all video elements across the app
      document.querySelectorAll('video').forEach((v) => {
        try {
          if (!v.paused) v.pause();
        } catch (_) {}
      });
      window.dispatchEvent(new CustomEvent('shammah:audio-play'));
      notify();
    });

    globalAudioElement.addEventListener('pause', () => {
      globalState.isPlaying = false;
      notify();
    });

    globalAudioElement.addEventListener('ended', () => {
      globalState.isPlaying = false;
      globalState.progress = 0;
      notify();
    });
  }
  return globalAudioElement;
}

export function useAudioPlayer() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  const playTrack = useCallback((track) => {
    const audio = getAudio();
    if (!audio || !track) return;

    if (globalState.currentTrack?.id === track.id) {
      if (globalState.isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
      return;
    }

    globalState.currentTrack = track;
    globalState.progress = 0;
    audio.src = track.media_url || track.audio_url || track.url;
    audio.play().catch(() => {});
    notify();
  }, []);

  const pauseTrack = useCallback(() => {
    const audio = getAudio();
    if (audio) audio.pause();
  }, []);

  const resumeTrack = useCallback(() => {
    const audio = getAudio();
    if (audio) audio.play().catch(() => {});
  }, []);

  const seek = useCallback((time) => {
    const audio = getAudio();
    if (audio) {
      audio.currentTime = time;
    }
  }, []);

  return {
    ...state,
    playTrack,
    pauseTrack,
    resumeTrack,
    seek,
  };
}

export default useAudioPlayer;
