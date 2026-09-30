'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { BADGES, badgeById, nameChangeDaysLeft } from '../lib/badges';
import { prepareImage } from '../lib/imageTools';
import Avatar from './Avatar';
import BadgeIcon from './BadgeIcon';
import MemberName from './MemberName';
import LocationPicker from './LocationPicker';

const COLS =
  'display_name, role, badge, badge_verified, avatar_url, cover_url, about, location_label, location_place_id, location_lat, location_lng, onboarding_completed_at, display_name_changed_at';
const ABOUT_MAX = 250;
const MIN_AGE = 13;

function Ico({ d, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(Array.isArray(d) ? d : [d]).map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const ICONS = {
  camera: ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', 'M12 17a4 4 0 100-8 4 4 0 000 8z'],
  user: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  quote: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
  pin: ['M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z', 'M12 13a3 3 0 100-6 3 3 0 000 6z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  lock: ['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4'],
  key: ['M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'],
  cake: ['M20 21v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8', 'M4 16s1.5 2 4 2 4-2 4-2 1.5 2 4 2 4-2 4-2', 'M2 21h20', 'M12 8V5'],
};

export default function ProfileSettings({ session }) {
  const router = useRouter();
  const uid = session.user.id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [dobOrig, setDobOrig] = useState('');
  const [pending, setPending] = useState(null); // pending badge-change request

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState(null);

  const [saving, setSaving] = useState(false);
  const [busyImg, setBusyImg] = useState(null); // 'avatar' | 'cover' | null
  const [toast, setToast] = useState(null);
  const [reqOpen, setReqOpen] = useState(false);
  const toastTimer = useRef(null);

  const notify = useCallback((type, text) => {
    setToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  function applyProfile(p) {
    setProfile(p);
    setName(p.display_name || '');
    setAbout(p.about || '');
    setLocation(
      p.location_label
        ? { label: p.location_label, placeId: p.location_place_id, lat: p.location_lat, lng: p.location_lng }
        : null
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [profRes, privRes, reqRes] = await Promise.all([
        supabase.from('profiles').select(COLS).eq('id', uid).single(),
        supabase.from('profile_private').select('date_of_birth').eq('id', uid).maybeSingle(),
        supabase.from('badge_requests').select('id, requested_badge, created_at').eq('user_id', uid).eq('status', 'pending').maybeSingle(),
      ]);
      if (cancelled) return;
      if (profRes.error) notify('error', 'Could not load your profile. Please refresh.');
      else applyProfile(profRes.data);
      const d = privRes.data?.date_of_birth || '';
      setDobOrig(d);
      setDob(d);
      setPending(reqRes.error ? null : reqRes.data || null); // table only exists after migration 005
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_AGE);
    return d.toISOString().slice(0, 10);
  }, []);

  if (loading) {
    return (
      <div className="st-wrap">
        <div className="st-skeleton st-skel-hero" />
        <div className="st-skeleton st-skel-card" />
        <div className="st-skeleton st-skel-card" />
      </div>
    );
  }
  if (!profile) return null;

  if (!profile.onboarding_completed_at) {
    return (
      <div className="st-wrap">
        <div className="st-card st-center">
          <h2 className="st-h">Finish setting up first</h2>
          <p className="st-sub">Complete the short welcome steps, then come back here to fine-tune your profile.</p>
          <Link href="/" className="st-btn st-btn-primary">
            Continue setup
          </Link>
        </div>
      </div>
    );
  }

  // ---------- derived state ----------
  const nameTrim = name.trim();
  const daysLeft = nameChangeDaysLeft(profile.display_name_changed_at);
  const nameLocked = daysLeft > 0;
  const unlockDate = profile.display_name_changed_at
    ? new Date(new Date(profile.display_name_changed_at).getTime() + 90 * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const nameChanged = nameTrim !== (profile.display_name || '');
  const nameValid = nameTrim.length >= 2 && nameTrim.length <= 50;
  const aboutChanged = about.trim() !== (profile.about || '');
  const dobChanged = dob !== dobOrig;
  const dobValid = !!dob && dob >= '1900-01-01' && dob <= maxDob;
  const locChanged = (location?.label || '') !== (profile.location_label || '');
  const dirty = nameChanged || aboutChanged || dobChanged || locChanged;
  const canSave = dirty && !saving && (!nameChanged || (nameValid && !nameLocked)) && dobValid;

  const badge = badgeById(profile.badge);
  const strength = Math.round(
    ([profile.avatar_url, profile.cover_url, profile.about, profile.location_label, dobOrig].filter(Boolean).length / 5) * 100
  );

  // ---------- actions ----------
  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (dobChanged) {
        const { error } = await supabase.from('profile_private').upsert({ id: uid, date_of_birth: dob }, { onConflict: 'id' });
        if (error) throw new Error(error.message);
        setDobOrig(dob);
      }
      const upd = {};
      if (nameChanged) upd.display_name = nameTrim;
      if (aboutChanged) upd.about = about.trim() || null;
      if (locChanged) {
        upd.location_label = location?.label || null;
        upd.location_place_id = location?.placeId || null;
        upd.location_lat = location?.lat ?? null;
        upd.location_lng = location?.lng ?? null;
      }
      if (Object.keys(upd).length) {
        const { data, error } = await supabase.from('profiles').update(upd).eq('id', uid).select(COLS).single();
        if (error) throw new Error(error.message);
        applyProfile(data);
      }
      notify('success', 'Your profile has been updated.');
    } catch (e) {
      notify('error', e.message || 'Could not save. Please try again.');
    }
    setSaving(false);
  }

  function discard() {
    applyProfile(profile);
    setDob(dobOrig);
  }

  async function changeImage(kind, file) {
    if (!file) return;
    setBusyImg(kind);
    try {
      const spec = kind === 'avatar' ? { width: 512, height: 512 } : { width: 1500, height: 500 };
      const { blob } = await prepareImage(file, spec);
      const path = `${uid}/${kind}.jpg`;
      const { error: upErr } = await supabase.storage.from('profile-media').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw new Error(upErr.message);
      const url = `${supabase.storage.from('profile-media').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { data, error } = await supabase.from('profiles').update({ [`${kind}_url`]: url }).eq('id', uid).select(COLS).single();
      if (error) throw new Error(error.message);
      setProfile(data);
      notify('success', kind === 'avatar' ? 'Profile picture updated.' : 'Cover picture updated.');
    } catch (e) {
      notify('error', e.message || 'Could not upload that picture.');
    }
    setBusyImg(null);
  }

  async function removeImage(kind) {
    setBusyImg(kind);
    try {
      await supabase.storage.from('profile-media').remove([`${uid}/${kind}.jpg`]);
      const { data, error } = await supabase.from('profiles').update({ [`${kind}_url`]: null }).eq('id', uid).select(COLS).single();
      if (error) throw new Error(error.message);
      setProfile(data);
      notify('success', 'Picture removed.');
    } catch (e) {
      notify('error', e.message || 'Could not remove that picture.');
    }
    setBusyImg(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const provider = session.user.app_metadata?.provider;
  const memberSince = session.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="st-wrap">
      {/* ---------- Hero ---------- */}
      <section className="st-hero st-rise" style={{ '--d': '0ms' }}>
        <div className="st-cover" style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}>
          <label className="st-glass-btn" aria-label="Change cover picture">
            <Ico d={ICONS.camera} size={16} />
            <span>{busyImg === 'cover' ? 'Uploading…' : profile.cover_url ? 'Change cover' : 'Add cover'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!busyImg} onChange={(e) => { changeImage('cover', e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>

        <div className="st-hero-body">
          <div className="st-avatar-wrap">
            <Avatar name={profile.display_name} src={profile.avatar_url} className="st-avatar" />
            {busyImg === 'avatar' && <span className="st-avatar-busy" />}
            <label className="st-cam" aria-label="Change profile picture">
              <Ico d={ICONS.camera} size={16} />
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!busyImg} onChange={(e) => { changeImage('avatar', e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>

          <div className="st-hero-id">
            <h1 className="st-name">
              <MemberName name={profile.display_name} badge={profile.badge} verified={profile.badge_verified} layout="inline" />
            </h1>
            <p className="st-meta">
              {profile.location_label ? `📍 ${profile.location_label}` : 'Add your location below'}
              {memberSince && <span> · Member since {memberSince}</span>}
            </p>
          </div>

          <div className="st-meter" title="How complete your profile is">
            <div className="st-meter-top">
              <span>Profile strength</span>
              <b>{strength}%</b>
            </div>
            <div className="st-meter-track">
              <div className="st-meter-fill" style={{ width: `${strength}%` }} />
            </div>
          </div>

          {(profile.avatar_url || profile.cover_url) && (
            <p className="st-remove-row">
              {profile.avatar_url && (
                <button type="button" className="st-link" disabled={!!busyImg} onClick={() => removeImage('avatar')}>
                  Remove profile picture
                </button>
              )}
              {profile.cover_url && (
                <button type="button" className="st-link" disabled={!!busyImg} onClick={() => removeImage('cover')}>
                  Remove cover
                </button>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ---------- Name ---------- */}
      <section className="st-card st-rise" style={{ '--d': '60ms' }}>
        <header className="st-card-head">
          <span className="st-ico"><Ico d={ICONS.user} /></span>
          <div>
            <h2 className="st-h">Your name</h2>
            <p className="st-sub">This is how you appear on posts and comments.</p>
          </div>
        </header>
        <label className="st-label" htmlFor="st-name">Display name</label>
        <input id="st-name" className="st-input" value={name} maxLength={50} disabled={nameLocked} onChange={(e) => setName(e.target.value)} />
        {nameLocked ? (
          <div className="st-lock">
            <Ico d={ICONS.lock} size={16} />
            <span>
              You changed your name recently. You can change it again in <b>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</b> (on {unlockDate}).
            </span>
          </div>
        ) : (
          <p className="st-hint">
            {nameChanged ? 'After you save, your name will be locked for 90 days.' : 'You can change your name once every 90 days.'}
          </p>
        )}
        {nameChanged && !nameValid && <p className="st-error">Your name must be between 2 and 50 characters.</p>}
      </section>

      {/* ---------- About ---------- */}
      <section className="st-card st-rise" style={{ '--d': '120ms' }}>
        <header className="st-card-head">
          <span className="st-ico"><Ico d={ICONS.quote} /></span>
          <div>
            <h2 className="st-h">About you</h2>
            <p className="st-sub">A line or two about your faith, ministry or calling.</p>
          </div>
        </header>
        <textarea className="st-input st-textarea" rows={4} maxLength={ABOUT_MAX} value={about} placeholder="Share a verse, a calling, or a few words about yourself…" onChange={(e) => setAbout(e.target.value)} />
        <p className={`st-counter${about.length >= ABOUT_MAX - 20 ? ' near' : ''}`}>{about.length}/{ABOUT_MAX}</p>
      </section>

      {/* ---------- Personal ---------- */}
      <section className="st-card st-rise" style={{ '--d': '180ms' }}>
        <header className="st-card-head">
          <span className="st-ico"><Ico d={ICONS.pin} /></span>
          <div>
            <h2 className="st-h">Where &amp; when</h2>
            <p className="st-sub">Your city is public. Your birthday stays private.</p>
          </div>
        </header>
        <label className="st-label">Location</label>
        <LocationPicker value={location} onChange={setLocation} />
        <p className="st-hint">We only keep your city and country, never a street address.</p>

        <label className="st-label" htmlFor="st-dob">
          <Ico d={ICONS.cake} size={14} /> Date of birth
        </label>
        <input id="st-dob" className="st-input" type="date" value={dob} min="1900-01-01" max={maxDob} onChange={(e) => setDob(e.target.value)} />
        <p className="st-hint">Only you can see this.</p>
        {dob && !dobValid && <p className="st-error">Please enter a valid date (you must be at least {MIN_AGE}).</p>}
      </section>

      {/* ---------- Badge ---------- */}
      <section className="st-card st-rise" style={{ '--d': '240ms' }}>
        <header className="st-card-head">
          <span className="st-ico"><Ico d={ICONS.shield} /></span>
          <div>
            <h2 className="st-h">Your badge</h2>
            <p className="st-sub">Shown beside your name across Shammah.</p>
          </div>
        </header>
        {badge ? (
          <div className="st-badge-hero">
            <span className="st-badge-ring"><BadgeIcon badge={badge} size={28} /></span>
            <div className="st-badge-text">
              <b>{badge.label}{profile.badge_verified && <span className="st-verified"> · Verified</span>}</b>
              <span>{badge.desc}</span>
            </div>
            <span className="st-perm"><Ico d={ICONS.lock} size={13} /> Permanent</span>
          </div>
        ) : (
          <p className="st-hint">No badge yet.</p>
        )}
        {pending ? (
          <div className="st-lock">
            <Ico d={ICONS.shield} size={16} />
            <span>
              Change request pending: <b>{badgeById(pending.requested_badge)?.label || pending.requested_badge}</b>. The Shammah team will review it.
            </span>
          </div>
        ) : (
          <button type="button" className="st-btn st-btn-ghost" onClick={() => setReqOpen(true)}>
            Request a badge change
          </button>
        )}
      </section>

      {/* ---------- Account ---------- */}
      <section className="st-card st-rise" style={{ '--d': '300ms' }}>
        <header className="st-card-head">
          <span className="st-ico"><Ico d={ICONS.key} /></span>
          <div>
            <h2 className="st-h">Account</h2>
            <p className="st-sub">
              {session.user.email}
              {provider && provider !== 'email' ? ` · signed in with ${provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : provider}` : ''}
            </p>
          </div>
        </header>
        <button type="button" className="st-btn st-btn-danger" onClick={signOut}>Log out</button>
      </section>

      {/* ---------- Save bar ---------- */}
      <div className={`st-savebar${dirty ? ' show' : ''}`} role="region" aria-live="polite" aria-hidden={!dirty}>
        <span className="st-savebar-text">You have unsaved changes</span>
        <div className="st-savebar-actions">
          <button type="button" className="st-btn st-btn-plain" onClick={discard} disabled={saving} tabIndex={dirty ? 0 : -1}>Discard</button>
          <button type="button" className="st-btn st-btn-primary" onClick={save} disabled={!canSave} tabIndex={dirty ? 0 : -1}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`st-toast ${toast.type}`} role="status">
          {toast.text}
        </div>
      )}

      {reqOpen && (
        <BadgeRequestModal
          current={profile.badge}
          uid={uid}
          onClose={() => setReqOpen(false)}
          onSent={(req) => {
            setPending(req);
            setReqOpen(false);
            notify('success', 'Request sent. We will get back to you.');
          }}
          onError={(m) => notify('error', m)}
        />
      )}
    </div>
  );
}

function BadgeRequestModal({ current, uid, onClose, onSent, onError }) {
  const options = BADGES.filter((b) => b.id !== current);
  const [target, setTarget] = useState(options[0]?.id || '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = target && reason.trim().length >= 10;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    if (!valid) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('badge_requests')
      .insert({ user_id: uid, current_badge: current, requested_badge: target, reason: reason.trim() })
      .select('id, requested_badge, created_at')
      .single();
    setBusy(false);
    if (error) {
      onError(error.message.includes('one_pending') ? 'You already have a request waiting for review.' : error.message);
      return;
    }
    onSent(data);
  }

  return (
    <div className="st-modal-back" onClick={onClose}>
      <div className="st-modal" role="dialog" aria-modal="true" aria-labelledby="st-req-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="st-req-title" className="st-h">Request a badge change</h3>
        <p className="st-sub">Badges are permanent, so changes are reviewed personally by the Shammah team.</p>
        <label className="st-label" htmlFor="st-req-badge">New badge</label>
        <select id="st-req-badge" className="st-input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {options.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
        <label className="st-label" htmlFor="st-req-reason">Why should it change?</label>
        <textarea id="st-req-reason" className="st-input st-textarea" rows={4} maxLength={500} value={reason} placeholder="For example: I was ordained in June 2026 and now serve as a pastor at…" onChange={(e) => setReason(e.target.value)} />
        <p className="st-counter">{reason.trim().length < 10 ? 'At least 10 characters' : `${reason.length}/500`}</p>
        <div className="st-modal-actions">
          <button type="button" className="st-btn st-btn-plain" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="st-btn st-btn-primary" onClick={submit} disabled={!valid || busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </div>
    </div>
  );
}
