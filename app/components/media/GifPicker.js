'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { uploadPostMedia } from '../../lib/mediaUpload';

const RECENT_KEY = 'shammah_recent_gifs_v1';
const TABS = ['Trending', 'Search', 'Recent', 'Upload'];

export default function GifPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState('Trending');
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 24)); } catch {}
  }, []);

  useEffect(() => {
    if (tab !== 'Trending' && tab !== 'Search') return;
    if (tab === 'Search' && !query.trim()) { setGifs([]); setError('Search for a reaction or moment.'); return; }
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const endpoint = tab === 'Trending' ? '/api/gifs/trending?limit=24' : '/api/gifs/search?q=' + encodeURIComponent(query.trim()) + '&limit=24';
        const response = await fetch(endpoint, { signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 503 || /not configured/i.test(payload.error || '')) setConfigured(false);
          throw new Error(payload.error || 'GIFs are temporarily unavailable.');
        }
        if (!cancelled) { setConfigured(true); setGifs(payload.data || []); }
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') { setGifs([]); setError(err.message || 'GIFs are temporarily unavailable.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [tab, query]);

  useEffect(() => {
    if (!configured && tab !== 'Upload') setTab('Upload');
  }, [configured, tab]);

  function chooseGif(gif) {
    const selection = {
      ...gif,
      type: 'gif',
      kind: 'gif',
      media_type: 'gif',
      media_url: gif.url,
      url: gif.url,
      previewUrl: gif.previewUrl || gif.url,
    };
    try {
      const items = [selection, ...recent.filter((item) => item.id !== selection.id)].slice(0, 24);
      localStorage.setItem(RECENT_KEY, JSON.stringify(items));
      setRecent(items);
    } catch {}
    onSelect?.(selection);
    onClose?.();
  }

  async function uploadGif(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'image/gif' && !/\.gif$/i.test(file.name)) {
      setError('Choose an animated .gif file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('GIFs must be 10 MB or smaller.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Sign in before uploading a GIF.');
      const uploaded = await uploadPostMedia(file, session.user.id);
      chooseGif({ id: 'upload-' + Date.now(), title: file.name, url: uploaded.url, previewUrl: uploaded.url, width: 0, height: 0, provider: 'upload', attribution: '' });
    } catch (err) {
      setError(err.message || 'GIF upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const visibleTabs = configured ? TABS : ['Upload'];
  const items = tab === 'Recent' ? recent : gifs;

  return (
    <div className="sh-gif-backdrop" role="dialog" aria-modal="true" aria-label="Choose a GIF">
      <section className="sh-gif-picker">
        <header className="sh-gif-header"><div><strong>Choose a GIF</strong><span>Make your post expressive</span></div><button type="button" onClick={onClose} aria-label="Close GIF picker"><X size={20} /></button></header>
        <nav className="sh-gif-tabs" aria-label="GIF picker tabs">{visibleTabs.map((name) => <button type="button" key={name} className={tab === name ? 'active' : ''} onClick={() => { setTab(name); setError(''); }}>{name === 'Upload' ? <Upload size={15} /> : name === 'Search' ? <Search size={15} /> : null}{name}</button>)}</nav>
        {tab === 'Search' && <form className="sh-gif-search" onSubmit={(event) => { event.preventDefault(); }}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GIFs…" aria-label="Search GIFs" maxLength={80} /></form>}
        {tab === 'Upload' ? <div className="sh-gif-upload"><Upload size={28} /><strong>Upload your own GIF</strong><p>Animated GIF files up to 10 MB.</p><label className="sh-gif-upload-button">{uploading ? <><Loader2 className="sh-spin" size={17} /> Uploading…</> : 'Choose GIF'}<input type="file" accept=".gif,image/gif" disabled={uploading} onChange={uploadGif} /></label></div> :
          tab === 'Recent' ? <div className="sh-gif-grid">{items.length ? items.map((gif) => <button key={gif.id} type="button" onClick={() => chooseGif(gif)} aria-label={'Choose ' + (gif.title || 'GIF')}><img src={gif.previewUrl || gif.url} alt={gif.title || 'GIF'} loading="lazy" /></button>) : <p className="sh-gif-empty">GIFs you choose will appear here.</p>}</div> :
          <div className="sh-gif-results">{loading ? <div className="sh-gif-empty"><Loader2 className="sh-spin" size={22} /> Loading GIFs…</div> : items.length ? <div className="sh-gif-grid">{items.map((gif) => <button key={gif.id} type="button" onClick={() => chooseGif(gif)} aria-label={'Choose ' + (gif.title || 'GIF')}><img src={gif.previewUrl || gif.url} alt={gif.title || 'GIF'} loading="lazy" /></button>)}</div> : <p className="sh-gif-empty">{error || 'No GIFs found. Try another search.'}</p>}</div>}
        {error && tab === 'Upload' && <p className="sh-gif-error" role="alert">{error}</p>}
        {configured && tab !== 'Upload' && <footer className="sh-gif-attribution">Powered by GIPHY</footer>}
      </section>
    </div>
  );
}
