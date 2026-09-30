'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { DENOMINATIONS, DESCRIPTION_MAX, cleanWebsite } from '../lib/churchConfig';
import { prepareImage } from '../lib/imageTools';
import { initials } from '../lib/postDisplay';
import LocationPicker from './LocationPicker';

// One form for both "Start a church" (church = null) and "Edit church" (church = existing row).
export default function ChurchForm({ session, profile, church = null, onProfileChanged }) {
  const router = useRouter();
  const editing = !!church;

  const [name, setName] = useState(church?.name || '');
  const [denomination, setDenomination] = useState(church?.denomination || '');
  const [description, setDescription] = useState(church?.description || '');
  const [website, setWebsite] = useState(church?.website || '');
  const [location, setLocation] = useState(
    church?.location_label
      ? { label: church.location_label, placeId: church.location_place_id, lat: church.location_lat, lng: church.location_lng }
      : null
  );

  // Pictures: `logo`/`cover` = a newly picked image { blob, previewUrl }; `removeX` = clear the saved one
  const [logo, setLogo] = useState(null);
  const [cover, setCover] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const logoSrc = logo ? logo.previewUrl : removeLogo ? null : church?.logo_url;
  const coverSrc = cover ? cover.previewUrl : removeCover ? null : church?.cover_url;

  async function pick(kind, file) {
    if (!file) return;
    setError('');
    try {
      if (kind === 'logo') {
        setLogo(await prepareImage(file, { width: 512, height: 512 }));
        setRemoveLogo(false);
      } else {
        setCover(await prepareImage(file, { width: 1500, height: 500 }));
        setRemoveCover(false);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function upload(churchId, kind, item) {
    const path = `${churchId}/${kind}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('church-media')
      .upload(path, item.blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (upErr) throw new Error(upErr.message);
    // "?v=" makes browsers fetch the new picture instead of showing the old cached one
    return `${supabase.storage.from('church-media').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 80) return setError('The church name needs 2–80 characters.');
    const site = cleanWebsite(website);
    if (site === null) return setError('That website address doesn’t look right. Try something like mychurch.org');

    setBusy(true);
    const fields = {
      name: cleanName,
      denomination: denomination || null,
      description: description.trim() || null,
      website: site || null,
      location_label: location?.label || null,
      location_place_id: location?.placeId || null,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
    };

    try {
      // 1. Save the text details first (for a new church this creates the row and gives us its id)
      let churchId = church?.id;
      if (editing) {
        const { error: upErr } = await supabase.from('churches').update(fields).eq('id', churchId);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { data, error: insErr } = await supabase
          .from('churches')
          .insert({ ...fields, created_by: session.user.id })
          .select('id')
          .single();
        if (insErr) throw new Error(insErr.message);
        churchId = data.id;
      }

      // 2. Then the pictures. A failed upload shouldn't lose the church we just saved.
      const pictureUpdate = {};
      let pictureFailed = false;
      try {
        if (logo) pictureUpdate.logo_url = await upload(churchId, 'logo', logo);
        else if (removeLogo) pictureUpdate.logo_url = null;
        if (cover) pictureUpdate.cover_url = await upload(churchId, 'cover', cover);
        else if (removeCover) pictureUpdate.cover_url = null;
        if (Object.keys(pictureUpdate).length) {
          const { error: picErr } = await supabase.from('churches').update(pictureUpdate).eq('id', churchId);
          if (picErr) throw new Error(picErr.message);
        }
      } catch {
        pictureFailed = true;
      }

      // 3. A brand-new church: make the creator a member, unless they already belong to another one
      if (!editing && !profile?.church_id) {
        const { error: joinErr } = await supabase.from('profiles').update({ church_id: churchId }).eq('id', session.user.id);
        if (!joinErr && onProfileChanged) onProfileChanged();
      }

      router.push(`/churches/${churchId}${pictureFailed ? '?imgfail=1' : ''}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form className="cx-form" onSubmit={handleSubmit}>
      {/* ---------- Pictures ---------- */}
      <div className="cx-photo-stage">
        <label className="cx-cover-pick" aria-label="Choose cover picture">
          {coverSrc ? <img src={coverSrc} alt="" /> : <span className="cx-cover-empty"><b>+</b> Add a cover picture</span>}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pick('cover', e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <label className="cx-logo-pick" aria-label="Choose church logo">
          {logoSrc ? <img src={logoSrc} alt="" /> : <span>{name.trim() ? initials(name) : '⛪'}</span>}
          <i className="cx-logo-cam" aria-hidden="true">＋</i>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { pick('logo', e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      {(coverSrc || logoSrc) && (
        <div className="cx-remove-row">
          {logoSrc && <button type="button" className="cx-link" onClick={() => { setLogo(null); setRemoveLogo(true); }}>Remove logo</button>}
          {coverSrc && <button type="button" className="cx-link" onClick={() => { setCover(null); setRemoveCover(true); }}>Remove cover</button>}
        </div>
      )}

      {/* ---------- Details ---------- */}
      <label className="cx-field">
        <span className="cx-label">Church name</span>
        <input className="onb-input" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Grace Chapel Nairobi" required />
      </label>

      <label className="cx-field">
        <span className="cx-label">Denomination <span className="onb-opt">(optional)</span></span>
        <select className="onb-input" value={denomination} onChange={(e) => setDenomination(e.target.value)}>
          <option value="">Choose…</option>
          {DENOMINATIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>

      <label className="cx-field">
        <span className="cx-label">About the church <span className="onb-opt">(optional)</span></span>
        <textarea
          className="onb-input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
          placeholder="Who you are, when you meet, what you love to do together…"
        />
        <span className={`cx-counter${description.length > DESCRIPTION_MAX - 40 ? ' cx-counter-warn' : ''}`}>
          {description.length}/{DESCRIPTION_MAX}
        </span>
      </label>

      <div className="cx-field">
        <span className="cx-label">Location <span className="onb-opt">(optional)</span></span>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      <label className="cx-field">
        <span className="cx-label">Website <span className="onb-opt">(optional)</span></span>
        <input className="onb-input" type="text" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={120} placeholder="mychurch.org" />
      </label>

      {error && <p className="auth-message" role="alert">{error}</p>}

      <button type="submit" className="auth-primary" disabled={busy || !name.trim()}>
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Create church'}
      </button>
      {!editing && (
        <p className="cx-note">You’ll be the church’s owner and can edit these details any time.</p>
      )}
    </form>
  );
}
