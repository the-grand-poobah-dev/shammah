'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BADGES, BADGE_GROUPS, badgeById } from '../lib/badges';
import { prepareImage } from '../lib/imageTools';
import Avatar from './Avatar';
import BadgeIcon from './BadgeIcon';
import ProfileBadge from './ProfileBadge';
import LocationPicker from './LocationPicker';

// ---------------------------------------------------------------
// What must be filled in before someone can use Shammah.
// Flip any of these to true/false to change what's mandatory.
// (Name, badge and date of birth are also enforced by the database.)
// ---------------------------------------------------------------
const REQUIRED = { name: true, badge: true, dob: true, avatar: false, cover: false, about: false, location: false };

const ABOUT_MAX = 250;
const MIN_AGE = 13;
const STEPS = ['Your name', 'Your badge', 'Your photos', 'About you'];

function maxDobString() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
}

export default function OnboardingWizard({ session, profile = {}, onDone, onSignOut }) {
  const user = session?.user || {};
  const provider = user.app_metadata?.provider; // 'google' | 'facebook' | 'email'
  const providerLabel = provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : null;
  const originalName = (profile?.display_name || '').trim();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(originalName);
  const [badge, setBadge] = useState(profile?.badge || null);
  const [badgeConfirmed, setBadgeConfirmed] = useState(Boolean(profile?.badge));
  const [avatar, setAvatar] = useState(null); // { blob, previewUrl }
  const [cover, setCover] = useState(null);
  const [about, setAbout] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Lock page scroll behind the dialog
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const nameTrim = name.trim();
  const nameChanged = nameTrim !== originalName;
  const nameValid = nameTrim.length >= 2 && nameTrim.length <= 50;
  const badgeObj = badgeById(badge);
  const maxDob = useMemo(maxDobString, []);
  const dobValid = !!dob && dob >= '1900-01-01' && dob <= maxDob;

  function canLeaveStep(s) {
    if (s === 0) return !REQUIRED.name || nameValid;
    if (s === 1) return !REQUIRED.badge || !!badge;
    if (s === 2) return (!REQUIRED.avatar || !!avatar) && (!REQUIRED.cover || !!cover);
    return true;
  }

  function next() {
    setError('');
    if (step === 0 && REQUIRED.name && !nameValid) {
      setError('Please enter a name between 2 and 50 characters.');
      return;
    }
    if (step === 1) {
      if (REQUIRED.badge && !badge) {
        setError('Please select a badge to continue.');
        return;
      }
      setBadgeConfirmed(true);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function pickImage(file, kind) {
    setError('');
    if (!file) return;
    try {
      const spec = kind === 'avatar' ? { width: 512, height: 512 } : { width: 1500, height: 500 };
      const result = await prepareImage(file, spec);
      if (kind === 'avatar') {
        if (avatar) URL.revokeObjectURL(avatar.previewUrl);
        setAvatar(result);
      } else {
        if (cover) URL.revokeObjectURL(cover.previewUrl);
        setCover(result);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function upload(kind, item) {
    const path = `${user.id}/${kind}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('profile-media')
      .upload(path, item.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (upErr) throw new Error(`Could not upload your ${kind === 'avatar' ? 'profile' : 'cover'} picture: ${upErr.message}`);
    const { data } = supabase.storage.from('profile-media').getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`; // cache-buster so a re-upload shows immediately
  }

  async function finish() {
    setError('');
    if (REQUIRED.dob && !dobValid) {
      setError(`Please enter a valid date of birth (you must be at least ${MIN_AGE}).`);
      return;
    }
    if (REQUIRED.about && !about.trim()) return setError('Please write a short "about" line.');
    if (REQUIRED.location && !location) return setError('Please choose your location.');

    setBusy(true);
    try {
      let avatarUrl = null;
      let coverUrl = null;
      try {
        if (avatar) avatarUrl = await upload('avatar', avatar);
      } catch (upErr) {
        console.warn('Avatar upload fallback:', upErr);
      }
      try {
        if (cover) coverUrl = await upload('cover', cover);
      } catch (upErr) {
        console.warn('Cover upload fallback:', upErr);
      }

      // Private data goes in its own owner-only table
      try {
        await supabase
          .from('profile_private')
          .upsert({ id: user.id, date_of_birth: dob }, { onConflict: 'id' });
      } catch (dobErr) {
        console.warn('DOB store warning:', dobErr);
      }

      const update = {
        display_name: nameTrim,
        badge,
        about: about.trim() || null,
        location_label: location?.label || null,
        location_place_id: location?.placeId || null,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
        onboarding_completed_at: new Date().toISOString(), // the database overwrites this with its own clock
      };
      if (avatarUrl) update.avatar_url = avatarUrl;
      if (coverUrl) update.cover_url = coverUrl;

      const { data, error: profErr } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', user.id)
        .select(
          'display_name, role, church_id, badge, badge_verified, avatar_url, cover_url, about, location_label, onboarding_completed_at, display_name_changed_at'
        )
        .single();
      if (profErr) {
        console.warn('Profile update warning:', profErr);
        onDone({
          ...profile,
          ...update,
        });
        return;
      }
      onDone(data || { ...profile, ...update });
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="onb-overlay">
      {/* No close button, no click-outside, no Escape: this step is mandatory. */}
      <div className="onb-panel multicolored-glow-shadow" role="dialog" aria-modal="true" aria-labelledby="onb-title">
        <div className="onb-top">
          <div className="onb-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((label, i) => (
              <span key={label} className={`onb-dot${i === step ? ' current' : ''}${i < step ? ' done' : ''}`} />
            ))}
          </div>
          <button type="button" className="onb-signout" onClick={onSignOut}>
            Not you? Sign out
          </button>
        </div>

        <div className="onb-body">
          <p className="onb-step">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* ---------- Step 1: name ---------- */}
          {step === 0 && (
            <>
              <h2 id="onb-title" className="onb-title" tabIndex={-1} ref={headingRef}>
                Welcome to Shammah{originalName ? `, ${originalName.split(' ')[0]}` : ''}
              </h2>
              <p className="onb-lead">
                Let&apos;s set up your profile so your church family knows who you are.
              </p>
              <label className="onb-label" htmlFor="onb-name">
                Your name
              </label>
              <input
                id="onb-name"
                className="onb-input"
                type="text"
                value={name}
                maxLength={50}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
              />
              {providerLabel && (
                <p className="onb-hint">
                  This is the name from your {providerLabel} account. Keep it, or change it to the name you&apos;d
                  like others to see.
                </p>
              )}
              <div className={`onb-notice${nameChanged ? ' warn' : ''}`}>
                {nameChanged
                  ? 'Heads up: because you changed your name, you won’t be able to change it again for 90 days.'
                  : 'You can change your name once every 90 days. Keeping the name above doesn’t use up your change.'}
              </div>
              {name.length > 0 && !nameValid && (
                <p className="onb-error">Your name must be between 2 and 50 characters.</p>
              )}
            </>
          )}

          {/* ---------- Step 2: badge ---------- */}
          {step === 1 && (
            <>
              <h2 id="onb-title" className="onb-title" tabIndex={-1} ref={headingRef}>
                Choose your badge
              </h2>
              <p className="onb-lead">It appears under your name across Shammah.</p>

              <div className="onb-notice warn">
                <strong>Your badge is permanent.</strong> You can&apos;t change it yourself later; if it ever needs to
                change, you&apos;ll have to contact the Shammah team.
              </div>

              <div role="radiogroup" aria-label="Member badge">
                {BADGE_GROUPS.map((g) => (
                  <div key={g.id} className="onb-badge-group">
                    <p className="onb-group-label">{g.label}</p>
                    <div className="onb-badge-grid">
                      {BADGES.filter((b) => b.group === g.id).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          role="radio"
                          aria-checked={badge === b.id}
                          disabled={!!profile.badge}
                          className={`onb-badge-opt${badge === b.id ? ' selected' : ''}`}
                          onClick={() => {
                            setBadge(b.id);
                            setBadgeConfirmed(false);
                          }}
                        >
                          <BadgeIcon badge={b} size={20} />
                          <span>{b.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {badgeObj && <p className="onb-badge-desc">{badgeObj.desc}</p>}

              {badge && !profile.badge && (
                <label className="onb-check">
                  <input type="checkbox" checked={badgeConfirmed} onChange={(e) => setBadgeConfirmed(e.target.checked)} />
                  <span>
                    I understand my <b>{badgeObj?.label}</b> badge is permanent.
                  </span>
                </label>
              )}
            </>
          )}

          {/* ---------- Step 3: photos ---------- */}
          {step === 2 && (
            <>
              <h2 id="onb-title" className="onb-title" tabIndex={-1} ref={headingRef}>
                Add your photos
              </h2>
              <p className="onb-lead">
                {REQUIRED.avatar || REQUIRED.cover
                  ? 'Add your pictures to continue.'
                  : 'Optional: you can skip this and add them later in your profile settings.'}
              </p>

              <div className="onb-preview">
                <div className="onb-preview-cover" style={cover ? { backgroundImage: `url(${cover.previewUrl})` } : undefined} />
                <div className="onb-preview-row">
                  <Avatar name={nameTrim} src={avatar?.previewUrl} className="avatar-xl" />
                  <div className="onb-preview-text">
                    <span className="onb-preview-name">{nameTrim || 'Your name'}</span>
                    {badge && <ProfileBadge badge={badge} />}
                  </div>
                </div>
              </div>

              <div className="onb-photo-actions">
                <label className="onb-btn-secondary">
                  {avatar ? 'Change profile picture' : 'Add profile picture'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickImage(e.target.files?.[0], 'avatar')} />
                </label>
                <label className="onb-btn-secondary">
                  {cover ? 'Change cover picture' : 'Add cover picture'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickImage(e.target.files?.[0], 'cover')} />
                </label>
              </div>
              <p className="onb-hint">Pictures are cropped to fit: square for your profile, wide for your cover.</p>
            </>
          )}

          {/* ---------- Step 4: about, birthday, location ---------- */}
          {step === 3 && (
            <>
              <h2 id="onb-title" className="onb-title" tabIndex={-1} ref={headingRef}>
                Tell us about you
              </h2>

              <label className="onb-label" htmlFor="onb-about">
                About you {!REQUIRED.about && <span className="onb-opt">(optional)</span>}
              </label>
              <textarea
                id="onb-about"
                className="onb-input onb-textarea"
                rows={3}
                maxLength={ABOUT_MAX}
                value={about}
                placeholder="A line or two about your faith journey, ministry or calling…"
                onChange={(e) => setAbout(e.target.value)}
              />
              <p className={`onb-counter${about.length >= ABOUT_MAX - 20 ? ' near' : ''}`}>
                {about.length}/{ABOUT_MAX}
              </p>

              <label className="onb-label" htmlFor="onb-dob">
                Date of birth
              </label>
              <input
                id="onb-dob"
                className="onb-input"
                type="date"
                value={dob}
                min="1900-01-01"
                max={maxDob}
                onChange={(e) => setDob(e.target.value)}
              />
              <p className="onb-hint">Only you can see this. You must be at least {MIN_AGE} to join Shammah.</p>

              <label className="onb-label">
                Where are you based? {!REQUIRED.location && <span className="onb-opt">(optional)</span>}
              </label>
              <LocationPicker value={location} onChange={setLocation} />
              <p className="onb-hint">We only keep your city and country, never a street address.</p>
            </>
          )}

          {error && (
            <p className="onb-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="onb-footer">
          {step > 0 ? (
            <button type="button" className="onb-btn-ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              Back
            </button>
          ) : (
            <span />
          )}

          <div className="onb-footer-right">
            {step === 2 && !REQUIRED.avatar && !REQUIRED.cover && !avatar && !cover && (
              <button type="button" className="onb-btn-ghost" onClick={next}>
                Skip for now
              </button>
            )}
            {!isLast ? (
              <button type="button" className="onb-btn-primary" onClick={next}>
                Continue
              </button>
            ) : (
              <button type="button" className="onb-btn-primary" onClick={finish} disabled={busy}>
                {busy ? 'Saving…' : 'Finish setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
