'use client';
import { useState } from 'react';
import { Sparkles, Heart, Smile, Flame, Search, X } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'faith',
    name: 'Faith & Worship',
    icon: Sparkles,
    emojis: [
      { emoji: '🙏', label: 'Amen / Prayer' },
      { emoji: '❤️', label: 'God\'s Love' },
      { emoji: '🙌', label: 'Praise & Thanksgiving' },
      { emoji: '🔥', label: 'Holy Fire' },
      { emoji: '🕊️', label: 'Peace / Holy Spirit' },
      { emoji: '💡', label: 'Word Insight' },
      { emoji: '✨', label: 'Grace & Glory' },
      { emoji: '👏', label: 'Celebration' },
      { emoji: '📖', label: 'Holy Scripture' },
      { emoji: '⛪', label: 'Church Assembly' },
      { emoji: '✝️', label: 'The Cross' },
      { emoji: '🛡️', label: 'Shield of Faith' },
    ],
  },
  {
    id: 'worship',
    name: 'Praise & Blessings',
    icon: Flame,
    emojis: [
      { emoji: '🎶', label: 'Worship Melody' },
      { emoji: '🎺', label: 'Praise Trumpet' },
      { emoji: '👑', label: 'King of Kings' },
      { emoji: '🕯️', label: 'Lamp to My Feet' },
      { emoji: '☀️', label: 'New Mercies' },
      { emoji: '🌿', label: 'Righteous Branch' },
      { emoji: '🌾', label: 'Kingdom Harvest' },
      { emoji: '🌈', label: 'God\'s Promise' },
    ],
  },
  {
    id: 'fellowship',
    name: 'Love & Joy',
    icon: Heart,
    emojis: [
      { emoji: '🤗', label: 'Brotherly Love' },
      { emoji: '🤝', label: 'Fellowship & Unity' },
      { emoji: '💪', label: 'Strength in the Lord' },
      { emoji: '💐', label: 'Grace Bouquet' },
      { emoji: '💖', label: 'Joyful Heart' },
      { emoji: '😊', label: 'Joy in Christ' },
      { emoji: '🌟', label: 'Star of Light' },
      { emoji: '🔔', label: 'Gospel Call' },
    ],
  },
];

export default function FaithReactionPicker({ onSelect, currentEmoji, onClose }) {
  const [activeCategory, setActiveCategory] = useState('faith');
  const [search, setSearch] = useState('');

  const currentSet = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter(
        (e) =>
          e.label.toLowerCase().includes(search.toLowerCase()) ||
          e.emoji.includes(search.trim())
      )
    : currentSet.emojis;

  return (
    <div
      className="faith-reaction-picker-bubble"
      role="dialog"
      aria-label="Select a faith reaction"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="picker-header-row">
        <span className="picker-title">
          <Sparkles size={14} className="picker-sparkle-icon" />
          <span>Community Reactions</span>
        </span>
        {onClose && (
          <button type="button" className="picker-close-btn" onClick={onClose} aria-label="Close picker">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Mini search input */}
      <div className="picker-search-bar">
        <Search size={12} className="picker-search-icon" />
        <input
          type="text"
          placeholder="Search amen, praise, love..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="picker-search-input"
        />
        {search && (
          <button type="button" className="picker-clear-search" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>

      {/* Category selector pills */}
      {!search.trim() && (
        <div className="picker-tabs-row" role="tablist">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`picker-tab-btn${isActive ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <Icon size={12} />
                <span>{cat.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Emojis */}
      <div className="picker-emoji-grid">
        {filteredEmojis.map((item) => {
          const isSelected = currentEmoji === item.emoji;
          return (
            <button
              key={item.emoji + item.label}
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
              <span className="faith-reaction-tooltip">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
