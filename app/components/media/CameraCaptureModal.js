'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Check, FlipHorizontal, Loader2, Pause, Play, RotateCcw, StopCircle, Video, X, Zap, ZapOff } from 'lucide-react';

function chooseVideoMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/mp4',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

export default function CameraCaptureModal({ mode = 'both', maxVideoSeconds = 90, onCapture, onClose }) {
  const [cameraMode, setCameraMode] = useState(mode === 'video' ? 'video' : 'photo');
  const [facingMode, setFacingMode] = useState('user');
  const [streamReady, setStreamReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [reviewFile, setReviewFile] = useState(null);
  const [reviewType, setReviewType] = useState('');
  const [fallback, setFallback] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const secondsRef = useRef(0);
  const mountedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => { try { track.stop(); } catch {} });
    setStreamReady(false);
    setTorchOn(false);
  }, []);

  const requestCamera = useCallback(async (facing = facingMode) => {
    setError('');
    setFallback(false);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setFallback(true);
      setError('Camera access is unavailable in this browser. Choose a file instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: cameraMode === 'video',
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStreamReady(true);
    } catch (err) {
      setFallback(true);
      setError(err?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access or choose a file instead.'
        : 'Could not open the camera. Check permissions or choose a file instead.');
    }
  }, [cameraMode, facingMode, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch {}
      }
      stopCamera();
    };
    // Camera requests are started by the mode/facing effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mountedRef.current || recording || reviewUrl) return;
    requestCamera(facingMode);
  }, [cameraMode, facingMode]);

  useEffect(() => {
    return () => {
      if (reviewUrl.startsWith('blob:')) URL.revokeObjectURL(reviewUrl);
    };
  }, [reviewUrl]);

  useEffect(() => {
    if (!recording || paused) return undefined;
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= maxVideoSeconds) finishRecording();
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [recording, paused, maxVideoSeconds]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('Camera preview is not ready yet.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) { setError('Could not capture this photo.'); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setError('Could not capture this photo.'); return; }
      const file = new File([blob], 'shammah-photo-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      showReview(file, 'image');
    }, 'image/jpeg', 0.92);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) { setError('Camera is not ready.'); return; }
    if (typeof MediaRecorder === 'undefined') {
      setFallback(true);
      setError('Video recording is not supported in this browser. Choose a video file instead.');
      return;
    }
    const mimeType = chooseVideoMime();
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => setError('Recording was interrupted. Please try again.');
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        if (!blob.size) { setError('The recording was empty. Please try again.'); return; }
        const extension = type.includes('mp4') ? 'mp4' : 'webm';
        showReview(new File([blob], 'shammah-video-' + Date.now() + '.' + extension, { type }), 'video');
      };
      recorderRef.current = recorder;
      secondsRef.current = 0;
      setSeconds(0);
      setPaused(false);
      recorder.start(250);
      setRecording(true);
      setError('');
    } catch {
      setError('This browser could not start video recording. Choose a video file instead.');
      setFallback(true);
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch {}
    }
    setRecording(false);
    setPaused(false);
  }

  function startWithCountdown() {
    if (cameraMode === 'photo') { capturePhoto(); return; }
    setCountdown(3);
    let remaining = 3;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(0);
        startRecording();
      }
    }, 700);
  }

  function showReview(file, type) {
    if (reviewUrl.startsWith('blob:')) URL.revokeObjectURL(reviewUrl);
    const url = URL.createObjectURL(file);
    setReviewFile(file);
    setReviewType(type);
    setReviewUrl(url);
    setRecording(false);
    setPaused(false);
    stopCamera();
  }

  function retake() {
    if (reviewUrl.startsWith('blob:')) URL.revokeObjectURL(reviewUrl);
    setReviewUrl('');
    setReviewFile(null);
    setReviewType('');
    secondsRef.current = 0;
    setSeconds(0);
    requestCamera(facingMode);
  }

  function useCapture() {
    if (reviewFile) onCapture?.(reviewFile, { type: reviewType, duration: seconds });
    onClose?.();
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track?.getCapabilities || !track.getCapabilities().torch) {
      setError('Torch is not supported by this camera.');
      return;
    }
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setError('Could not change the torch setting.');
    }
  }

  const chooseFile = (file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file.name);
    if ((cameraMode === 'video' && !isVideo) || (cameraMode === 'photo' && !isImage)) {
      setError(cameraMode === 'video' ? 'Choose a video file.' : 'Choose an image file.');
      return;
    }
    showReview(file, isVideo ? 'video' : 'image');
  };

  if (!onCapture) return null;
  return (
    <div className="sh-capture-backdrop" role="dialog" aria-modal="true" aria-label="Camera capture">
      <section className="sh-capture-shell">
        <header className="sh-capture-header"><strong><Camera size={19} /> Capture media</strong><button type="button" onClick={onClose} aria-label="Close camera"><X size={20} /></button></header>
        <div className="sh-capture-stage">
          {reviewUrl ? reviewType === 'video' ? <video className="sh-capture-preview" src={reviewUrl} controls playsInline /> : <img className="sh-capture-preview" src={reviewUrl} alt="Captured preview" /> :
            <><video ref={videoRef} className="sh-capture-preview" autoPlay playsInline muted />{!streamReady && <div className="sh-capture-placeholder"><CameraOff size={30} /><span>Camera preview unavailable</span></div>}</>}
          {recording && <span className="sh-capture-recording"><i /> {paused ? 'Paused' : 'REC'} · {seconds}s</span>}
          {countdown > 0 && <span className="sh-capture-countdown">{countdown}</span>}
        </div>
        {error && <p className="sh-capture-error" role="alert">{error}</p>}
        {reviewUrl ? <div className="sh-capture-actions"><button type="button" className="sh-capture-secondary" onClick={retake}><RotateCcw size={18} /> Retake</button><button type="button" className="sh-capture-primary" onClick={useCapture}><Check size={18} /> Use this {reviewType === 'video' ? 'video' : 'photo'}</button></div> :
          <>
            {mode === 'both' && <div className="sh-capture-mode"><button type="button" className={cameraMode === 'photo' ? 'active' : ''} onClick={() => { setCameraMode('photo'); setError(''); }}>Photo</button><button type="button" className={cameraMode === 'video' ? 'active' : ''} onClick={() => { setCameraMode('video'); setError(''); }}>Video</button></div>}
            <div className="sh-capture-actions">
              <button type="button" className="sh-capture-secondary" onClick={() => requestCamera(facingMode === 'user' ? 'environment' : 'user')} aria-label="Flip camera" disabled={recording}><FlipHorizontal size={18} /> Flip</button>
              <button type="button" className="sh-capture-secondary" onClick={toggleTorch} aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'} disabled={recording}>{torchOn ? <ZapOff size={18} /> : <Zap size={18} />} Torch</button>
              {!recording ? <button type="button" className="sh-capture-primary" onClick={startWithCountdown} disabled={!streamReady || countdown > 0}>{cameraMode === 'photo' ? <Camera size={20} /> : <Video size={20} />}{cameraMode === 'photo' ? 'Take photo' : 'Record video'}</button> :
                <><button type="button" className="sh-capture-secondary" onClick={() => { const recorder = recorderRef.current; if (!recorder) return; if (paused) { recorder.resume(); setPaused(false); } else { recorder.pause(); setPaused(true); } }}>{paused ? <Play size={18} /> : <Pause size={18} />}{paused ? 'Resume' : 'Pause'}</button><button type="button" className="sh-capture-primary" onClick={finishRecording}><StopCircle size={18} /> Stop</button></>}
            </div>
            {fallback && <label className="sh-capture-file"><span>Choose from device</span><input type="file" accept={cameraMode === 'video' ? 'video/*' : 'image/*'} capture={cameraMode === 'video' ? 'environment' : 'user'} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} /></label>}
            <p className="sh-capture-hint">Recordings are limited to {maxVideoSeconds} seconds. Camera access requires HTTPS or localhost.</p>
          </>}
      </section>
    </div>
  );
}
