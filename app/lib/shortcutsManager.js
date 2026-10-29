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
import { playSound } from './soundEffects';

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

function getStorageKey(userId) {
  const key = userId || 'guest';
  return `${STORAGE_PREFIX}${key}`;
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

function sanitizeShortcut(item, index) {
  if (!item || typeof item !== 'object') return null;
  const label = typeof item.label === 'string' ? item.label.trim().slice(0, 18) : `Item ${index + 1}`;
  if (!label) return null;

  const icon = typeof item.icon === 'string' && ICON_MAP[item.icon] ? item.icon : 'Sparkles';
  const color = typeof item.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(item.color) ? item.color : '#06b6d4';
  const size = item.size === 'wide' ? 'wide' : 'sm';

  const validTypes = ['section', 'tab', 'route', 'event', 'external'];
  const targetType = validTypes.includes(item?.target?.type) ? item.target.type : 'section';
  let targetValue = typeof item?.target?.value === 'string' ? item.target.value.trim() : 'all';

  if (targetType === 'external' && !isValidExternalUrl(targetValue)) {
    targetValue = 'https://shammah.faith';
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

export function loadShortcuts(userId) {
  if (typeof window === 'undefined') {
    return DEFAULT_SHORTCUTS;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
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
  } catch (err) {
    console.warn('[shortcutsManager] Failed to save shortcuts to localStorage', err);
  }
}

export function resetShortcuts(userId) {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;

  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch (err) {
    console.warn('[shortcutsManager] Failed to reset shortcuts in localStorage', err);
  }

  return DEFAULT_SHORTCUTS;
}

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
