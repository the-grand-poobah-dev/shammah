'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { startAudioRecording, isAudioRecordingSupported } from '../../lib/voiceRecorder';

export default function VoiceRecorderBar({ onDone, onCancel, maxSeconds = 60 }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const previewUrlRef = useRef('');
  const mountedRef = useRef(false);

  const beginRecording = useCallback(async () => {
    setBusy(true);
    setError('');
    setReview(null);
    setSeconds(0);
    setLevel(0);
    setPaused(false);
    try {
      if (!isAudioRecordingSupported()) throw new Error('Voice recording is not supported in this browser. Attach an audio file instead.');
      const recorder = await startAudioRecording({
        maxSeconds,
        onTimeTick: (value) => {
          if (!mountedRef.current) return;
          setSeconds(value);
          if (value >= maxSeconds) {
            recorderRef.current?.stop().then((result) => {
              if (result && mountedRef.current) {
                previewUrlRef.current = result.previewUrl;
                setReview(result);
                setRecording(false);
                setPaused(false);
              }
            }).catch(() => {});
          }
        },
        onLevel: (value) => { if (mountedRef.current) setLevel(value); },
      });
      if (!mountedRef.current) { recorder.cancel(); return; }
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Could not start voice recording.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [maxSeconds]);

  useEffect(() => {
    mountedRef.current = true;
    beginRecording();
    return () => {
      mountedRef.current = false;
      recorderRef.current?.cancel();
      if (previewUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    };
  }, [beginRecording]);

  async function stopRecording() {
    if (!recorderRef.current) return;
    setBusy(true);
    try {
      const result = await recorderRef.current.stop();
      recorderRef.current = null;
      if (result) {
        previewUrlRef.current = result.previewUrl;
        setReview(result);
      }
      setRecording(false);
      setPaused(false);
      setLevel(0);
    } catch (err) {
      setError(err.message || 'Could not finish voice recording.');
    } finally {
      setBusy(false);
    }
  }

  function togglePause() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (paused) { recorder.resume(); setPaused(false); }
    else { recorder.pause(); setPaused(true); }
  }

  function retake() {
    recorderRef.current = null;
    if (previewUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setReview(null);
    beginRecording();
  }

  function useRecording() {
    if (!review?.file) return;
    const result = review;
    recorderRef.current = null;
    previewUrlRef.current = '';
    onDone?.(result.file, { duration: result.duration, type: result.file.type });
  }

  function cancel() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    if (previewUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    onCancel?.();
  }

  const bars = Array.from({ length: 28 }, (_, index) => {
    const modulation = 0.18 + ((index * 17) % 11) / 22;
    return Math.max(4, 5 + level * 34 * modulation);
  });

  return (
    <div className="sh-voice-backdrop" role="dialog" aria-modal="true" aria-label="Voice note recorder">
      <section className="sh-voice-recorder">
        <header><div><span className="sh-voice-mic"><Mic size={18} /></span><div><strong>{review ? 'Review voice note' : paused ? 'Recording paused' : 'Voice note'}</strong><small>{review ? 'Listen before attaching' : 'Speak clearly; your recording stays private until you send it.'}</small></div></div><button type="button" onClick={cancel} aria-label="Cancel voice recorder"><X size={20} /></button></header>
        {error ? <p className="sh-voice-error" role="alert">{error}</p> : null}
        {review ? <div className="sh-voice-review"><audio controls src={review.previewUrl} /><div className="sh-voice-actions"><button type="button" className="sh-voice-secondary" onClick={retake}><RotateCcw size={17} /> Retake</button><button type="button" className="sh-voice-primary" onClick={useRecording}><Check size={17} /> Use voice note</button></div></div> :
          <><div className={'sh-voice-waveform' + (paused ? ' is-paused' : '')} aria-label="Audio waveform" role="img">{bars.map((height, index) => <span key={index} style={{ height: height + 'px' }} />)}</div><div className="sh-voice-timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} <span>/ {Math.floor(maxSeconds / 60)}:{String(maxSeconds % 60).padStart(2, '0')}</span></div><div className="sh-voice-actions">{busy ? <button type="button" className="sh-voice-secondary" disabled><Loader2 className="sh-spin" size={18} /> Starting…</button> : <><button type="button" className="sh-voice-secondary" onClick={togglePause} disabled={!recording}>{paused ? <Play size={17} /> : <Pause size={17} />}{paused ? 'Resume' : 'Pause'}</button><button type="button" className="sh-voice-primary" onClick={stopRecording} disabled={!recording}><Square size={16} /> Stop & review</button></>}</div></>}
        <p className="sh-voice-hint">Maximum {maxSeconds} seconds. You can listen, retake or cancel before attaching.</p>
      </section>
    </div>
  );
}
