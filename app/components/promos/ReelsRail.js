'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clapperboard,
  ChevronRight,
  Play,
  Eye,
  Film,
  Sparkles,
} from 'lucide-react';
import Avatar from '../Avatar';
import ReelViewerModal from '../ReelViewerModal';
import { ScrollAffordanceControls } from '../ScrollAffordance';
import { playSound } from '../../lib/soundEffects';
import { fetchHomePromos, trackPromoEvent } from '../../lib/promos/promosApi';

export default function ReelsRail({
  initialReels = null,
  title = 'Reels & Testimonies',
  seeAllHref = '/reels',
  onSeeAll = null,
  session = null,
  currentUser = null,
  className = '',
}) {
  const router = useRouter();
  const [reels, setReels] = useState(initialReels);
  const [loading, setLoading] = useState(!initialReels);
  const [selectedReelIndex, setSelectedReelIndex] = useState(null);
  const scrollRef = useRef(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false });

  useEffect(() => {
    if (initialReels && initialReels.length > 0) {
      setReels(initialReels);
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchHomePromos(session?.user?.id).then((data) => {
      if (isMounted) {
        if (data?.reels && data.reels.length > 0) {
          setReels(data.reels);
        }
        setLoading(false);
      }
    });

    const onReelCreated = () => {
      fetchHomePromos(session?.user?.id).then((data) => {
        if (isMounted && data?.reels) setReels(data.reels);
      });
    };

    window.addEventListener('shammah:reel-created', onReelCreated);
    return () => {
      isMounted = false;
      window.removeEventListener('shammah:reel-created', onReelCreated);
    };
  }, [initialReels, session?.user?.id]);

  // Pointer drag-to-scroll support
  function handlePointerDown(e) {
    if (!scrollRef.current) return;
    dragRef.current.isDown = true;
    dragRef.current.hasMoved = false;
    dragRef.current.startX = e.pageX - scrollRef.current.offsetLeft;
    dragRef.current.scrollLeft = scrollRef.current.scrollLeft;
  }

  function handlePointerMove(e) {
    if (!dragRef.current.isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragRef.current.startX) * 1.4;
    if (Math.abs(walk) > 4) {
      dragRef.current.hasMoved = true;
    }
    scrollRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  }

  function handlePointerUp() {
    dragRef.current.isDown = false;
  }

  function handleReelClick(index, reel) {
    if (dragRef.current.hasMoved) {
      dragRef.current.hasMoved = false;
      return;
    }
    playSound('reaction');
    trackPromoEvent('reels_rail', 'click', { reel_id: reel.id });
    setSelectedReelIndex(index);
  }

  function handleHeaderAction() {
    playSound('reaction');
    trackPromoEvent('reels_rail', 'click', { action: 'see_all' });
    if (onSeeAll) {
      onSeeAll();
    } else {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'reels' }));
      router.push(seeAllHref);
    }
  }

  return (
    <section
      className={`reels-rail-widget my-3 w-full overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-3.5 sm:p-4 text-[var(--ink)] shadow-sm ${className}`}
      aria-label="Gospel Reels rail"
    >
      {/* Header with Clapperboard Icon, Title and Arrow Button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Clapperboard size={16} strokeWidth={2.4} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)] leading-tight">{title}</h3>
            <span className="text-[11px] text-[var(--ink-muted)]">Vertical videos &amp; testimonies</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleHeaderAction}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
          aria-label="See all reels"
        >
          <span>All Reels</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Rail Container with Edge Fades & Drag Scroll */}
      <div className="relative group">
        <ScrollAffordanceControls targetRef={scrollRef} direction="horizontal" />

        {/* Edge Fade Shadows */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--surface)] to-transparent z-10 opacity-70" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--surface)] to-transparent z-10 opacity-70" />

        {loading ? (
          /* Skeleton State */
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className="w-[124px] sm:w-[140px] aspect-[9/16] rounded-[18px] bg-[var(--surface-muted,#262626)] animate-pulse shrink-0 border border-[var(--border)]"
              />
            ))}
          </div>
        ) : !reels || reels.length === 0 ? (
          /* Empty State */
          <div className="py-6 text-center text-xs text-[var(--ink-muted)] flex flex-col items-center gap-2">
            <Film size={24} className="opacity-40" />
            <span>No reels posted yet today. Be the first to share!</span>
          </div>
        ) : (
          /* 9:16 Cards Horizontal Rail */
          <div
            ref={scrollRef}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {reels.map((reel, idx) => (
              <div
                key={reel.id || idx}
                role="button"
                tabIndex={0}
                className="relative w-[124px] sm:w-[140px] aspect-[9/16] rounded-[18px] overflow-hidden shrink-0 border border-[var(--border)] group/card shadow-sm hover:shadow-md transition-all active:scale-[0.98] bg-black"
                onClick={() => handleReelClick(idx, reel)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleReelClick(idx, reel);
                  }
                }}
              >
                {/* Background Image / Thumbnail with Fallback */}
                <img
                  src={reel.thumbnail || reel.thumb_url || '/assets/aistudio/pic_4e5732f2.png'}
                  alt={reel.title || 'Reel'}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* 3-Tier Gradient Scrim (darkened bottom & top for high readability) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

                {/* Top Badge: View Count & Duration */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] text-white font-medium pointer-events-none">
                  <span className="px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm flex items-center gap-1 font-semibold">
                    <Eye size={10} /> {reel.views || 0}
                  </span>
                  {reel.duration && (
                    <span className="px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                      {reel.duration}
                    </span>
                  )}
                </div>

                {/* Center Play Circle Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <span className="w-10 h-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform">
                    <Play size={16} fill="#ffffff" />
                  </span>
                </div>

                {/* Bottom Details: Creator Avatar & Title */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 text-white pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <Avatar
                      name={reel.creator || 'Creator'}
                      src={reel.creator_avatar}
                      className="avatar-xs shrink-0 !w-5 !h-5 !text-[9px]"
                    />
                    <span className="text-[11px] font-semibold truncate leading-tight">
                      {reel.creator || 'Believer'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/90 font-medium line-clamp-2 leading-tight">
                    {reel.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal Viewer */}
      {selectedReelIndex !== null && (
        <ReelViewerModal
          reels={reels}
          initialIndex={selectedReelIndex}
          currentUser={currentUser}
          session={session}
          onClose={() => setSelectedReelIndex(null)}
        />
      )}
    </section>
  );
}
