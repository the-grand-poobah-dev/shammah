import { supabase } from '../../../lib/supabaseClient';

// Compatibility shim for legacy imports that used COMMUNITY_PROJECTS
export const COMMUNITY_PROJECTS = [
  {
    id: 'f1000000-0000-4000-a000-000000000001',
    name: 'Turkana Clean Water Borehole & Solar Pump',
    title: 'Turkana Clean Water Borehole & Solar Pump',
    tag: 'Relief',
    category: 'Relief',
    icon: '💧',
    description: 'Drilling a deep clean water borehole and solar water purification plant for pastoralist families and schools in Turkana County.',
    targetKes: 650000,
    goal_kes: 650000,
    raisedKes: 520000,
    raised_kes: 520000,
    organizer: 'Turkana Pastoral Fellowship',
    donorsCount: 312,
    donors_count: 312,
    daysLeft: 14,
    accent: '#10b981',
  },
  {
    id: 'f1000000-0000-4000-a000-000000000002',
    name: 'Eldoret Worship Chapel Roof Restoration',
    title: 'Eldoret Worship Chapel Roof Restoration',
    tag: 'Church Building',
    category: 'Church building',
    icon: '⛪',
    description: 'Replacing aging iron sheets and installing insulation and ceiling acoustics before the heavy rainy season commences.',
    targetKes: 450000,
    goal_kes: 450000,
    raisedKes: 310000,
    raised_kes: 310000,
    organizer: 'Eldoret Grace Chapel',
    donorsCount: 198,
    donors_count: 198,
    daysLeft: 22,
    accent: '#f59e0b',
  },
  {
    id: 'f1000000-0000-4000-a000-000000000003',
    name: 'Coast Free Medical Camp & Eye Surgeries',
    title: 'Coast Free Medical Camp & Eye Surgeries',
    tag: 'Medical',
    category: 'Medical',
    icon: '🩺',
    description: 'Providing cataract surgeries, prescription glasses, prenatal vitamins, and Christian doctor consultations in Kwale.',
    targetKes: 280000,
    goal_kes: 280000,
    raisedKes: 195000,
    raised_kes: 195000,
    organizer: 'Coast Christian Doctors Fellowship',
    donorsCount: 145,
    donors_count: 145,
    daysLeft: 9,
    accent: '#ef4444',
  },
  {
    id: 'f1000000-0000-4000-a000-000000000004',
    name: 'Kibera & Mathare High School Christian Union Scholarship',
    title: 'Kibera & Mathare High School Christian Union Scholarship',
    tag: 'Education',
    category: 'Education',
    icon: '📚',
    description: 'Sponsoring 40 Christian Union youth leaders with secondary school tuition clearance, textbooks, and leadership discipleship.',
    targetKes: 360000,
    goal_kes: 360000,
    raisedKes: 285000,
    raised_kes: 285000,
    organizer: 'Nairobi Slum Youth Mission',
    donorsCount: 174,
    donors_count: 174,
    daysLeft: 18,
    accent: '#8b5cf6',
  },
];

export const SAMPLE_FUNDRAISERS = COMMUNITY_PROJECTS;

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {}
  return headers;
}

export async function listFundraisers({ category = 'All', sort = 'trending', search = '', userId = null } = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  if (sort) params.set('sort', sort);
  if (search) params.set('search', search);
  if (userId) params.set('userId', userId);

  const res = await fetch(`/api/fundraisers?${params.toString()}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load fundraisers.');
  return data;
}

export async function getFundraiser(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/fundraisers?action=detail&id=${encodeURIComponent(id)}`, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load fundraiser details.');
  return data;
}

export async function donateToFundraiser({
  fundraiserId,
  amount,
  phone,
  donorName = null,
  anonymous = false,
  message = null,
  userId = null,
  simulateConfirmation = false,
}) {
  const res = await fetch('/api/mpesa/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fundraiserId,
      amount,
      phone,
      donorName,
      anonymous,
      message,
      userId,
      simulateConfirmation,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Payment initiation failed.');
  }
  return data;
}

export async function checkDonationStatus({ checkoutRequestId, donationId, fundraiserId }) {
  const params = new URLSearchParams({ action: 'check-donation' });
  if (checkoutRequestId) params.set('checkoutRequestId', checkoutRequestId);
  if (donationId) params.set('donationId', donationId);
  if (fundraiserId) params.set('fundraiserId', fundraiserId);

  const res = await fetch(`/api/fundraisers?${params.toString()}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to check status.');
  return data;
}

export async function createFundraiser(payload) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'create', ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create campaign.');
  return data.fundraiser;
}

export async function postFundraiserUpdate({ fundraiserId, body, mediaUrl = null }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'update', fundraiserId, body, mediaUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to post update.');
  return data.update;
}

export async function requestWithdrawal({ fundraiserId, amountKes, mpesaPhone }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'withdrawal', fundraiserId, amountKes, mpesaPhone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit withdrawal request.');
  return data.withdrawal;
}

export async function reportFundraiser({ fundraiserId, reason, details }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'report', fundraiserId, reason, details }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit report.');
  return data;
}

export async function getAdminPendingFundraisers() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers?action=admin-list', { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch admin queue.');
  return data;
}

export async function reviewFundraiser({ targetType, targetId, decision, adminNote = null }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'admin-review', targetType, targetId, decision, adminNote }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to execute review decision.');
  return data;
}
