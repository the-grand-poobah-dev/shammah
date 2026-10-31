'use client';
import React, { useState } from 'react';
import PopupSheet from './PopupSheet';
import { BookOpen, Plus, Sparkles, Check, Trash2 } from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export default function CourseCreatorModal({
  isOpen,
  onClose,
  initialCourse,
  initialMode = 'create',
  session,
  userProfile,
  onCourseSaved,
  onOpenCourse,
}) {
  const [title, setTitle] = useState(initialCourse?.title || '');
  const [description, setDescription] = useState(initialCourse?.description || '');
  const [category, setCategory] = useState(initialCourse?.category || 'Discipleship');
  const [difficulty, setDifficulty] = useState(initialCourse?.difficulty || 'Beginner');
  const [estimatedHours, setEstimatedHours] = useState(initialCourse?.estimatedHours || 2);
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      playSound('button');
      const newCourse = {
        id: initialCourse?.id || `course-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        estimatedHours: Number(estimatedHours) || 2,
        instructor: userProfile?.full_name || 'Ministry Instructor',
        instructorTitle: userProfile?.church_name || 'Shammah Ministry Faculty',
        modules: initialCourse?.modules || [
          {
            id: 'mod-1',
            title: 'Module 1: Foundations',
            lessons: [
              { id: `l-${Date.now()}`, title: 'Lesson 1: Introduction and Biblical Mandate', duration: 15 },
            ],
          },
        ],
        completedLessonIds: initialCourse?.completedLessonIds || [],
      };

      if (onCourseSaved) {
        onCourseSaved(newCourse);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <PopupSheet
      open={isOpen}
      onClose={onClose}
      title={initialCourse ? 'Edit Academy Course' : 'Create Discipleship Course'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Course Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Believers: Foundations of Faith"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
            Description &amp; Objectives
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will believers learn through this curriculum?"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            >
              <option value="Discipleship">Discipleship</option>
              <option value="Prayer & Intercession">Prayer & Intercession</option>
              <option value="Leadership">Leadership</option>
              <option value="Bible Study">Bible Study</option>
              <option value="Stewardship">Stewardship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-muted)] mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="px-5 py-2 rounded-full bg-[var(--teal)] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
          >
            {busy ? 'Saving...' : initialCourse ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </form>
    </PopupSheet>
  );
}
