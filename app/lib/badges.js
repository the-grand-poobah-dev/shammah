// Member badges — chosen once at onboarding, locked afterward.
// Icons are simple emoji for zero dependency; swap for SVGs later if desired.

export const BADGES = [
  { id: 'believer', label: 'Believer', icon: '✝️', description: 'Following Christ' },
  { id: 'student', label: 'Student', icon: '📖', description: 'Growing in the Word' },
  { id: 'teacher', label: 'Teacher', icon: '💡', description: 'Teaching & discipling' },
  { id: 'missionary', label: 'Missionary', icon: '🌍', description: 'On the mission field' },
  { id: 'pastor', label: 'Pastor', icon: '🕊️', description: 'Shepherding a flock' },
  { id: 'bishop', label: 'Bishop', icon: '✝️', description: 'Overseeing churches' },
  { id: 'reverend', label: 'Reverend', icon: '🙏', description: 'Ordained minister' },
  { id: 'deacon', label: 'Deacon', icon: '🤝', description: 'Serving the body' },
  { id: 'elder', label: 'Elder', icon: '🌿', description: 'Church leadership' },
  { id: 'evangelist', label: 'Evangelist', icon: '📣', description: 'Spreading the Gospel' },
  { id: 'worship_leader', label: 'Worship Leader', icon: '🎵', description: 'Leading worship' },
  { id: 'volunteer', label: 'Volunteer', icon: '❤️', description: 'Serving with joy' },
];

export function getBadge(id) {
  if (!id) return null;
  return BADGES.find((b) => b.id === id) || { id, label: id, icon: '✦', description: '' };
}

/** Days remaining before the user can change their display name again. */
export function nameChangeDaysLeft(changedAt) {
  if (!changedAt) return 0;
  const then = new Date(changedAt).getTime();
  if (Number.isNaN(then)) return 0;
  const unlock = then + 90 * 24 * 60 * 60 * 1000;
  const left = Math.ceil((unlock - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, left);
}
