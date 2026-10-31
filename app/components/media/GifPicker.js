'use client';
import React, { useState } from 'react';
import PopupSheet from '../PopupSheet';
import { Search } from 'lucide-react';

const CHRISTIAN_GIFS = [
  { id: 'g1', url: 'https://media.giphy.com/media/l41JRsph73VokN6ik/giphy.gif', title: 'Amen & Praise' },
  { id: 'g2', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', title: 'Hallelujah' },
  { id: 'g3', url: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif', title: 'Blessings' },
  { id: 'g4', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif', title: 'Praying Hands' },
  { id: 'g5', url: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif', title: 'God is Good' },
  { id: 'g6', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', title: 'Grace' },
];

export default function GifPicker({ isOpen, onClose, onSelectGif }) {
  const [search, setSearch] = useState('');

  const filtered = CHRISTIAN_GIFS.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PopupSheet open={isOpen} onClose={onClose} title="Select Faith GIF / Sticker" size="md">
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-[var(--ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search praise, prayer, amen GIFs..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--ink)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--teal)] min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                if (onSelectGif) onSelectGif(g.url);
                onClose();
              }}
              className="rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--sec-color)] transition-all group aspect-4-3 bg-black/10 min-h-[44px]"
            >
              <img
                src={g.url}
                alt={g.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </PopupSheet>
  );
}
