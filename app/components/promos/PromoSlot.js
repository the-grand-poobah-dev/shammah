'use client';
import { useState, useEffect, useRef } from 'react';
import { X, EyeOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  fetchHomePromos,
  isPromoDismissed,
  dismissPromo,
  getSessionShownPromos,
  recordSessionShownPromo,
  trackPromoEvent,
} from '../../lib/promos/promosApi';
import LiveNowCard from './LiveNowCard';
import FeaturedCourseCard from './FeaturedCourseCard';
import ActiveFundraiserCard from './ActiveFundraiserCard';
import ChallengeOfTheDayCard from './ChallengeOfTheDayCard';
import DailyVerseCard from './DailyVerseCard';
import ContinueListeningCard from './ContinueListeningCard';
import TrendingPollCard from './TrendingPollCard';
import ArcadeDailyCard from './ArcadeDailyCard';

const PROMO_ORDER = [
  'live',
  'course',
  'fundraiser',
  'challenge',
  'verse',
  'poll',
  'audio',
  'arcade',
];

export default function PromoSlot({
  position = 0,
  userId = null,
  className = '',
}) {
  const [promoData, setPromoData] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const hasTrackedImpression = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const data = await fetchHomePromos(userId);
      if (!isMounted || !data) return;
      setPromoData(data);

      // Determine eligible types that have valid content and are NOT dismissed
      const eligible = PROMO_ORDER.filter((type) => {
        if (isPromoDismissed(type)) return false;
        if (type === 'live') return Boolean(data.live);
        if (type === 'course') return Boolean(data.course);
        if (type === 'fundraiser') return Boolean(data.fundraiser);
        if (type === 'challenge') return Boolean(data.challenge);
        if (type === 'verse') return Boolean(data.verse);
        if (type === 'poll') return Boolean(data.poll);
        if (type === 'audio') return Boolean(data.audio);
        if (type === 'arcade') return Boolean(data.arcade);
        return false;
      });

      if (eligible.length === 0) {
        setSelectedType(null);
        return;
      }

      // Max 5 promos per session
      const shownThisSession = getSessionShownPromos();
      const pickIndex = position % eligible.length;
      const candidate = eligible[pickIndex];

      if (shownThisSession.length >= 5 && !shownThisSession.includes(candidate)) {
        setSelectedType(null);
        return;
      }

      setSelectedType(candidate);
      recordSessionShownPromo(candidate);
    }

    load();

    const onDismissed = (e) => {
      if (e.detail?.promoType === selectedType) {
        setIsDismissed(true);
      }
    };
    window.addEventListener('shammah:promo-dismissed', onDismissed);
    return () => {
      isMounted = false;
      window.removeEventListener('shammah:promo-dismissed', onDismissed);
    };
  }, [position, userId, selectedType]);

  // Track impression once when candidate is selected
  useEffect(() => {
    if (selectedType && !hasTrackedImpression.current && !isDismissed) {
      hasTrackedImpression.current = true;
      trackPromoEvent(selectedType, 'impression', { position });
    }
  }, [selectedType, isDismissed, position]);

  if (!selectedType || !promoData || isDismissed) {
    return null;
  }

  function handleDismiss(e) {
    e.stopPropagation();
    setIsDismissed(true);
    dismissPromo(selectedType);
  }

  // Render appropriate widget
  let widgetContent = null;
  switch (selectedType) {
    case 'live':
      widgetContent = <LiveNowCard stream={promoData.live} />;
      break;
    case 'course':
      widgetContent = <FeaturedCourseCard course={promoData.course} />;
      break;
    case 'fundraiser':
      widgetContent = <ActiveFundraiserCard fundraiser={promoData.fundraiser} />;
      break;
    case 'challenge':
      widgetContent = <ChallengeOfTheDayCard challenge={promoData.challenge} />;
      break;
    case 'verse':
      widgetContent = <DailyVerseCard verse={promoData.verse} />;
      break;
    case 'poll':
      widgetContent = <TrendingPollCard poll={promoData.poll} />;
      break;
    case 'audio':
      widgetContent = <ContinueListeningCard audio={promoData.audio} />;
      break;
    case 'arcade':
      widgetContent = <ArcadeDailyCard arcade={promoData.arcade} />;
      break;
    default:
      widgetContent = null;
  }

  if (!widgetContent) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`promo-slot-container relative my-3 w-full group/promo ${className}`}
      role="region"
      aria-label="Community highlight"
    >
      {/* Dismiss Button (Top-Right corner of card) */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover/promo:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full bg-[var(--surface,#18181b)] border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted,#262626)] shadow-sm transition-all text-[11px] flex items-center gap-1"
          title="Not interested (hide for 7 days)"
          aria-label="Hide this recommendation for 7 days"
        >
          <X size={13} />
        </button>
      </div>

      {widgetContent}
    </motion.div>
  );
}
