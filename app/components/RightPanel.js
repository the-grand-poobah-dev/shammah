'use client';
import { useState, useEffect } from 'react';

const PANEL_LABELS = {
  messages: 'Messages',
  alerts: 'Notifications & Alerts',
  explore: 'Explore Shammah',
};

export default function RightPanel() {
  const [activePanel, setActivePanel] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    function handleOpenPanel(e) {
      const nextPanel = e.detail?.panel || null;
      const nextConv = e.detail?.conversationId || null;
      setActivePanel(nextPanel);
      setConversationId(nextConv);
      window.dispatchEvent(
        new CustomEvent('shammah:panel-changed', {
          detail: { panel: nextPanel, ...(nextConv ? { conversationId: nextConv } : {}) },
        })
      );
    }

    function handleClosePanel() {
      setActivePanel(null);
      setConversationId(null);
      window.dispatchEvent(
        new CustomEvent('shammah:panel-changed', {
          detail: { panel: null },
        })
      );
    }

    window.addEventListener('shammah:open-panel', handleOpenPanel);
    window.addEventListener('shammah:close-panel', handleClosePanel);
    return () => {
      window.removeEventListener('shammah:open-panel', handleOpenPanel);
      window.removeEventListener('shammah:close-panel', handleClosePanel);
    };
  }, []);

  const title = activePanel ? PANEL_LABELS[activePanel] || 'Side Panel' : 'Messages & Alerts';

  return (
    <div className="dl-right-placeholder-card" data-active-panel={activePanel || 'none'}>
      <div className="dl-placeholder-header">
        <span className="dl-placeholder-badge">
          {activePanel ? `Active: ${activePanel}` : 'Side Panel'}
        </span>
        <h3 className="dl-placeholder-title">{title}</h3>
      </div>
      <p className="dl-placeholder-desc">
        {activePanel
          ? conversationId
            ? `Docked ${title.toLowerCase()} panel opened for conversation (${conversationId}).`
            : `Docked ${title.toLowerCase()} panel is active on tablet/desktop.`
          : 'Docked messages, notifications, and explore will appear here on desktop.'}
      </p>
    </div>
  );
}
