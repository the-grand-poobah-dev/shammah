'use client';
import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Play,
  Share2,
  Users,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { ProgressBar } from './layoutkit';
import { playSound } from '../lib/soundEffects';

export default function CourseDetailView({
  course,
  session,
  userProfile,
  onBack,
  onStartLearning,
  onCourseUpdated,
}) {
  const [activeTab, setActiveTab] = useState('syllabus');

  const lessons = course.modules?.flatMap((m) => m.lessons || []) || [];
  const totalLessons = lessons.length || 8;
  const completedLessons = course.completedLessonIds?.length || 0;
  const progressPercent = Math.round((completedLessons / (totalLessons || 1)) * 100);

  const handleStart = (lessonId) => {
    playSound('button');
    if (onStartLearning) {
      onStartLearning(course, lessonId || lessons[0]?.id || 'lesson-1');
    }
  };

  return (
    <div className="courses-detail-container p-3 sm:p-5 max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-[var(--ink)] hover:text-[var(--teal)] transition-colors min-h-[44px]"
        >
          <ArrowLeft size={18} />
          <span>Back to Courses</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playSound('button');
            if (navigator.share) {
              navigator.share({
                title: course.title,
                text: course.description,
                url: window.location.href,
              });
            }
          }}
          className="p-2.5 rounded-full border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Share course"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-full bg-[var(--teal)]/15 text-[var(--teal)]">
            {course.category || 'Discipleship'}
          </span>
          <span className="text-[var(--ink-muted)]">•</span>
          <span className="text-[var(--ink-muted)]">{course.difficulty || 'All Levels'}</span>
          <span className="text-[var(--ink-muted)]">•</span>
          <span className="text-[var(--ink-muted)] flex items-center gap-1">
            <Clock size={13} /> {course.estimatedHours || 3} Hours
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">
          {course.title}
        </h1>

        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
          {course.description}
        </p>

        {/* Instructor */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 rounded-full bg-[var(--teal)]/20 text-[var(--teal)] flex items-center justify-center font-bold">
            {course.instructor?.[0] || 'P'}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {course.instructor || 'Pastor David Mwangi'}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              {course.instructorTitle || 'Shammah Academy Faculty'}
            </p>
          </div>
        </div>

        {/* Progress & CTA */}
        <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-xs font-medium text-[var(--ink-muted)] mb-1.5">
              <span>Course Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <ProgressBar value={progressPercent} color="teal" />
          </div>

          <button
            type="button"
            onClick={() => handleStart()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[var(--teal)] text-white font-semibold text-sm hover:opacity-95 transition-transform active:scale-95 shadow-md min-h-[44px]"
          >
            <Play size={16} fill="currentColor" />
            <span>{progressPercent > 0 ? 'Continue Learning' : 'Start Course'}</span>
          </button>
        </div>
      </div>

      {/* Curriculum / Syllabus */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--teal)]" />
          <span>Course Curriculum</span>
        </h2>

        <div className="space-y-3">
          {(course.modules && course.modules.length > 0 ? course.modules : [
            {
              id: 'm1',
              title: 'Module 1: Spiritual Foundations',
              lessons: [
                { id: 'l1', title: 'Lesson 1: The Authority of the Believer', duration: 15 },
                { id: 'l2', title: 'Lesson 2: Abiding in Prayer & Word', duration: 20 },
              ],
            },
            {
              id: 'm2',
              title: 'Module 2: Practical Kingdom Life',
              lessons: [
                { id: 'l3', title: 'Lesson 3: Walking in Supernatural Love', duration: 18 },
                { id: 'l4', title: 'Lesson 4: Stewardship & Generosity in Kenya', duration: 22 },
              ],
            },
          ]).map((mod, modIdx) => (
            <div
              key={mod.id || modIdx}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3.5 space-y-2"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                {mod.title}
              </h3>
              <div className="space-y-1.5">
                {(mod.lessons || []).map((l, lIdx) => (
                  <button
                    key={l.id || lIdx}
                    type="button"
                    onClick={() => handleStart(l.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface)] hover:border-[var(--sec-color)] border border-transparent transition-all text-left min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2
                        size={16}
                        className={
                          course.completedLessonIds?.includes(l.id)
                            ? 'text-emerald-500 flex-shrink-0'
                            : 'text-[var(--ink-muted)]/40 flex-shrink-0'
                        }
                      />
                      <span className="text-sm font-medium text-[var(--ink)] truncate">
                        {l.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] flex-shrink-0">
                      <Clock size={12} />
                      <span>{l.duration || 15}m</span>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
