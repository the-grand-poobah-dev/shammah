'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BADGES } from '../lib/badges';
import LocationPicker from './LocationPicker';

const STEPS = ['name', 'badge', 'photos', 'about', 'details'];

/**
 * Mandatory first-run wizard after sign-up / first login.
 * Required to finish: display name + badge.
 * Photos, about, DOB, location are skippable.
 */
export default function OnboardingWizard({ session, initialName, onComplete }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState(initialName || '');
  const [badge, setBadge] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [about, setAbout] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState(null);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function pickAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('Profile photo must be under 5 MB.');
      return;
    }
    setError('');
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  function pickCover(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError('Cover photo must be under 8 MB.');
      return;
    }
    setError('');
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function uploadImage(bucket, file) {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${session.user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (upErr) throw upErr;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  function canProceed() {
    if (current === 'name') return displayName.trim().length >= 2;
    if (current === 'badge') return !!badge;
    return true; // photos / about / details are optional
  }

  async function finish() {
    if (!displayName.trim() || !badge) {
      setError('Name and badge are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let avatar_url = null;
      let cover_url = null;
      try {
        avatar_url = await uploadImage('avatars', avatarFile);
        cover_url = await uploadImage('covers', coverFile);
      } catch (upErr) {
        // Photos are optional — don't block onboarding if upload fails
        console.warn('Photo upload failed during onboarding:', upErr);
      }

      const payload = {
        display_name: displayName.trim(),
        badge,
        about: about.trim() || null,
        date_of_birth: dob || null,
        location_name: location?.name || null,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
        onboarded_at: new Date().toISOString(),
      };
      if (avatar_url) payload.avatar_url = avatar_url;
      if (cover_url) payload.cover_url = cover_url;

      const { error: updErr } = await supabase.from('profiles').update(payload).eq('id', session.user.id);
      if (updErr) throw updErr;

      onComplete?.();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  function next() {
    setError('');
    if (!canProceed()) {
      if (current === 'name') setError('Please enter a name (at least 2 characters).');
      if (current === 'badge') setError('Please choose a member badge. This cannot be changed later.');
      return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  function back() {
    setError('');
    if (step > 0) setStep((s) => s - 1);
  }

  function skip() {
    // Only allowed on optional steps
    if (current === 'name' || current === 'badge') return;
    setError('');
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-panel">
        <div className="onboard-progress" aria-hidden>
          <div className="onboard-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <p className="onboard-step-label">
          Step {step + 1} of {STEPS.length}
        </p>

        {current === 'name' && (
          <>
            <h2 id="onboard-title" className="onboard-title">
              What should we call you?
            </h2>
            <p className="onboard-sub">
              This name appears on your posts and profile. You can change it once every 90 days.
            </p>
            <label className="onboard-label">
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Grace Wanjiku"
                maxLength={60}
                autoFocus
              />
            </label>
          </>
        )}

        {current === 'badge' && (
          <>
            <h2 id="onboard-title" className="onboard-title">
              Choose your member badge
            </h2>
            <p className="onboard-sub">
              This appears next to your name everywhere in Shammah. You pick it once — after that only
              the platform team can change it at your request.
            </p>
            <div className="badge-grid">
              {BADGES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`badge-option${badge === b.id ? ' selected' : ''}`}
                  onClick={() => setBadge(b.id)}
                >
                  <span className="badge-option-icon">{b.icon}</span>
                  <span className="badge-option-label">{b.label}</span>
                  <span className="badge-option-desc">{b.description}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {current === 'photos' && (
          <>
            <h2 id="onboard-title" className="onboard-title">
              Add photos
            </h2>
            <p className="onboard-sub">Optional — you can skip and add these later in Profile settings.</p>
            <div className="photo-upload-row">
              <label className="photo-upload-card">
                <span className="photo-upload-title">Profile picture</span>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="photo-preview avatar-preview" />
                ) : (
                  <span className="photo-placeholder">📷</span>
                )}
                <input type="file" accept="image/*" onChange={pickAvatar} hidden />
                <span className="photo-upload-cta">{avatarPreview ? 'Change' : 'Choose photo'}</span>
              </label>
              <label className="photo-upload-card">
                <span className="photo-upload-title">Cover picture</span>
                {coverPreview ? (
                  <img src={coverPreview} alt="" className="photo-preview cover-preview" />
                ) : (
                  <span className="photo-placeholder">🖼️</span>
                )}
                <input type="file" accept="image/*" onChange={pickCover} hidden />
                <span className="photo-upload-cta">{coverPreview ? 'Change' : 'Choose photo'}</span>
              </label>
            </div>
          </>
        )}

        {current === 'about' && (
          <>
            <h2 id="onboard-title" className="onboard-title">
              A short about
            </h2>
            <p className="onboard-sub">Optional. Share a verse, calling, or one-liner (max ~250 characters).</p>
            <label className="onboard-label">
              About
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, 250))}
                rows={4}
                placeholder="e.g. Saved by grace. Serving youth ministry in Nairobi."
                maxLength={250}
              />
              <span className="char-count">{about.length}/250</span>
            </label>
          </>
        )}

        {current === 'details' && (
          <>
            <h2 id="onboard-title" className="onboard-title">
              A few more details
            </h2>
            <p className="onboard-sub">Optional. Helps your church community know you better.</p>
            <label className="onboard-label">
              Date of birth
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </label>
            <label className="onboard-label" style={{ marginTop: 14 }}>
              Location
              <LocationPicker value={location} onChange={setLocation} />
            </label>
          </>
        )}

        {error && <p className="onboard-error">{error}</p>}

        <div className="onboard-actions">
          {step > 0 && (
            <button type="button" className="onboard-btn secondary" onClick={back} disabled={busy}>
              Back
            </button>
          )}
          <div className="onboard-actions-right">
            {(current === 'photos' || current === 'about' || current === 'details') && (
              <button type="button" className="onboard-btn ghost" onClick={skip} disabled={busy}>
                Skip
              </button>
            )}
            <button
              type="button"
              className="onboard-btn primary"
              onClick={next}
              disabled={busy || !canProceed()}
            >
              {busy ? 'Saving…' : step === STEPS.length - 1 ? 'Finish' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
