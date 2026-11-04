'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clapperboard, Play } from 'lucide-react';
import { fetchPromoReels } from '../../lib/promoData';

export default function ReelsRail() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchPromoReels().then(data => {
      if (active) setItems(data || []);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (!loading && !items.length) return null;

  return (
    <section className="shammah-promo-reels" aria-label="Reels">
      <div className="shammah-promo-heading">
        <span className="shammah-promo-icon"><Clapperboard size={18} aria-hidden="true" /></span>
        <div><h2>Reels</h2><p>Stories from your community</p></div>
        <Link href="/reels" className="shammah-promo-see-all">See all <span aria-hidden="true">→</span></Link>
      </div>
      <div className="shammah-promo-reel-rail" aria-busy={loading}>
        {loading ? Array.from({ length: 4 }, (_, i) => <div key={i} className="shammah-promo-reel-skeleton" />) : items.map(item => (
          <Link key={item.id} href="/reels" className="shammah-promo-reel-card" aria-label={`Open reels, including ${item.profiles?.display_name || 'community reel'}`}>
            {item.media_url && <video src={item.media_url} muted playsInline preload="none" aria-hidden="true" />}
            <span className="shammah-promo-reel-shade" />
            <span className="shammah-promo-reel-play"><Play size={16} fill="currentColor" aria-hidden="true" /></span>
            <span className="shammah-promo-reel-caption">{item.text_content || item.profiles?.display_name || 'Community reel'}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
