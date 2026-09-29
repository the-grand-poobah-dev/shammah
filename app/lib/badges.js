// Member badges. The ids here must match the rows in the `badges` table
// (supabase/migrations/001_onboarding.sql). To add a badge: add it here AND
// run  insert into badges (id, label, sort_order) values (...)  in Supabase.
//
// Icons are 24x24 stroke paths (one or more `d` strings) drawn by <BadgeIcon />.

export const BADGE_GROUPS = [
  { id: 'community', label: 'Community' },
  { id: 'serving', label: 'Serving' },
  { id: 'ministry', label: 'Ministry & leadership' },
];

export const BADGES = [
  // ----- Community -----
  { id: 'believer', label: 'Believer', group: 'community', desc: 'Following Jesus and growing in faith.',
    icon: ['M12 3v18', 'M6 9h12'] },
  { id: 'seeker', label: 'Seeker', group: 'community', desc: 'Exploring the Christian faith.',
    icon: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M15.5 8.5l-2 5-5 2 2-5z'] },
  { id: 'student', label: 'Student', group: 'community', desc: 'Learning in school, college or Bible study.',
    icon: ['M2 9l10-5 10 5-10 5z', 'M6 11v5c3 2 9 2 12 0v-5'] },
  { id: 'intercessor', label: 'Intercessor', group: 'community', desc: 'Standing in the gap in prayer.',
    icon: ['M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.6A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z'] },

  // ----- Serving -----
  { id: 'teacher', label: 'Teacher', group: 'serving', desc: 'Teaching the Word (Sunday school, small groups, classes).',
    icon: ['M2 5h7a3 3 0 013 3v13a2 2 0 00-2-2H2z', 'M22 5h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z'] },
  { id: 'worship', label: 'Worship Leader', group: 'serving', desc: 'Leading God\u2019s people in worship and music.',
    icon: ['M9 18V5l12-2v13', 'M9 18a3 3 0 11-6 0 3 3 0 016 0z', 'M21 16a3 3 0 11-6 0 3 3 0 016 0z'] },
  { id: 'youth', label: 'Youth Leader', group: 'serving', desc: 'Discipling teens and young adults.',
    icon: ['M13 2L3 14h8l-1 8 10-12h-8z'] },
  { id: 'deacon', label: 'Deacon / Deaconess', group: 'serving', desc: 'Serving the church family.',
    icon: ['M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z'] },
  { id: 'elder', label: 'Elder', group: 'serving', desc: 'A leader who helps oversee the church.',
    icon: ['M3 9l9-6 9 6', 'M4 21h16', 'M6 21V9', 'M10 21V9', 'M14 21V9', 'M18 21V9'] },
  { id: 'evangelist', label: 'Evangelist', group: 'serving', desc: 'Sharing the gospel far and wide.',
    icon: ['M3 11v2a1 1 0 001 1h3l7 4V6L7 10H4a1 1 0 00-1 1z', 'M17.5 9.5a4 4 0 010 5'] },
  { id: 'missionary', label: 'Missionary', group: 'serving', desc: 'Serving God across cultures and borders.',
    icon: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M3 12h18', 'M12 3a14 14 0 010 18', 'M12 3a14 14 0 000 18'] },
  { id: 'chaplain', label: 'Chaplain', group: 'serving', desc: 'Caring for people in hospitals, schools, prisons, the forces.',
    icon: ['M12 3c2 3 3 4.5 3 6.5a3 3 0 11-6 0c0-2 1-3.5 3-6.5z', 'M8 21h8', 'M12 15v6'] },

  // ----- Ministry & leadership -----
  { id: 'pastor', label: 'Pastor', group: 'ministry', desc: 'Shepherding a congregation.',
    icon: ['M10 21V8a4 4 0 118 0 3 3 0 01-3 3'] },
  { id: 'reverend', label: 'Reverend', group: 'ministry', desc: 'Ordained minister.',
    icon: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M12 7v10', 'M8.5 10.5h7'] },
  { id: 'priest', label: 'Priest', group: 'ministry', desc: 'Ordained priest.',
    icon: ['M8 3h8v5a4 4 0 01-8 0z', 'M12 12v6', 'M8 21h8'] },
  { id: 'bishop', label: 'Bishop', group: 'ministry', desc: 'Overseeing pastors and churches.',
    icon: ['M7 17c0-6 2-12 5-14 3 2 5 8 5 14', 'M5 17h14', 'M5 21h14', 'M12 7v6', 'M9.5 10h5'] },
  { id: 'apostle', label: 'Apostle', group: 'ministry', desc: 'Sent to plant and strengthen churches.',
    icon: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'] },
  { id: 'prophet', label: 'Prophet', group: 'ministry', desc: 'Speaking God\u2019s word to His people.',
    icon: ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z', 'M12 15a3 3 0 100-6 3 3 0 000 6z'] },
];

const BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export function badgeById(id) {
  return id ? BY_ID[id] || null : null;
}
