'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getBadge, nameChangeDaysLeft } from '../lib/badges';
import LocationPicker from './LocationPicker';
import MemberBadge from './MemberBadge';
import { initials } from '../lib/postDisplay';

/**
 * Full profile settings panel — beautiful, calm, church-friendly UI.
 * Name change limited to once / 90 days. Badge is locked.
 */
export default function ProfileSettings({ session, profile, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [dob, setDob] = useState(profile?.date_of_birth || '');
  const [location, setLocation] = useState(
    profile?.location_name
      ? { name: profile.location_name, lat: profile.location_lat, lng: profile.location_lng }
      : null
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const daysLeft = nameChangeDaysLeft(profile?.display_name_changed_at);
  const canChangeName = daysLeft === 0;
  const badge = getBadge(profile?.badge);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setAbout(profile?.about || '');
    setDob(profile?.date_of_birth || '');
    setAvatarUrl(profile?.avatar_url || null);
    setCoverUrl(profile?.cover_url || null);
    setLocation(
      profile?.location_name
        ? { name: profile.location_name, lat: profile.location_lat, lng: profile.location_lng }
        : null
    );
  }, [profile]);

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

  function onAvatarPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('Profile photo must be under 5 MB.');
      return;
    }
    setError('');
    setAvatarFile(f);
    setAvatarUrl(URL.createObjectURL(f));
  }

  function onCoverPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError('Cover photo must be under 8 MB.');
      return;
    }
    setError('');
    setCoverFile(f);
    setCoverUrl(URL.createObjectURL(f));
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        about: about.trim() || null,
        date_of_birth: dob || null,
        location_name: location?.name || null,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
      };

      if (canChangeName && displayName.trim() && displayName.trim() !== profile?.display_name) {
        payload.display_name = displayName.trim();
      }

      if (avatarFile) {
        payload.avatar_url = await uploadImage('avatars', avatarFile);
      }
      if (coverFile) {
        payload.cover_url = await uploadImage('covers', coverFile);
      }

      const { error: updErr } = await supabase.from('profiles').update(payload).eq('id', session.user.id);
      if (updErr) throw updErr;

      setMessage('Profile saved.');
      setAvatarFile(null);
      setCoverFile(null);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="profile-settings-panel" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {/* Cover + avatar hero */}
        <div className="ps-hero">
          <div className="ps-cover" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}>
            <label className="ps-cover-edit">
              <input type="file" accept="image/*" onChange={onCoverPick} hidden />
              Change cover
            </label>
          </div>
          <div className="ps-avatar-wrap">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="ps-avatar" />
            ) : (
              <span className="ps-avatar ps-avatar-fallback">
                {initials(displayName || profile?.display_name || '?')}
              </span>
            )}
            <label className="ps-avatar-edit">
              <input type="file" accept="image/*" onChange={onAvatarPick} hidden />
              ✎
            </label>
          </div>
        </div>

        <div className="ps-body">
          <div className="ps-identity">
            <h2 className="ps-title">{displayName || profile?.display_name || 'Your profile'}</h2>
            {profile?.badge && <MemberBadge badgeId={profile.badge} size="md" />}
            <p className="ps-email">{session.user.email}</p>
          </div>

          {badge && (
            <div className="ps-badge-lock">
              <p>
                <strong>Member badge:</strong> {badge.icon} {badge.label}
              </p>
              <p className="ps-hint">
                Badges cannot be changed after onboarding. Message the Shammah team if you need an update.
              </p>
            </div>
          )}

          <form onSubmit={handleSave} className="ps-form">
            <label className="onboard-label">
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                disabled={!canChangeName}
              />
              {!canChangeName ? (
                <span className="ps-hint">
                  You can change your name again in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
                </span>
              ) : (
                <span className="ps-hint">You may change this once every 90 days.</span>
              )}
            </label>

            <label className="onboard-label">
              About
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value.slice(0, 250))}
                rows={3}
                maxLength={250}
                placeholder="A short word about yourself…"
              />
              <span className="char-count">{about.length}/250</span>
            </label>

            <label className="onboard-label">
              Date of birth
              <input type="date" value={dob || ''} onChange={(e) => setDob(e.target.value)} />
            </label>

            <label className="onboard-label">
              Location
              <LocationPicker value={location} onChange={setLocation} />
            </label>

            {error && <p className="onboard-error">{error}</p>}
            {message && <p className="onboard-success">{message}</p>}

            <button type="submit" className="onboard-btn primary ps-save" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
