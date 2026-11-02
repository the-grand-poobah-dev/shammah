// Client-side helper for in-browser microphone voice-note recording.
// Returns a File and a preview URL; callers own and must revoke previewUrl.

export function isAudioRecordingSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(navigator?.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined');
}

function chooseAudioMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/aac',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ].find((candidate) => MediaRecorder.isTypeSupported?.(candidate)) || '';
}

export async function startAudioRecording({ onTimeTick, maxSeconds = 60, onLevel } = {}) {
  if (!isAudioRecordingSupported()) throw new Error('Microphone audio recording is not supported in this browser.');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission was denied. Please allow microphone access to record voice notes.');
    }
    throw new Error(err.message || 'Could not access your microphone.');
  }

  const mimeType = chooseAudioMime();
  let recorder;
  try { recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream); }
  catch { recorder = new MediaRecorder(stream); }

  const chunks = [];
  let seconds = 0;
  let timerId = null;
  let levelFrame = null;
  let audioContext = null;
  let analyser = null;
  let levelData = null;
  let hasStopped = false;
  let stopPromise = null;
  let cancelled = false;

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
  function stopLevelMeter() {
    if (levelFrame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(levelFrame);
    levelFrame = null;
  }
  function stopAudioContext() {
    stopLevelMeter();
    if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
    audioContext = null;
    analyser = null;
    levelData = null;
  }
  function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
      seconds += 1;
      try { onTimeTick?.(seconds); } catch {}
      if (seconds >= maxSeconds) stopRecording();
    }, 1000);
  }
  function startLevelMeter() {
    if (!onLevel || !analyser || levelFrame !== null || typeof requestAnimationFrame !== 'function') return;
    const sample = () => {
      if (!analyser || recorder.state !== 'recording') { levelFrame = null; return; }
      analyser.getByteTimeDomainData(levelData);
      let sum = 0;
      for (let i = 0; i < levelData.length; i++) {
        const value = (levelData[i] - 128) / 128;
        sum += value * value;
      }
      try { onLevel(Math.min(1, Math.sqrt(sum / levelData.length) * 3.5)); } catch {}
      levelFrame = requestAnimationFrame(sample);
    };
    levelFrame = requestAnimationFrame(sample);
  }

  if (onLevel) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        levelData = new Uint8Array(analyser.fftSize);
        audioContext.createMediaStreamSource(stream).connect(analyser);
        audioContext.resume?.().catch(() => {});
      }
    } catch {
      stopAudioContext();
    }
  }

  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };

  function stopRecording() {
    if (hasStopped) return stopPromise || Promise.resolve(null);
    hasStopped = true;
    stopTimer();
    stopAudioContext();
    stopPromise = new Promise((resolveStop) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelled) { resolveStop(null); return; }
        const cleanMime = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
        const ext = cleanMime.includes('mp4') || cleanMime.includes('aac') ? 'm4a' : cleanMime.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunks, { type: cleanMime });
        const file = new File([blob], 'voicenote_' + Date.now() + '.' + ext, { type: cleanMime });
        resolveStop({ file, duration: seconds, previewUrl: URL.createObjectURL(blob) });
      };
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { stream.getTracks().forEach((track) => track.stop()); resolveStop(null); }
      } else {
        stream.getTracks().forEach((track) => track.stop());
        resolveStop(null);
      }
    });
    return stopPromise;
  }

  function pauseRecording() {
    if (hasStopped || recorder.state !== 'recording') return;
    try { recorder.pause(); } catch { return; }
    stopTimer();
    stopAudioContext();
    try { onLevel?.(0); } catch {}
  }

  function resumeRecording() {
    if (hasStopped || recorder.state !== 'paused') return;
    try { recorder.resume(); } catch { return; }
    startTimer();
    if (onLevel) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          levelData = new Uint8Array(analyser.fftSize);
          audioContext.createMediaStreamSource(stream).connect(analyser);
          audioContext.resume?.().catch(() => {});
          startLevelMeter();
        }
      } catch { stopAudioContext(); }
    }
  }

  function cancelRecording() {
    if (hasStopped) return;
    cancelled = true;
    hasStopped = true;
    stopTimer();
    stopAudioContext();
    stream.getTracks().forEach((track) => track.stop());
    if (recorder.state !== 'inactive') {
      recorder.onstop = null;
      try { recorder.stop(); } catch {}
    }
  }

  return new Promise((resolveStart, rejectStart) => {
    recorder.onstart = () => {
      startTimer();
      startLevelMeter();
      resolveStart({ pause: pauseRecording, resume: resumeRecording, stop: stopRecording, cancel: cancelRecording });
    };
    recorder.onerror = (event) => {
      stopTimer();
      stopAudioContext();
      stream.getTracks().forEach((track) => track.stop());
      rejectStart(event.error || new Error('Voice recording failed.'));
    };
    try { recorder.start(250); }
    catch (err) {
      stopTimer();
      stopAudioContext();
      stream.getTracks().forEach((track) => track.stop());
      rejectStart(err);
    }
  });
}
