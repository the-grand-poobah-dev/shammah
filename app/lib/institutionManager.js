'use client';
import { playSound } from './soundEffects';

const INSTITUTION_SUBS_KEY = 'shammah_institution_subscriptions_v1';
const JOINED_INSTITUTIONS_KEY = 'shammah_joined_institutions_v1';
const INSTITUTION_FOLLOWS_KEY = 'shammah_institution_follows_v1';

export const INSTITUTION_CATEGORIES = [
  { id: 'all', label: 'All Institutions', icon: '🏛️' },
  { id: 'church', label: 'Churches & Ministries', icon: '⛪' },
  { id: 'missionary', label: 'Missionary & Relief Orgs', icon: '🌍' },
  { id: 'cu', label: 'School & University CUs', icon: '🎓' },
  { id: 'fellowship', label: 'Bible Study & Fellowships', icon: '📖' },
  { id: 'club', label: 'Youth & Campus Clubs', icon: '🤝' },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free Plan',
    monthlyPrice: 0,
    badgeColor: '#64748b',
    description: 'Always free access for basic presence and fellowship engagement.',
    features: [
      'Basic institution profile page',
      'Public feed announcements & posts',
      'Member directory access',
      'Standard community search visibility',
      '1 Page Administrator',
    ],
    lockedFeatures: [
      'Verified institution badge',
      'Event scheduling & calendar',
      'Discipleship courses publishing',
      'In-app fundraising & giving',
      'Direct join requests dispatch',
    ],
  },
  {
    id: 'starter',
    name: 'Starter Plan',
    monthlyPrice: 500,
    badgeColor: '#0ea5e9',
    popular: false,
    trialDays: 7,
    description: 'Official verified status, custom branding, and event scheduling.',
    features: [
      'Official Blue Verified Institution Badge',
      'Custom branding banner & high-res logo',
      'Event scheduling & public calendar feed',
      'Priority placement in regional directory',
      'Up to 3 Page Administrators',
      '7-day free trial on signup',
    ],
    lockedFeatures: [
      'Discipleship courses publishing',
      'In-app fundraising & giving',
      'Direct join requests dispatch',
    ],
  },
  {
    id: 'popular',
    name: 'Popular Plan',
    monthlyPrice: 3000,
    badgeColor: '#8b5cf6',
    popular: true,
    trialDays: 7,
    description: 'Full organization, publish & charge for courses, and send join requests.',
    features: [
      'Everything in Starter Plan',
      'Create, publish & charge for Discipleship Courses',
      'Send direct Join Requests & Invites to users',
      'Member analytics & attendance insights',
      'Pastoral prayer request inbox & dispatch',
      'Up to 10 Page Administrators',
      '7-day free trial on signup',
    ],
    lockedFeatures: [
      'In-app fundraising & tithing campaigns',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced Plan',
    monthlyPrice: 7000,
    badgeColor: '#f59e0b',
    popular: false,
    trialDays: 7,
    description: 'Complete ministry suite: in-app fundraising, giving ledger, and upcoming tools.',
    features: [
      'Everything in Popular Plan',
      'In-app Fundraising (Tithes, Building Projects, Missions)',
      'Donor reports & automated M-Pesa contribution receipts',
      'Broadcast push announcements to all joined members',
      'Unlimited Discipleship Courses & Certificates',
      'Dedicated pastoral account support manager',
      'Guaranteed access to all new leadership tools added',
      '7-day free trial on signup',
    ],
    lockedFeatures: [],
  },
];

export const BILLING_INTERVALS = [
  { id: 'monthly', label: 'Monthly', months: 1, discountPercent: 0 },
  { id: 'quarterly', label: 'Quarterly', months: 3, discountPercent: 10, discountLabel: 'Save 10%' },
  { id: 'biannual', label: 'Bi-Annually', months: 6, discountPercent: 15, discountLabel: 'Save 15%' },
  { id: 'annual', label: 'Yearly', months: 12, discountPercent: 25, discountLabel: 'Save 25%' },
];

export function calculatePlanPrice(planId, intervalId) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
  const interval = BILLING_INTERVALS.find((i) => i.id === intervalId) || BILLING_INTERVALS[0];

  if (plan.monthlyPrice === 0) {
    return {
      monthlyRate: 0,
      totalAmount: 0,
      discountPercent: 0,
      savings: 0,
    };
  }

  const baseTotal = plan.monthlyPrice * interval.months;
  const discountAmount = Math.round((baseTotal * interval.discountPercent) / 100);
  const totalAmount = baseTotal - discountAmount;
  const effectiveMonthly = Math.round(totalAmount / interval.months);

  return {
    monthlyRate: effectiveMonthly,
    totalAmount,
    discountPercent: interval.discountPercent,
    savings: discountAmount,
  };
}

export const SAMPLE_INSTITUTIONS = [
  {
    id: 'inst-citam',
    name: 'CITAM Valley Road',
    category: 'church',
    categoryLabel: 'Church',
    denomination: 'Pentecostal / CITAM',
    location: 'Nairobi, Kenya',
    county: 'Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1548625361-195fe5795df5?w=200',
    cover_url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=1000',
    about: 'Christ Is The Answer Ministries - A community of believers committed to knowing God and making Him known through biblical discipleship and community transformation.',
    membersCount: 4820,
    plan: 'advanced',
    coursesCount: 6,
    hasFundraising: true,
    activeCampaign: {
      title: 'Children’s Ministry Sanctuary Expansion',
      goalKes: 1500000,
      raisedKes: 980000,
      purpose: 'Building classrooms and modern facilities for 1,200 Sunday school kids.',
    },
    upcomingEvents: [
      { title: 'Sunday Celebration Service', date: 'This Sunday 9:00 AM & 11:30 AM', venue: 'Main Sanctuary' },
      { title: 'Keshas: Night of Encounter', date: 'Next Friday 9:00 PM', venue: 'Valley Road Hall' },
    ],
  },
  {
    id: 'inst-focus',
    name: 'FOCUS Kenya (Fellowship of Christian Unions)',
    category: 'missionary',
    categoryLabel: 'Missionary Organisation',
    denomination: 'Interdenominational Student Ministry',
    location: 'Kasayani Road, Nairobi, Kenya',
    county: 'Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200',
    cover_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1000',
    about: 'Reaching students in Universities and Colleges across Kenya for Christ, discipling them to be agents of godly transformation in church and society.',
    membersCount: 2340,
    plan: 'popular',
    coursesCount: 4,
    hasFundraising: false,
    upcomingEvents: [
      { title: 'Ezra Conference 2026', date: 'Dec 28 - Jan 2', venue: 'Kabarak University' },
      { title: 'Campus Associates Summit', date: 'Saturday 8:30 AM', venue: 'FOCUS Center Kasarani' },
    ],
  },
  {
    id: 'inst-uon-cu',
    name: 'University of Nairobi Christian Union (Main Campus)',
    category: 'cu',
    categoryLabel: 'University Christian Union',
    denomination: 'Campus Christian Union',
    location: 'Main Campus, University Way, Nairobi',
    county: 'Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200',
    cover_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000',
    about: 'We exist to evangelize students, foster biblical spiritual maturity, and prepare leaders who reflect Christ on campus and in the professional marketplace.',
    membersCount: 1890,
    plan: 'starter',
    coursesCount: 2,
    hasFundraising: false,
    upcomingEvents: [
      { title: 'Weekly Fellowship Gathering', date: 'Every Wednesday 5:30 PM', venue: 'Taifa Hall' },
      { title: 'Kikuyu Mission Outreach', date: 'October 18-24', venue: 'Kiambu County' },
    ],
  },
  {
    id: 'inst-bsf',
    name: 'Bible Study Fellowship (BSF) Nairobi Central',
    category: 'fellowship',
    categoryLabel: 'Bible Study Fellowship',
    denomination: 'Global In-Depth Scripture Study',
    location: 'Upper Hill, Nairobi',
    county: 'Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200',
    cover_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000',
    about: 'In-depth, interdenominational Bible classes producing passionate commitment to Christ, His Word, and His Church.',
    membersCount: 840,
    plan: 'popular',
    coursesCount: 3,
    hasFundraising: false,
    upcomingEvents: [
      { title: 'Book of Revelation Lecture & Discussion', date: 'Tuesday 6:00 PM', venue: 'BSF Center & Zoom' },
    ],
  },
  {
    id: 'inst-mavuno',
    name: 'Mavuno Church Mashariki',
    category: 'church',
    categoryLabel: 'Church',
    denomination: 'Evangelical / Mavuno Movement',
    location: 'Donholm / Jogoo Road, Nairobi',
    county: 'Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=200',
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000',
    about: 'Turning ordinary people into fearless influencers of society. Vibrant family life, intentional discipleship (Mizizi), and real impact.',
    membersCount: 3210,
    plan: 'advanced',
    coursesCount: 5,
    hasFundraising: true,
    activeCampaign: {
      title: 'Mavuno Community Youth Center',
      goalKes: 800000,
      raisedKes: 610000,
      purpose: 'Equipping neighborhood teenagers with digital coding & vocational mentoring.',
    },
    upcomingEvents: [
      { title: 'Sunday Worship Experience', date: 'Sunday 10:00 AM', venue: 'Mavuno Mashariki Dome' },
      { title: 'Mizizi Discipleship Orientation', date: 'Thursday 6:30 PM', venue: 'Online & Dome' },
    ],
  },
  {
    id: 'inst-ku-cu',
    name: 'Kenyatta University Christian Union (KUCU)',
    category: 'cu',
    categoryLabel: 'University Christian Union',
    denomination: 'Campus Christian Union',
    location: 'Kenyatta University Main Campus, Thika Road',
    county: 'Kiambu / Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200',
    cover_url: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1000',
    about: 'A fellowship of undergraduate and postgraduate students steadfast in worship, prayer, missions, and spiritual mentorship.',
    membersCount: 2650,
    plan: 'popular',
    coursesCount: 3,
    hasFundraising: false,
    upcomingEvents: [
      { title: 'KUCU Joint Sunday Fellowship', date: 'Sunday 2:00 PM', venue: 'Bishop Square' },
    ],
  },
  {
    id: 'inst-world-vision',
    name: 'World Vision Kenya - Christian Ministry Hub',
    category: 'missionary',
    categoryLabel: 'Missionary Relief Agency',
    denomination: 'Christian Humanitarian Organisation',
    location: 'Karen Road, Nairobi',
    county: 'Nairobi',
    verified: true,
    logo_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=200',
    cover_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1000',
    about: 'Christian relief, development, and advocacy organisation dedicated to working with children, families, and their communities to reach their full potential.',
    membersCount: 1540,
    plan: 'advanced',
    coursesCount: 2,
    hasFundraising: true,
    activeCampaign: {
      title: 'Clean Water for Baringo Families',
      goalKes: 2500000,
      raisedKes: 1840000,
      purpose: 'Solar-powered water boreholes for drought-affected schools in Baringo.',
    },
    upcomingEvents: [
      { title: 'Global 6K for Water Kickoff', date: 'Saturday 7:00 AM', venue: 'Uhuru Gardens' },
    ],
  },
  {
    id: 'inst-yfc',
    name: 'Youth For Christ Kenya (YFC)',
    category: 'club',
    categoryLabel: 'Youth Ministry Club',
    denomination: 'Youth Evangelism Movement',
    location: 'Ngong Road, Nairobi',
    county: 'Nairobi',
    verified: false,
    logo_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200',
    cover_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1000',
    about: 'Reaching high school and college young people everywhere, raising lifelong followers of Jesus who lead with passion.',
    membersCount: 670,
    plan: 'free',
    coursesCount: 1,
    hasFundraising: false,
    upcomingEvents: [
      { title: 'High School Leaders Camp', date: 'Nov 12-16', venue: 'Brackenhurst Limuru' },
    ],
  },
];

export function getStoredSubscriptions() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INSTITUTION_SUBS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getInstitutionSubscription(institutionId) {
  const all = getStoredSubscriptions();
  if (all[institutionId]) {
    return all[institutionId];
  }
  // Fall back to sample institution default plan
  const sample = SAMPLE_INSTITUTIONS.find((s) => s.id === institutionId);
  const planId = sample ? sample.plan : 'free';
  return {
    institutionId,
    planId,
    intervalId: 'monthly',
    status: planId === 'free' ? 'active' : 'active',
    isTrial: false,
    trialEndsAt: null,
    renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    fundsBalanceKes: sample?.activeCampaign ? sample.activeCampaign.raisedKes : 0,
    coursesPublished: sample ? sample.coursesCount : 0,
    coursesPaused: false,
  };
}

export function saveInstitutionSubscription(institutionId, subscriptionData) {
  if (typeof window === 'undefined') return;
  try {
    const all = getStoredSubscriptions();
    all[institutionId] = {
      ...all[institutionId],
      ...subscriptionData,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(INSTITUTION_SUBS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('shammah:institution-sub-updated', { detail: { institutionId } }));
  } catch (err) {
    console.error('Failed to save institution subscription', err);
  }
}

export function upgradeInstitutionPlan(institutionId, planId, intervalId, startTrial = false) {
  const renewsAt = new Date(Date.now() + (startTrial ? 7 : 30) * 86400000).toISOString();
  const subData = {
    institutionId,
    planId,
    intervalId,
    status: 'active',
    isTrial: startTrial,
    trialEndsAt: startTrial ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
    renewsAt,
    coursesPaused: false, // unpause courses if previously downgraded!
  };
  saveInstitutionSubscription(institutionId, subData);
  playSound('achievement');
  return subData;
}

export function downgradeInstitutionToFree(institutionId) {
  // CRITICAL RULE:
  // "Failure to upgrade downgrades the page to the free page access.
  // However, they still have full control to their courses and money raised/earned
  // (they can't publish new ones and current ones aren't available to members until they upgrade again)."
  const current = getInstitutionSubscription(institutionId);
  const subData = {
    ...current,
    planId: 'free',
    status: 'downgraded',
    isTrial: false,
    trialEndsAt: null,
    renewsAt: null,
    coursesPaused: true, // courses are kept safe under their control, but paused for members!
  };
  saveInstitutionSubscription(institutionId, subData);
  playSound('reaction');
  return subData;
}

export function getJoinedInstitutionIds() {
  if (typeof window === 'undefined') return ['inst-citam', 'inst-uon-cu'];
  try {
    const raw = localStorage.getItem(JOINED_INSTITUTIONS_KEY);
    if (!raw) {
      const defaults = ['inst-citam', 'inst-uon-cu'];
      localStorage.setItem(JOINED_INSTITUTIONS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch {
    return ['inst-citam'];
  }
}

export function isInstitutionJoined(institutionId) {
  const list = getJoinedInstitutionIds();
  return list.includes(institutionId);
}

export function toggleJoinInstitution(institutionId) {
  if (typeof window === 'undefined') return false;
  const list = getJoinedInstitutionIds();
  const exists = list.includes(institutionId);
  let next;
  if (exists) {
    next = list.filter((id) => id !== institutionId);
  } else {
    next = [...list, institutionId];
    playSound('reaction');
  }
  localStorage.setItem(JOINED_INSTITUTIONS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('shammah:institutions-updated'));
  return !exists;
}

export function getFollowedInstitutionIds() {
  if (typeof window === 'undefined') return ['inst-citam', 'inst-focus', 'inst-mavuno'];
  try {
    const raw = localStorage.getItem(INSTITUTION_FOLLOWS_KEY);
    return raw ? JSON.parse(raw) : ['inst-citam', 'inst-focus', 'inst-mavuno'];
  } catch {
    return [];
  }
}

export function isInstitutionFollowed(institutionId) {
  return getFollowedInstitutionIds().includes(institutionId);
}

export function toggleFollowInstitution(institutionId) {
  if (typeof window === 'undefined') return false;
  const list = getFollowedInstitutionIds();
  const exists = list.includes(institutionId);
  let next;
  if (exists) {
    next = list.filter((id) => id !== institutionId);
  } else {
    next = [...list, institutionId];
    playSound('reaction');
  }
  localStorage.setItem(INSTITUTION_FOLLOWS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('shammah:institutions-updated'));
  return !exists;
}
