'use client';
import { useRouter } from 'next/navigation';
import { GraduationCap, BookOpen, Clock, ChevronRight } from 'lucide-react';
import AccentCard from '../layoutkit/AccentCard';
import { playSound } from '../../lib/soundEffects';
import { trackPromoEvent } from '../../lib/promos/promosApi';

export default function FeaturedCourseCard({ course, onSelect = null }) {
  const router = useRouter();
  if (!course) return null;

  function handleClick() {
    playSound('reaction');
    trackPromoEvent('featured_course', 'click', { course_id: course.id });
    if (onSelect) {
      onSelect(course);
    } else {
      window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
      window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'courses' }));
      router.push('/courses');
    }
  }

  return (
    <AccentCard
      accent="#8b5cf6"
      variant="edge"
      className="p-3.5 sm:p-4 my-2.5 transition-all hover:scale-[1.005]"
      onClick={handleClick}
      role="button"
      aria-label={`Explore discipleship course: ${course.title}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Left: Thumbnail & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {course.cover_url && (
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[var(--border)] bg-black/40">
              <img
                src={course.cover_url}
                alt={course.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                <GraduationCap size={11} />
                {course.tag || 'Discipleship Course'}
              </span>
              {course.instructor && (
                <span className="text-xs text-[var(--ink-muted)] truncate">
                  by {course.instructor}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[var(--ink)] truncate">
              {course.title}
            </h4>

            <div className="flex items-center gap-3 text-[11px] text-[var(--ink-muted)] mt-0.5">
              {course.lessons_count && (
                <span className="flex items-center gap-1">
                  <BookOpen size={11} /> {course.lessons_count} lessons
                </span>
              )}
              {course.duration_weeks && (
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {course.duration_weeks}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
        >
          <GraduationCap size={14} />
          <span>Learn</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </AccentCard>
  );
}
