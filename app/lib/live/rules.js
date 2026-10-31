/**
 * Safety & Eligibility rules for Live Broadcast
 * Enforces verified account, ministry role, or minimum account age (7 days).
 */

export const MIN_ACCOUNT_AGE_DAYS = 7;

export const PRIVILEGED_ROLES = [
  'admin',
  'superadmin',
  'pastor',
  'bishop',
  'minister',
  'worship_leader',
  'church_admin',
];

/**
 * Checks if a user is eligible to start a live broadcast.
 *
 * @param {Object} profile - User profile { id, role, badge_verified, created_at }
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canUserGoLive(profile) {
  if (!profile) {
    return { allowed: false, reason: 'You must be signed in to host a live broadcast.' };
  }

  // 1. Ministry or Admin role bypass
  const role = String(profile.role || '').toLowerCase();
  if (PRIVILEGED_ROLES.includes(role)) {
    return { allowed: true };
  }

  // 2. Verified disciples/churches
  if (profile.badge_verified === true) {
    return { allowed: true };
  }

  // 3. Account age check (>= 7 days)
  if (profile.created_at) {
    const createdTime = new Date(profile.created_at).getTime();
    const now = Date.now();
    const ageDays = (now - createdTime) / (1000 * 60 * 60 * 24);
    if (ageDays >= MIN_ACCOUNT_AGE_DAYS) {
      return { allowed: true };
    }
    const daysLeft = Math.ceil(MIN_ACCOUNT_AGE_DAYS - ageDays);
    return {
      allowed: false,
      reason: `To maintain sanctuary safety, live broadcasting requires an active account for at least 7 days (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining) or a verified badge.`,
    };
  }

  // Default allow if created_at is not tracked yet
  return { allowed: true };
}
