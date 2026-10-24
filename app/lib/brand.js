/**
 * Shammah Brand Identity & Canonical URL Source of Truth
 *
 * Single source of truth for:
 * - App Name: 'Shammah' ("The Lord is Here")
 * - Tagline: 'The Lord is Here'
 * - Canonical App URL (from NEXT_PUBLIC_APP_URL with fallback to TODO_CONFIRM_APP_URL)
 * - Brand logo assets and color tokens
 * - Standardized share copy for canvas, clipboard, modals, and native share
 */

/**
 * TODO: Confirm the final production domain with user/project owner.
 * Default canonical domain is 'https://shammah.faith'.
 * Can be overridden via NEXT_PUBLIC_APP_URL environment variable.
 */
export const TODO_CONFIRM_APP_URL = 'https://shammah.faith';

// Read canonical base URL from NEXT_PUBLIC_APP_URL, strictly falling back to TODO_CONFIRM_APP_URL (NOT window.location.origin)
export const APP_URL = (
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
    : TODO_CONFIRM_APP_URL
);

function extractDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname;
  } catch {
    return 'shammah.faith';
  }
}

export const BRAND = {
  appName: 'Shammah',
  tagline: 'The Lord is Here',
  appUrl: APP_URL,
  domain: extractDomain(APP_URL),
  logo: {
    symbol: '🔥',
    name: 'Shammah Flame',
    gradient: ['#f59e0b', '#ef4444'],
    accentCyan: '#38bdf8',
    accentGold: '#eab308',
  },
};

/**
 * Builds canonical shareable web URL for a post, poll, course, or profile.
 */
export function getShareUrl(pathOrParams = '') {
  if (!pathOrParams) return BRAND.appUrl;
  if (pathOrParams.startsWith('http://') || pathOrParams.startsWith('https://')) {
    return pathOrParams;
  }
  const clean = pathOrParams.startsWith('/') ? pathOrParams : `/?${pathOrParams}`;
  return `${BRAND.appUrl}${clean}`;
}

/**
 * Builds canonical URL for a specific post.
 */
export function getPostShareUrl(postId) {
  return postId ? getShareUrl(`post=${encodeURIComponent(postId)}`) : BRAND.appUrl;
}

/**
 * Formats standardized share text across clipboard, social media, and native share.
 */
export function formatShareText({
  title,
  textContent = '',
  authorName,
  churchName,
  postId,
  postUrl,
} = {}) {
  const url = postUrl || getPostShareUrl(postId);
  const snippet = textContent ? textContent.trim().slice(0, 180) : (title || BRAND.tagline);
  
  let authorSegment = '';
  if (authorName && authorName !== 'Member' && authorName !== 'Shammah Member') {
    authorSegment = ` — ${authorName}`;
    if (churchName && churchName !== 'Shammah Global Community') {
      authorSegment += ` (${churchName})`;
    }
  } else if (churchName && churchName !== 'Shammah Global Community') {
    authorSegment = ` — ${churchName}`;
  }

  return `"${snippet}"${authorSegment}\n\nShared via ${BRAND.appName} ("${BRAND.tagline}")\n${url}`;
}

export default BRAND;
