'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  ArrowLeft,
  User,
  Shield,
  Bell,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Check,
  Lock,
  Mail,
  MapPin,
  Church,
  LogOut,
  Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getProfileSettings, updateProfileSettings } from '../lib/profileManager';
import { isSoundEnabled, setSoundEnabled, playSound } from '../lib/soundEffects';

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [churchName, setChurchName] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [inboxPermission, setInboxPermission] = useState('everyone');
  const [dark, setDark] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    const isDark = document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('theme-dark');
    setDark(isDark);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        const uid = data.session.user.id;
        const localSettings = getProfileSettings(uid);
        setIsLocked(localSettings.isLocked);
        setInboxPermission(localSettings.inboxPermission || 'everyone');

        supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) {
              setProfile(prof);
              setDisplayName(prof.display_name || '');
              setAbout(prof.about || '');
              setLocationLabel(prof.location_label || '');
              setChurchName(prof.church_name || '');
              if (prof.is_locked !== undefined) setIsLocked(Boolean(prof.is_locked));
              if (prof.inbox_permission) setInboxPermission(prof.inbox_permission);
            }
          });
      }
    });
  }, []);

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound('alert');
  }

  function handleToggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('theme-dark');
      localStorage.setItem('shammah_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('theme-dark');
      localStorage.setItem('shammah_theme', 'light');
    }
    playSound('reaction');
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    try {
      const uid = session.user.id;
      await updateProfileSettings(uid, { isLocked, inboxPermission });

      await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          about: about.trim(),
          location_label: locationLabel.trim(),
          church_name: churchName.trim(),
          is_locked: isLocked,
          inbox_permission: inboxPermission,
        })
        .eq('id', uid);

      setSavedSuccess(true);
      playSound('success');
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Error updating settings:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    playSound('reaction');
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <main className="shell">
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to feed"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>Profile Settings</h1>
              <span className="brand-subtext">Preferences &amp; Privacy</span>
            </div>
          </div>
        </header>
      </div>

      <div className="cx-page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {savedSuccess && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--teal)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Check size={18} />
            <span>Profile settings saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile Identity Card */}
          <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} className="text-teal" />
              <span>Public Identity</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Display Name
              </label>
              <input
                type="text"
                className="inst-search-field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name or fellowship moniker"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Faith Testimony &amp; Bio
              </label>
              <textarea
                className="inst-search-field"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Share your testimony, life verse, or ministry focus…"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Town or County
                </label>
                <input
                  type="text"
                  className="inst-search-field"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  placeholder="e.g. Nairobi, Kenya"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Local Church Fellowship
                </label>
                <input
                  type="text"
                  className="inst-search-field"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="e.g. CITAM Valley Road"
                />
              </div>
            </div>
          </div>

          {/* Privacy & Direct Messages */}
          <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={18} className="text-teal" />
              <span>Privacy &amp; Permissions</span>
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 13, display: 'block' }}>Private Profile Mode</strong>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  Only members who follow you can view your detailed fellowship overview
                </span>
              </div>
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Direct Messaging Permission
              </label>
              <select
                className="inst-search-field"
                value={inboxPermission}
                onChange={(e) => setInboxPermission(e.target.value)}
              >
                <option value="everyone">Everyone can message me</option>
                <option value="followers">Followers only</option>
                <option value="church">Same church fellowship members only</option>
                <option value="none">Nobody (Disable direct messages)</option>
              </select>
            </div>
          </div>

          {/* Application Display & Sound Preferences */}
          <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} className="text-teal" />
              <span>Display &amp; Sound</span>
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13, display: 'block' }}>Theme Mode</strong>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {dark ? 'Dark Neon Glass Mode' : 'Clean Light Gold Mode'}
                </span>
              </div>
              <button
                type="button"
                className="action-btn"
                onClick={handleToggleTheme}
                style={{ border: '1px solid var(--border)' }}
              >
                {dark ? <Moon size={16} /> : <Sun size={16} />}
                <span>{dark ? 'Dark' : 'Light'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13, display: 'block' }}>Sound Profiles</strong>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {soundOn ? 'Interactive audio feedback enabled' : 'Muted'}
                </span>
              </div>
              <button
                type="button"
                className="action-btn"
                onClick={handleToggleSound}
                style={{ border: '1px solid var(--border)' }}
              >
                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{soundOn ? 'On' : 'Muted'}</span>
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="signin-btn"
            disabled={saving}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 46,
              fontSize: 15,
            }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Changes…' : 'Save Settings'}</span>
          </button>

          {session && (
            <button
              type="button"
              onClick={handleSignOut}
              className="action-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--rose)',
                border: '1px solid var(--border)',
                minHeight: 42,
              }}
            >
              <LogOut size={16} />
              <span>Log out of Shammah</span>
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
