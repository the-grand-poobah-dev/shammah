// Client-side helper for in-browser microphone voice note recording
// Works seamlessly with MediaRecorder API on desktop and mobile browsers,
// returning a standard File/Blob ready for uploadPostMedia.

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
 * @param {number} [options.maxSeconds=60] - Max duration allowed before auto-stopping
 * @returns {Promise<{ stop: () => Promise<{ file: File, duration: number, previewUrl: string }>, cancel: () => void }>}
 */
export async function startAudioRecording({ onTimeTick, maxSeconds = 60 } = {}) {
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
      throw new Error('Microphone permission was denied. Please allow microphone access to record voice notes.');
    }
    throw new Error(err.message || 'Could not access your microphone.');
  }

  // Determine best supported MIME type
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
    if (MediaRecorder.isTypeSupported(candidate)) {
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

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolveStart, rejectStart) => {
    recorder.onstart = () => {
      timerId = setInterval(() => {
        seconds += 1;
        if (onTimeTick) {
          try {
            onTimeTick(seconds);
          } catch {}
        }
        if (seconds >= maxSeconds) {
          stopRecording();
        }
      }, 1000);

      resolveStart({
        stop: stopRecording,
        cancel: cancelRecording,
      });
    };

    recorder.onerror = (e) => {
      clearInterval(timerId);
      stream.getTracks().forEach((track) => track.stop());
      rejectStart(e);
    };

    function stopRecording() {
      return new Promise((resolveStop) => {
        if (hasStopped) return;
        hasStopped = true;
        clearInterval(timerId);

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());

          const cleanMime = (recorder.mimeType || 'audio/webm').split(';')[0];
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
          recorder.stop();
        }
      });
    }

    function cancelRecording() {
      if (hasStopped) return;
      hasStopped = true;
      clearInterval(timerId);
      stream.getTracks().forEach((track) => track.stop());
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {}
      }
    }

    try {
      recorder.start(250); // Record in 250ms chunks
    } catch (startErr) {
      clearInterval(timerId);
      stream.getTracks().forEach((track) => track.stop());
      rejectStart(startErr);
    }
  });
}
