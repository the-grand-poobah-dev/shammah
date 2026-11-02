'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, Signal, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function LiveNowCard() {
  const [streams, setStreams] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/live', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) { setAvailable(true); setStreams(payload.streams || []); }
    } catch {}
    finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase.channel('shammah-live-now')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 20000);
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [refresh]);

  function openLiveComposer() {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('shammah:open-live'));
  }

  if (!loaded || !available) return null;
  return (
    <section className="sh-live-now-card" aria-label="Live broadcasts">
      <header><div><span className="sh-live-now-mark"><Radio size={17} /></span><div><h2>Live Now</h2><p>Gather with the community in real time</p></div></div><span className="sh-live-now-total">{streams.length} live</span></header>
      {streams.length ? <div className="sh-live-now-list">{streams.map((stream) => (
        <Link href={'/live/' + stream.id} className="sh-live-now-item" key={stream.id}>
          <div className="sh-live-now-avatar">{stream.thumb_url ? <img src={stream.thumb_url} alt="" /> : stream.host?.avatar_url ? <img src={stream.host.avatar_url} alt="" /> : <Radio size={22} />}</div>
          <div className="sh-live-now-copy"><strong>{stream.title}</strong><span>{stream.host?.display_name || 'Shammah member'}</span><small><Signal size={12} /> {stream.viewer_count || 0} watching</small></div>
          <span className="sh-live-now-badge"><i /> LIVE</span>
        </Link>
      ))}</div> : <div className="sh-live-now-empty"><Sparkles size={19} /><span>No public broadcasts right now. You can start one for your community.</span><button type="button" onClick={openLiveComposer}>Go live</button></div>}
    </section>
  );
}
