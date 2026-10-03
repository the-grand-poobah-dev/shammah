'use client';
import { useEffect, useState } from 'react';
import { initGlobalHorizontalDrag } from '../lib/useDragScroll';
import GlobalSearchModal from './GlobalSearchModal';

export default function AppClientInit() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // 1. Enable global mouse drag-to-scroll on all horizontal items
    const cleanupDrag = initGlobalHorizontalDrag();

    // 2. Global shortcut for search: '/' or 'Ctrl+K' / 'Cmd+K'
    function handleKeyDown(e) {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }

    // 3. Custom event listener for opening search
    function handleOpenSearch(e) {
      setSearchQuery(e.detail?.query || '');
      setSearchOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('shammah:open-search', handleOpenSearch);

    return () => {
      cleanupDrag?.();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('shammah:open-search', handleOpenSearch);
    };
  }, []);

  return (
    <GlobalSearchModal
      isOpen={searchOpen}
      initialQuery={searchQuery}
      onClose={() => {
        setSearchOpen(false);
        setSearchQuery('');
      }}
    />
  );
}
