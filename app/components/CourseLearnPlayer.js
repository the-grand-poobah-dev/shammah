'use client';
import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Award,
  BookOpen,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function CourseLearnPlayer({
  course,
  initialLessonId,
  session,
  userProfile,
  onBack,
  onCourseUpdated,
}) {
  const allLessons = course.modules?.flatMap((m) => m.lessons || []) || [
    {
      id: 'lesson-1',
      title: 'The Authority of the Believer',
      content: `The foundation of Christian authority is rooted in Christ's finished work at Calvary. In Ephesians 1:19-23, Paul writes that God raised Christ from the dead and seated Him at His right hand in heavenly places, far above all rule and authority. 

Key Scripture: Luke 10:19 — "Behold, I have given you authority to tread on serpents and scorpions, and over all the power of the enemy, and nothing shall hurt you."

Reflection Question: In what area of your life do you need to actively exercise the authority of Jesus' name today?`,
    },
    {
      id: 'lesson-2',
      title: 'Abiding in Prayer & Word',
      content: `Jesus said: "If you abide in Me, and My words abide in you, you will ask what you desire, and it shall be done for you." (John 15:7). Prayer is not a religious duty; it is communion with the Father.

Daily Habit: Spend 15 minutes in Scripture meditation before opening social media or work messages.`,
    },
  ];

  const [currentLessonIdx, setCurrentLessonIdx] = useState(() => {
    const found = allLessons.findIndex((l) => l.id === initialLessonId);
    return found >= 0 ? found : 0;
  });

  const [completedSet, setCompletedSet] = useState(
    () => new Set(course.completedLessonIds || [])
  );

  const activeLesson = allLessons[currentLessonIdx] || allLessons[0];

  const handleMarkComplete = () => {
    playSound('reaction');
    const nextSet = new Set(completedSet);
    nextSet.add(activeLesson.id);
    setCompletedSet(nextSet);

    if (onCourseUpdated) {
      onCourseUpdated({
        completedLessonIds: Array.from(nextSet),
      });
    }

    if (currentLessonIdx < allLessons.length - 1) {
      setCurrentLessonIdx((prev) => prev + 1);
    }
  };

  return (
    <div className="course-learn-player p-3 sm:p-5 max-w-4xl mx-auto space-y-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[var(--ink)] hover:text-[var(--teal)] transition-colors min-h-[44px]"
        >
          <ArrowLeft size={18} />
          <span>Exit Lesson</span>
        </button>

        <span className="text-xs font-semibold text-[var(--ink-muted)]">
          Lesson {currentLessonIdx + 1} of {allLessons.length}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-[var(--border)] pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
            {course.title}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] mt-1">
            {activeLesson?.title}
          </h1>
        </div>

        {/* Lesson Body */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line">
          {activeLesson?.content || (
            <div>
              <p>Welcome to this interactive lesson on {activeLesson?.title}.</p>
              <p className="mt-4">
                Take time to meditate on the Word, reflect on how this applies to your daily life, and discuss insights with your church small group or community forum.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentLessonIdx === 0}
            onClick={() => setCurrentLessonIdx((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium disabled:opacity-30 min-h-[44px]"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={handleMarkComplete}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm shadow-md transition-transform active:scale-95 min-h-[44px] ${
              completedSet.has(activeLesson.id)
                ? 'bg-emerald-600 text-white'
                : 'bg-[var(--teal)] text-white'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>
              {completedSet.has(activeLesson.id) ? 'Completed' : 'Mark as Complete'}
            </span>
          </button>

          <button
            type="button"
            disabled={currentLessonIdx >= allLessons.length - 1}
            onClick={() => setCurrentLessonIdx((prev) => Math.min(allLessons.length - 1, prev + 1))}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-medium disabled:opacity-30 min-h-[44px]"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
