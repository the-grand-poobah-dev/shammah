'use client';
import React, { useRef, useState, useEffect } from 'react';
import PopupSheet from '../PopupSheet';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

export default function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setPhoto(null);
      setCameraError('');
      return;
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError('Camera access unavailable or denied.');
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(dataUrl);
  };

  const handleConfirmPhoto = () => {
    if (photo && onCapture) {
      // convert dataUrl to Blob
      fetch(photo)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file, photo);
          onClose();
        });
    }
  };

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Capture Photo" size="md">
      <div className="p-4 space-y-4">
        {cameraError ? (
          <div className="p-4 rounded-xl bg-red-500/10 text-red-500 text-sm text-center">
            {cameraError}
          </div>
        ) : photo ? (
          <div className="aspect-4-3 w-full bg-black rounded-xl overflow-hidden relative">
            <img src={photo} alt="Captured" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-4-3 w-full bg-black rounded-xl overflow-hidden relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-4 pt-2">
          {photo ? (
            <>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium min-h-[44px]"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="px-6 py-2.5 rounded-full bg-[var(--teal)] text-white text-sm font-semibold flex items-center gap-2 min-h-[44px]"
              >
                <Check size={16} />
                <span>Use Photo</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={Boolean(cameraError)}
              onClick={handleTakePhoto}
              className="w-14 h-14 rounded-full bg-[var(--teal)] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
              aria-label="Capture photo"
            >
              <Camera size={24} />
            </button>
          )}
        </div>
      </div>
    </PopupSheet>
  );
}
