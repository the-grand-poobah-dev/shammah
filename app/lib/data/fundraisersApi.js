import { supabase } from '../../../lib/supabaseClient';

// Legacy exports retained for import compatibility; campaign data comes only from Supabase.
export const COMMUNITY_PROJECTS = [];
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

export async function listFundraisers({ category = 'All', sort = 'trending', search = '' } = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  if (sort) params.set('sort', sort);
  if (search) params.set('search', search);

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
  idempotencyKey = null,
}) {
  const headers = await getAuthHeaders();
  const key = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `donation-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  headers['Idempotency-Key'] = key;
  const res = await fetch('/api/mpesa/donate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fundraiserId,
      amount,
      phone,
      donorName,
      anonymous,
      message,
      idempotencyKey: key,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Payment initiation failed.');
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

export async function reviewFundraiser({ targetType, targetId, decision, adminNote = null, payoutReceipt = null }) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/fundraisers', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'admin-review', targetType, targetId, decision, adminNote, payoutReceipt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to execute review decision.');
  return data;
}
