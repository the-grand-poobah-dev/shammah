'use client';
import { playSound } from './soundEffects';

export function isDarkThemeActive() {
  if (typeof window === 'undefined') return true;
  const currentAttr = document.documentElement.getAttribute('data-theme');
  if (currentAttr) return currentAttr === 'dark';
  const saved = localStorage.getItem('shammah-theme-mode') || localStorage.getItem('shammah-theme');
  return saved ? saved === 'dark' : true;
}

export function toggleTheme(currentDark) {
  try {
    playSound('themeToggle');
  } catch {}
  const nextDark = !currentDark;
  const themeVal = nextDark ? 'dark' : 'light';
  if (typeof window !== 'undefined') {
    localStorage.setItem('shammah-theme', themeVal);
    localStorage.setItem('shammah-theme-mode', themeVal);
    document.documentElement.setAttribute('data-theme', themeVal);
    document.documentElement.classList.toggle('dark', nextDark);
    window.dispatchEvent(new CustomEvent('shammah:theme-change', { detail: themeVal }));
  }
  return nextDark;
}
