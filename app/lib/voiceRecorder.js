// Client-side helper for in-browser microphone voice note recording
// Works seamlessly with MediaRecorder API on desktop and mobile browsers (iOS Safari, Android Chrome, desktop),
// returning a standard File/Blob ready for uploadPostMedia.
// Note: Microphone access requires a secure context (HTTPS) or localhost.

export function isAudioRecordingSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    navigator?.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

/**
 * Starts recording audio from the user's microphone.
 *
 * @param {Object} options
 * @param {Function} [options.onTimeTick] - Called every second with current seconds recorded
 * @param {Function} [options.onLevel] - Called with live normalized audio level (0.0 to 1.0) for waveform
 * @param {number} [options.maxSeconds=60] - Max duration allowed before auto-stopping (e.g. 60 for comments, 300 for posts)
 * @returns {Promise<{
 *   stop: () => Promise<{ file: File, duration: number, previewUrl: string }>,
 *   cancel: () => void,
 *   pause: () => void,
 *   resume: () => void,
 *   isPaused: () => boolean
 * }>}
 */
export async function startAudioRecording({ onTimeTick, onLevel, maxSeconds = 60 } = {}) {
  if (!isAudioRecordingSupported()) {
    throw new Error('Microphone audio recording is not supported in this browser.');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission was denied. Please allow microphone access in your browser settings to record voice notes.');
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('No microphone device found on your system.');
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      throw new Error('Microphone is in use by another application.');
    }
    throw new Error(err.message || 'Could not access your microphone.');
  }

  // AudioContext & AnalyserNode for live input level callback
  let audioCtx = null;
  let analyser = null;
  let animFrameId = null;
  let sourceNode = null;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && onLevel) {
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const pollLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (dataArray.length || 1);
        const normalized = Math.min(1, Math.max(0, avg / 128));
        try {
          onLevel(normalized);
        } catch {}
        animFrameId = requestAnimationFrame(pollLevel);
      };
      animFrameId = requestAnimationFrame(pollLevel);
    }
  } catch (audioCtxErr) {
    console.warn('AudioContext level meter disabled:', audioCtxErr?.message);
  }

  // Determine best supported MIME type
  // MIME negotiation: audio/webm;codecs=opus -> audio/mp4 (Safari) -> fallbacks
  let mimeType = '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];

  for (const candidate of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidate)) {
      mimeType = candidate;
      break;
    }
  }

  let recorder;
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch {
    recorder = new MediaRecorder(stream);
  }

  const chunks = [];
  let seconds = 0;
  let timerId = null;
  let hasStopped = false;
  let isPausedState = false;

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const cleanupAudioContextAndTracks = () => {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch {}
      sourceNode = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.close(); } catch {}
      audioCtx = null;
    }
    stream.getTracks().forEach((track) => {
      try { track.stop(); } catch {}
    });
  };

  return new Promise((resolveStart, rejectStart) => {
    recorder.onstart = () => {
      timerId = setInterval(() => {
        if (!isPausedState) {
          seconds += 1;
          if (onTimeTick) {
            try {
              onTimeTick(seconds);
            } catch {}
          }
          if (seconds >= maxSeconds) {
            stopRecording();
          }
        }
      }, 1000);

      resolveStart({
        stop: stopRecording,
        cancel: cancelRecording,
        pause: pauseRecording,
        resume: resumeRecording,
        isPaused: () => isPausedState,
      });
    };

    recorder.onerror = (e) => {
      clearInterval(timerId);
      cleanupAudioContextAndTracks();
      rejectStart(e);
    };

    function pauseRecording() {
      if (recorder.state === 'recording') {
        try {
          recorder.pause();
          isPausedState = true;
          if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend().catch(() => {});
          }
        } catch (err) {
          console.warn('Failed to pause recording:', err);
        }
      }
    }

    function resumeRecording() {
      if (recorder.state === 'paused') {
        try {
          recorder.resume();
          isPausedState = false;
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
        } catch (err) {
          console.warn('Failed to resume recording:', err);
        }
      }
    }

    function stopRecording() {
      return new Promise((resolveStop) => {
        if (hasStopped) return;
        hasStopped = true;
        clearInterval(timerId);

        recorder.onstop = () => {
          cleanupAudioContextAndTracks();

          const cleanMime = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
          const ext = cleanMime.includes('mp4') || cleanMime.includes('aac')
            ? 'm4a'
            : cleanMime.includes('ogg')
            ? 'ogg'
            : 'webm';

          const blob = new Blob(chunks, { type: cleanMime });
          const fileName = `voicenote_${Date.now()}.${ext}`;
          const file = new File([blob], fileName, { type: cleanMime });
          const previewUrl = URL.createObjectURL(blob);

          resolveStop({
            file,
            duration: seconds,
            previewUrl,
          });
        };

        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            cleanupAudioContextAndTracks();
          }
        } else {
          cleanupAudioContextAndTracks();
        }
      });
    }

    function cancelRecording() {
      if (hasStopped) return;
      hasStopped = true;
      clearInterval(timerId);
      cleanupAudioContextAndTracks();
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {}
      }
    }

    try {
      recorder.start(250); // 250ms time slice for streaming data chunks
    } catch (startErr) {
      clearInterval(timerId);
      cleanupAudioContextAndTracks();
      rejectStart(startErr);
    }
  });
}
