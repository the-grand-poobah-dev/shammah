'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const VALID_PANELS = ['messages', 'alerts', 'explore'];

const SidePanelContext = createContext({
  activePanel: 'messages',
  setActivePanel: () => {},
  openPanel: () => {},
  closePanel: () => {},
  isCollapsed: false,
  initialConversationId: null,
  setInitialConversationId: () => {},
});

export function SidePanelProvider({ children }) {
  // Default to 'messages' as per specification (SSR-safe initial value)
  const [activePanel, setActivePanelState] = useState('messages');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState(null);

  // Sync with localStorage on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('shammah-side-panel');
      if (saved && VALID_PANELS.includes(saved)) {
        setActivePanelState(saved);
        setIsCollapsed(false);
        window.dispatchEvent(
          new CustomEvent('shammah:panel-changed', { detail: { panel: saved } })
        );
      } else if (saved === 'closed') {
        setIsCollapsed(true);
        setActivePanelState(null);
        window.dispatchEvent(
          new CustomEvent('shammah:panel-changed', { detail: { panel: null } })
        );
      } else {
        // Default to messages
        setActivePanelState('messages');
        localStorage.setItem('shammah-side-panel', 'messages');
        window.dispatchEvent(
          new CustomEvent('shammah:panel-changed', { detail: { panel: 'messages' } })
        );
      }
    } catch {
      setActivePanelState('messages');
    }
  }, []);

  const openPanel = useCallback((panel, conversationId = null) => {
    if (!VALID_PANELS.includes(panel)) return;
    setIsCollapsed(false);
    setActivePanelState(panel);
    if (conversationId) {
      setInitialConversationId(conversationId);
    }
    try {
      localStorage.setItem('shammah-side-panel', panel);
    } catch {}

    window.dispatchEvent(
      new CustomEvent('shammah:panel-changed', {
        detail: { panel, ...(conversationId ? { conversationId } : {}) },
      })
    );
  }, []);

  const closePanel = useCallback(() => {
    setIsCollapsed(true);
    setActivePanelState(null);
    try {
      localStorage.setItem('shammah-side-panel', 'closed');
    } catch {}
    window.dispatchEvent(
      new CustomEvent('shammah:panel-changed', { detail: { panel: null } })
    );
    window.dispatchEvent(new CustomEvent('shammah:close-panel'));
  }, []);

  // Listen to window events (shammah:open-panel, shammah:close-panel)
  useEffect(() => {
    function handleOpenEvent(e) {
      const panel = e.detail?.panel;
      const convId = e.detail?.conversationId || null;
      if (panel && VALID_PANELS.includes(panel)) {
        openPanel(panel, convId);
      }
    }

    function handleCloseEvent() {
      setIsCollapsed(true);
      setActivePanelState(null);
      try {
        localStorage.setItem('shammah-side-panel', 'closed');
      } catch {}
      window.dispatchEvent(
        new CustomEvent('shammah:panel-changed', { detail: { panel: null } })
      );
    }

    window.addEventListener('shammah:open-panel', handleOpenEvent);
    window.addEventListener('shammah:close-panel', handleCloseEvent);
    return () => {
      window.removeEventListener('shammah:open-panel', handleOpenEvent);
      window.removeEventListener('shammah:close-panel', handleCloseEvent);
    };
  }, [openPanel]);

  return (
    <SidePanelContext.Provider
      value={{
        activePanel,
        setActivePanel: openPanel,
        openPanel,
        closePanel,
        isCollapsed,
        initialConversationId,
        setInitialConversationId,
      }}
    >
      {children}
    </SidePanelContext.Provider>
  );
}

export function useSidePanel() {
  return useContext(SidePanelContext);
}
