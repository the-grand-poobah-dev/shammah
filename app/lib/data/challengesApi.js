import { supabase } from '../../../lib/supabaseClient';

// Backwards-compatible exports only; the database/API is the sole source of challenge content.
export const INITIAL_CHALLENGES = [];
export const INITIAL_SUBMISSIONS = [];

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
  } catch {}
  return headers;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Faith Challenges request failed.');
  return data;
}

export async function listChallenges({
  category = 'All', sort = 'trending', search = '', userId = null, page = 1, pageSize = 12,
} = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (category && category !== 'All') params.set('category', category);
  if (sort) params.set('sort', sort);
  if (search) params.set('search', search);
  // userId is intentionally not sent: the API derives identity from the verified session.
  void userId;
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return requestJson('/api/challenges?' + params.toString(), { headers, cache: 'no-store' });
}

export async function getChallengeDetail(id, scope = 'all') {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ action: 'detail', id: String(id), scope });
  return requestJson('/api/challenges?' + params.toString(), { headers, cache: 'no-store' });
}

async function postAction(body) {
  const headers = await getAuthHeaders();
  return requestJson('/api/challenges', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function joinChallenge(challengeId) {
  return postAction({ action: 'join', challengeId });
}

export async function leaveChallenge(challengeId) {
  return postAction({ action: 'leave', challengeId });
}

export async function checkinChallenge({ challengeId, note = '', mediaUrl = null }) {
  return postAction({ action: 'checkin', challengeId, note, mediaUrl });
}

export async function submitChallengeEntry({
  challengeId, mediaUrl, mediaType = 'image', thumbUrl = null, caption = '', hashtag = '', scripture = '', audioTitle = '',
}) {
  const data = await postAction({
    action: 'submit', challengeId, mediaUrl, mediaType, thumbUrl, caption, hashtag, scripture, audioTitle,
  });
  return data.submission;
}

export async function addChallengeComment(submissionId, comment) {
  return postAction({ action: 'comment', submissionId, comment });
}

export async function voteChallengeSubmission(submissionId) {
  return postAction({ action: 'vote', submissionId });
}

export async function createChallenge(payload) {
  const data = await postAction({ action: 'create', ...payload });
  return data.challenge;
}

export async function closeChallenge(challengeId) {
  const data = await postAction({ action: 'close', challengeId });
  return data.challenge;
}

export async function moderateChallengeSubmission(submissionId, decision) {
  const data = await postAction({ action: 'moderate-submission', submissionId, decision });
  return data.submission;
}

export async function sendChallengePushReminder({ token, title, body, link = '/?tab=faith-challenges' }) {
  const headers = await getAuthHeaders();
  await requestJson('/api/fcm/register', {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, platform: 'web' }),
  });
  return requestJson('/api/fcm/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, title, body, link }),
  });
}

export async function deleteChallengeSubmission(submissionId) {
  return postAction({ action: 'delete-submission', submissionId });
}
