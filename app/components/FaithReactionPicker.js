'use client';
import { FAITH_REACTIONS } from '../lib/postInteractions';

export default function FaithReactionPicker({ onSelect, currentEmoji, onClose }) {
  return (
    <div
      className="faith-reaction-picker-bubble"
      role="menu"
      aria-label="Select a reaction"
      onClick={(e) => e.stopPropagation()}
    >
      {FAITH_REACTIONS.map((item) => {
        const isSelected = currentEmoji === item.emoji;
        return (
          <button
            key={item.id}
            type="button"
            className={`faith-reaction-item${isSelected ? ' selected' : ''}`}
            onClick={() => {
              onSelect(item.emoji);
              if (onClose) onClose();
            }}
            title={item.label}
            aria-label={item.label}
          >
            <span className="faith-reaction-emoji">{item.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
