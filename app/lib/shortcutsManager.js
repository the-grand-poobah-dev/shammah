'use client';
import {
  BookOpen,
  Flame,
  Gamepad2,
  LayoutGrid,
  HeartHandshake,
  GraduationCap,
  Compass,
  Sliders,
  Search,
  MessageCircle,
  Bell,
  Calendar,
  Sparkles,
  Music,
  Radio,
  Video,
  Users,
  Share2,
  Bookmark,
  FileText,
  Globe,
  Building2,
  HelpCircle,
  Award,
} from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { playSound } from './soundEffects.js';

export const ICON_MAP = {
  BookOpen,
  Flame,
  Gamepad2,
  LayoutGrid,
  HeartHandshake,
  GraduationCap,
  Compass,
  Sliders,
  Search,
  MessageCircle,
  Bell,
  Calendar,
  Sparkles,
  Music,
  Radio,
  Video,
  Users,
  Share2,
  Bookmark,
  FileText,
  Globe,
  Building2,
  HelpCircle,
  Award,
};

export const COLOR_SWATCHES = [
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#0ea5e9', // Sky Blue
  '#f97316', // Orange
  '#0d9488', // Teal
  '#be123c', // Rose
];

export const DESTINATION_GROUPS = [
  {
    type: 'section',
    label: 'App Section',
    options: [
      { value: 'bible', label: 'Bible Reader' },
      { value: 'games', label: 'Arcade Games' },
      { value: 'workspace', label: 'My Workspace' },
      { value: 'fundraisers', label: 'Fundraisers' },
      { value: 'courses', label: 'Courses' },
      { value: 'polls', label: 'Icebreaker Polls' },
      { value: 'videos', label: 'Video Feed' },
      { value: 'podcasts', label: 'Audio & Podcasts' },
      { value: 'rss', label: 'RSS News & Devotionals' },
      { value: 'challenges', label: 'Faith Challenges' },
      { value: 'all', label: 'All Feed Posts' },
    ],
  },
  {
    type: 'tab',
    label: 'Main Tab',
    options: [
      { value: 'home', label: 'Home Feed' },
      { value: 'churches', label: 'Institutions' },
    ],
  },
  {
    type: 'route',
    label: 'Page Route',
    options: [
      { value: '/categories', label: 'Categories & Topics' },
      { value: '/churches', label: 'Church Directory' },
      { value: '/profile', label: 'User Profile' },
      { value: '/settings', label: 'Settings' },
      { value: '/settings/billing', label: 'Church Billing' },
    ],
  },
  {
    type: 'event',
    label: 'Action / Event',
    options: [
      { value: 'shammah:open-chatbot', label: 'Open Shammah AI Chatbot' },
      { value: 'shammah:open-search', label: 'Open Global Search' },
      { value: 'shammah:open-create-post', label: 'Create Post' },
      { value: 'shammah:open-create-status', label: 'Post 24-hr Status' },
      { value: 'shammah:open-create-reel', label: 'Post Faith Reel' },
    ],
  },
  {
    type: 'external',
    label: 'External Website',
    options: [],
  },
];

export const DEFAULT_SHORTCUTS = [
  {
    id: 'default-bible',
    label: 'Bible',
    icon: 'BookOpen',
    color: '#f59e0b',
    size: 'wide',
    target: { type: 'section', value: 'bible' },
  },
  {
    id: 'default-ai',
    label: 'Shammah AI',
    icon: 'Flame',
    color: '#f97316',
    size: 'wide',
    target: { type: 'event', value: 'shammah:open-chatbot' },
  },
  {
    id: 'default-arcade',
    label: 'Arcade',
    icon: 'Gamepad2',
    color: '#06b6d4',
    size: 'sm',
    target: { type: 'section', value: 'games' },
  },
  {
    id: 'default-workspace',
    label: 'Workspace',
    icon: 'LayoutGrid',
    color: '#10b981',
    size: 'sm',
    target: { type: 'section', value: 'workspace' },
  },
  {
    id: 'default-fundraisers',
    label: 'Fundraisers',
    icon: 'HeartHandshake',
    color: '#ec4899',
    size: 'sm',
    target: { type: 'section', value: 'fundraisers' },
  },
  {
    id: 'default-courses',
    label: 'Courses',
    icon: 'GraduationCap',
    color: '#8b5cf6',
    size: 'sm',
    target: { type: 'section', value: 'courses' },
  },
  {
    id: 'default-topics',
    label: 'Topics',
    icon: 'Compass',
    color: '#0d9488',
    size: 'sm',
    target: { type: 'route', value: '/categories' },
  },
  {
    id: 'default-settings',
    label: 'Settings',
    icon: 'Sliders',
    color: '#0ea5e9',
    size: 'sm',
    target: { type: 'route', value: '/settings' },
  },
];

const STORAGE_PREFIX = 'shammah:explore-shortcuts:v1:';
const UPDATED_AT_PREFIX = 'shammah:explore-shortcuts:updated-at:v1:';

function getStorageKey(userId) {
  const key = userId || 'guest';
  return `${STORAGE_PREFIX}${key}`;
}

function getUpdatedAtStorageKey(userId) {
  const key = userId || 'guest';
  return `${UPDATED_AT_PREFIX}${key}`;
}

export function isValidExternalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates and sanitises a single shortcut item.
 * Drops unknown icon keys (falls back to Sparkles).
 * Rejects invalid targets and non-http(s) external URLs.
 */
export function sanitizeShortcut(item, index = 0) {
  if (!item || typeof item !== 'object') return null;

  const label = typeof item.label === 'string' ? item.label.trim().slice(0, 18) : '';
  if (!label) return null;

  // Drop unknown icon keys -> fallback to Sparkles
  const icon = typeof item.icon === 'string' && ICON_MAP[item.icon] ? item.icon : 'Sparkles';
  const color = typeof item.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(item.color) ? item.color : '#06b6d4';
  const size = item.size === 'wide' ? 'wide' : 'sm';

  // Target validation: drop invalid targets and reject non-http(s) external URLs
  if (!item.target || typeof item.target !== 'object') return null;
  const validTypes = ['section', 'tab', 'route', 'event', 'external'];
  if (!validTypes.includes(item.target.type)) return null;

  const targetType = item.target.type;
  const targetValue = typeof item.target.value === 'string' ? item.target.value.trim() : '';
  if (!targetValue) return null;

  if (targetType === 'external') {
    if (!isValidExternalUrl(targetValue)) {
      return null; // Reject non-http(s) external URLs
    }
  }

  return {
    id: typeof item.id === 'string' && item.id ? item.id : `shortcut-${Date.now()}-${index}`,
    label,
    icon,
    color,
    size,
    target: {
      type: targetType,
      value: targetValue,
    },
  };
}

export function getLocalUpdatedAt(userId) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getUpdatedAtStorageKey(userId));
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : new Date(raw).getTime() || null;
  } catch {
    return null;
  }
}

export function setLocalUpdatedAt(userId, timestamp) {
  if (typeof window === 'undefined') return;
  try {
    const num = typeof timestamp === 'number' ? timestamp : (new Date(timestamp).getTime() || Date.now());
    localStorage.setItem(getUpdatedAtStorageKey(userId), String(num));
  } catch {}
}

// =============================================================================
// Cloud Sync State & Subscription Management
// =============================================================================
let currentSyncStatus = 'saved'; // 'saved' | 'syncing' | 'offline'
const syncStatusListeners = new Set();

export function getShortcutsSyncStatus() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline';
  }
  return currentSyncStatus;
}

export function setShortcutsSyncStatus(status) {
  currentSyncStatus = status;
  syncStatusListeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      console.warn('[shortcutsManager] Listener error:', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('shammah:shortcuts-sync-status', { detail: status }));
  }
}

export function subscribeShortcutsSyncStatus(cb) {
  syncStatusListeners.add(cb);
  cb(getShortcutsSyncStatus());
  return () => {
    syncStatusListeners.delete(cb);
  };
}

// Debounce & Offline Queue Variables
let pendingSyncPayload = null; // { userId, list, timestamp }
let saveDebounceTimer = null;

async function executeRemoteSave() {
  if (!pendingSyncPayload) {
    setShortcutsSyncStatus('saved');
    return;
  }

  const payload = { ...pendingSyncPayload };
  const { userId, list, timestamp } = payload;

  if (!userId || userId === 'guest') {
    pendingSyncPayload = null;
    setShortcutsSyncStatus('saved');
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setShortcutsSyncStatus('offline');
    return;
  }

  setShortcutsSyncStatus('syncing');

  try {
    const sanitized = (list || [])
      .map(sanitizeShortcut)
      .filter(Boolean)
      .slice(0, 12);
    const isoDate = new Date(timestamp).toISOString();

    const { error } = await supabase
      .from('user_shortcuts')
      .upsert(
        {
          user_id: userId,
          items: sanitized,
          updated_at: isoDate,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.warn('[shortcutsManager] Remote save failed, staying queued:', error.message || error);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setShortcutsSyncStatus('offline');
      } else {
        // Fall back gracefully to local on error; don't break UI
        setShortcutsSyncStatus('saved');
      }
      return;
    }

    // Successfully saved
    if (pendingSyncPayload && pendingSyncPayload.timestamp === timestamp) {
      pendingSyncPayload = null;
    }
    setShortcutsSyncStatus('saved');
  } catch (err) {
    console.warn('[shortcutsManager] Error during remote save:', err);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setShortcutsSyncStatus('offline');
    } else {
      setShortcutsSyncStatus('saved');
    }
  }
}

function queueRemoteSave(userId, list, timestamp) {
  if (!userId || userId === 'guest') return;

  pendingSyncPayload = { userId, list, timestamp };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setShortcutsSyncStatus('offline');
    return;
  }

  setShortcutsSyncStatus('syncing');

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  // Debounce saves by 800ms
  saveDebounceTimer = setTimeout(() => {
    executeRemoteSave();
  }, 800);
}

// Window online / offline listeners for offline queueing and automatic retry
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (pendingSyncPayload) {
      executeRemoteSave();
    } else {
      setShortcutsSyncStatus('saved');
    }
  });

  window.addEventListener('offline', () => {
    setShortcutsSyncStatus('offline');
  });
}

// =============================================================================
// Local CRUD Operations
// =============================================================================

export function loadShortcuts(userId) {
  if (typeof window === 'undefined') {
    return DEFAULT_SHORTCUTS;
  }

  try {
    let raw = localStorage.getItem(getStorageKey(userId));
    // If signed-in user has no local shortcuts yet, inherit from guest if available
    if (!raw && userId && userId !== 'guest') {
      raw = localStorage.getItem(getStorageKey('guest'));
    }

    if (!raw) return DEFAULT_SHORTCUTS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SHORTCUTS;
    }

    const sanitized = parsed
      .map(sanitizeShortcut)
      .filter(Boolean)
      .slice(0, 12);

    return sanitized.length > 0 ? sanitized : DEFAULT_SHORTCUTS;
  } catch (err) {
    console.warn('[shortcutsManager] Failed to load shortcuts, falling back to defaults', err);
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(userId, list) {
  if (typeof window === 'undefined') return;

  try {
    const sanitized = (list || [])
      .map(sanitizeShortcut)
      .filter(Boolean)
      .slice(0, 12);

    localStorage.setItem(getStorageKey(userId), JSON.stringify(sanitized));
    const now = Date.now();
    setLocalUpdatedAt(userId, now);

    // Debounced remote save (800ms) with queueing
    if (userId && userId !== 'guest') {
      queueRemoteSave(userId, sanitized, now);
    }
  } catch (err) {
    console.warn('[shortcutsManager] Failed to save shortcuts to localStorage', err);
  }
}

export function resetShortcuts(userId) {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(DEFAULT_SHORTCUTS));
    const now = Date.now();
    setLocalUpdatedAt(userId, now);

    if (userId && userId !== 'guest') {
      queueRemoteSave(userId, DEFAULT_SHORTCUTS, now);
    }
  } catch (err) {
    console.warn('[shortcutsManager] Failed to reset shortcuts in localStorage', err);
  }

  return DEFAULT_SHORTCUTS;
}

/**
 * On sign-in, synchronises user shortcuts with Supabase:
 * - If no remote row exists: uploads local shortcuts list.
 * - If both exist: keeps the one with the newer updated_at.
 * - Never loses data silently; falls back to local on any error.
 * - Never blocks the UI on network.
 */
export async function syncUserShortcuts(userId) {
  if (!userId || userId === 'guest' || typeof window === 'undefined') {
    setShortcutsSyncStatus('saved');
    return loadShortcuts(userId);
  }

  const localList = loadShortcuts(userId);
  const localUpdatedAt = getLocalUpdatedAt(userId);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setShortcutsSyncStatus('offline');
    return localList;
  }

  setShortcutsSyncStatus('syncing');

  try {
    const { data, error } = await supabase
      .from('user_shortcuts')
      .select('items, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[shortcutsManager] Failed to fetch remote shortcuts, using local cache:', error);
      setShortcutsSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved');
      return localList;
    }

    // Case 1: No remote row exists yet -> upload local list
    if (!data) {
      const now = localUpdatedAt || Date.now();
      if (!localUpdatedAt) {
        setLocalUpdatedAt(userId, now);
      }

      await supabase.from('user_shortcuts').upsert(
        {
          user_id: userId,
          items: localList,
          updated_at: new Date(now).toISOString(),
        },
        { onConflict: 'user_id' }
      );

      setShortcutsSyncStatus('saved');
      return localList;
    }

    // Case 2: Remote row exists -> resolve conflict by newer updated_at
    const remoteTime = data.updated_at ? new Date(data.updated_at).getTime() : 0;
    const localTime = localUpdatedAt || 0;

    if (remoteTime > localTime) {
      // Remote is newer: sanitize remote payload and update local cache
      const rawRemote = Array.isArray(data.items) ? data.items : [];
      const sanitizedRemote = rawRemote
        .map(sanitizeShortcut)
        .filter(Boolean)
        .slice(0, 12);

      const resolved = sanitizedRemote.length > 0 ? sanitizedRemote : DEFAULT_SHORTCUTS;
      localStorage.setItem(getStorageKey(userId), JSON.stringify(resolved));
      setLocalUpdatedAt(userId, remoteTime);

      // Dispatch event so UI widgets update smoothly without page reload
      window.dispatchEvent(
        new CustomEvent('shammah:shortcuts-updated', {
          detail: { shortcuts: resolved, userId },
        })
      );

      setShortcutsSyncStatus('saved');
      return resolved;
    } else if (localTime > remoteTime) {
      // Local is newer: upload local list to remote
      await supabase.from('user_shortcuts').upsert(
        {
          user_id: userId,
          items: localList,
          updated_at: new Date(localTime).toISOString(),
        },
        { onConflict: 'user_id' }
      );

      setShortcutsSyncStatus('saved');
      return localList;
    } else {
      // Identical or already in sync
      setShortcutsSyncStatus('saved');
      return localList;
    }
  } catch (err) {
    console.warn('[shortcutsManager] Sync error, falling back to local:', err);
    setShortcutsSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved');
    return localList;
  }
}

// =============================================================================
// Run Shortcut Navigation Handler
// =============================================================================

export function runShortcut(shortcut, { router, pathname = '/' } = {}) {
  if (!shortcut || !shortcut.target) return;
  playSound('reaction');

  const { type, value } = shortcut.target;

  switch (type) {
    case 'section': {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
        window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: value }));

        if (pathname === '/') {
          const url = new URL(window.location.href);
          if (value === 'all') {
            url.searchParams.delete('section');
          } else {
            url.searchParams.set('section', value);
          }
          window.history.replaceState({}, '', url.toString());
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (router) {
          router.push(value === 'all' ? '/' : `/?section=${value}`);
        }
      }
      break;
    }

    case 'tab': {
      if (typeof window !== 'undefined') {
        if (value === 'home') {
          window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'home' }));
          window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'all' }));
          if (pathname === '/') {
            if (window.location.search) window.history.pushState(null, '', '/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (router) {
            router.push('/');
          }
        } else if (value === 'churches') {
          if (pathname === '/') {
            window.dispatchEvent(new CustomEvent('shammah:set-tab', { detail: 'churches' }));
          } else if (router) {
            router.push('/?tab=churches');
          }
        }
      }
      break;
    }

    case 'route': {
      if (router) {
        router.push(value);
      } else if (typeof window !== 'undefined') {
        window.location.href = value;
      }
      break;
    }

    case 'event': {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(value));
      }
      break;
    }

    case 'external': {
      if (typeof window !== 'undefined' && isValidExternalUrl(value)) {
        window.open(value, '_blank', 'noopener,noreferrer');
      }
      break;
    }

    default:
      console.warn('[shortcutsManager] Unknown shortcut target type:', type);
  }
}
