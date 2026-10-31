export const COURSES_CATALOG = [
  {
    id: 'course-1',
    title: 'Foundations of Christian Faith & Doctrine',
    description: 'A comprehensive study of salvation by grace, the authority of Scripture, the Trinity, and spiritual disciplines in daily life.',
    category: 'Theology',
    accent: '#f59e0b',
    duration_minutes: 180,
    modules_count: 6,
    instructor: 'Bishop Sarah Ndung\'u',
    instructor_title: 'Dean of Theology, Nairobi',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    enrolled_count: 420,
    cover_image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600',
    badge_title: 'Faith Foundations Graduate',
    badge_color: '#f59e0b',
  },
  {
    id: 'course-2',
    title: 'Worship Leading & Biblical Spontaneity',
    description: 'Cultivating the secret place of prayer, prophetic worship, team dynamics, and sound stewardship for African church services.',
    category: 'Spiritual Growth',
    accent: '#06b6d4',
    duration_minutes: 140,
    modules_count: 5,
    instructor: 'Joy Wambui',
    instructor_title: 'Director of Worship, Nairobi',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    enrolled_count: 310,
    cover_image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    badge_title: 'Worship Leader Certified',
    badge_color: '#06b6d4',
  },
  {
    id: 'course-3',
    title: 'Kingdom Stewardship & Biblical Finance',
    description: 'Tithing, investing, debt-free living, and building generational wealth with kingdom purpose and integrity in Kenya.',
    category: 'Life & Family',
    accent: '#10b981',
    duration_minutes: 120,
    modules_count: 4,
    instructor: 'Rev. Emmanuel Mutua',
    instructor_title: 'Kingdom Economics Fellowship',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    enrolled_count: 580,
    cover_image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600',
    badge_title: 'Biblical Steward',
    badge_color: '#10b981',
  },
  {
    id: 'course-4',
    title: 'Pastoral Care & Mental Health in the Church',
    description: 'Equipping youth leaders and pastors with trauma-informed pastoral counseling, empathy, and community referral networks.',
    category: 'Leadership',
    accent: '#8b5cf6',
    duration_minutes: 200,
    modules_count: 8,
    instructor: 'Dr. Esther Kamau',
    instructor_title: 'Clinical Counselor & Pastor',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    enrolled_count: 245,
    cover_image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600',
    badge_title: 'Pastoral Counselor',
    badge_color: '#8b5cf6',
  },
];

export async function listCourses() {
  return COURSES_CATALOG;
}

export function migrateLegacyCourseProgress() {
  return true;
}

export async function issueCourseCertificate({ courseId, userId, userName }) {
  return {
    certificateId: `cert-${Date.now()}`,
    courseId,
    issuedAt: new Date().toISOString(),
    recipient: userName,
  };
}

export function formatDurationMinutes(minutes = 0) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`;
  return `${m}m`;
}
