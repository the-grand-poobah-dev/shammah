'use client';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, HeartHandshake, ChevronRight, Sparkles } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

/**
 * BibleVerseStrip
 * Embedded on sermon watch pages or audio listen pages to ground preaching in scripture.
 */
export function BibleVerseStrip({
  reference = 'Romans 8:28',
  text = 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
  theme = 'Sermon Scripture Foundation',
  className = '',
}) {
  const router = useRouter();

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('crosslink_verse_sermon', 'click', { reference });
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
    router.push('/?tab=home&section=bible');
  }

  return (
    <AccentCard
      accent="#06b6d4"
      variant="minimal"
      className={`p-3 sm:p-3.5 my-2.5 ${className}`}
      onClick={handleClick}
      role="button"
      aria-label={`Scripture foundation: ${reference}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
            <BookOpen size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                {theme}
              </span>
              <span className="text-xs font-bold text-[var(--ink)]">
                {reference}
              </span>
            </div>
            <p className="text-xs italic text-[var(--ink)] font-serif line-clamp-2 leading-relaxed m-0">
              “{text}”
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="shrink-0 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
        >
          <span>Read</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </AccentCard>
  );
}

/**
 * RelatedCoursesStrip
 * Embedded on Faith Challenges pages to suggest discipleship training for deeper spiritual growth.
 */
export function RelatedCoursesStrip({
  challengeTitle = 'Faith Challenge',
  course = {
    id: 'course-spiritual-disciplines',
    title: 'Spiritual Disciplines & Daily Victory',
    instructor: 'Discipleship Faculty',
    lessons: 6,
  },
  className = '',
}) {
  const router = useRouter();

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('crosslink_courses_challenge', 'click', { course_id: course.id });
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'courses' }));
    router.push('/courses');
  }

  return (
    <AccentCard
      accent="#8b5cf6"
      variant="edge"
      className={`p-3 sm:p-3.5 my-2.5 ${className}`}
      onClick={handleClick}
      role="button"
      aria-label={`Recommended course for ${challengeTitle}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <GraduationCap size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1">
              <Sparkles size={10} /> Deepen this Challenge in Discipleship Academy
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate mt-0.5">
              {course.title}
            </h4>
            <span className="text-[11px] text-[var(--ink-muted)]">
              {course.instructor} • {course.lessons} structured lessons
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="shrink-0 px-3 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1"
        >
          <span>Enroll</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </AccentCard>
  );
}

/**
 * ChurchFundraiserBanner
 * Embedded on Church Profiles or directories to highlight active church missions & building projects.
 */
export function ChurchFundraiserBanner({
  churchName = 'Church Sanctuary',
  fundraiser = {
    id: 'church-mission-fund',
    title: 'Church Mission & Community Outreach 2026',
    raised_kes: 120000,
    goal_kes: 300000,
  },
  className = '',
}) {
  const router = useRouter();
  const percent = Math.min(100, Math.round(((fundraiser.raised_kes || 0) / (fundraiser.goal_kes || 1)) * 100));

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('crosslink_fundraiser_church', 'click', { fundraiser_id: fundraiser.id });
    window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
    window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'fundraisers' }));
    router.push('/fundraisers');
  }

  return (
    <AccentCard
      accent="#10b981"
      variant="wash"
      className={`p-3 sm:p-3.5 my-2.5 ${className}`}
      onClick={handleClick}
      role="button"
      aria-label={`Active mission cause for ${churchName}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <HeartHandshake size={13} />
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              {churchName} Mission Cause
            </span>
          </div>

          <span className="text-xs font-bold text-emerald-400">
            {percent}% funded
          </span>
        </div>

        <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
          {fundraiser.title}
        </h4>

        <div className="w-full h-1.5 rounded-full bg-[var(--surface-muted,#262626)] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] pt-0.5">
          <span>KES {(fundraiser.raised_kes || 0).toLocaleString()} of KES {(fundraiser.goal_kes || 0).toLocaleString()}</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-0.5 hover:underline">
            <span>Sow via M-Pesa</span>
            <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </AccentCard>
  );
}
