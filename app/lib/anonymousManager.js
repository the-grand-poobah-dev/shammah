'use client';

const PSEUDO_ADJECTIVES = [
  'Humble',
  'Graceful',
  'Faithful',
  'Gentle',
  'Devoted',
  'Joyful',
  'Peaceful',
  'Patient',
  'Living',
  'Chosen',
  'Blessed',
  'Steadfast',
  'Radiant',
  'Prayerful',
];

const PSEUDO_NOUNS = [
  'Seeker',
  'Pilgrim',
  'Disciple',
  'Servant',
  'Witness',
  'Believer',
  'Walker',
  'Worshipper',
  'Steward',
  'Messenger',
  'Shepherd',
  'Sister',
  'Brother',
  'Voice',
];

const PSEUDO_PALETTES = [
  { bg: '#0284c7', text: '#ffffff' }, // Ocean blue
  { bg: '#059669', text: '#ffffff' }, // Forest emerald
  { bg: '#7c3aed', text: '#ffffff' }, // Royal violet
  { bg: '#d97706', text: '#ffffff' }, // Warm amber
  { bg: '#db2777', text: '#ffffff' }, // Rose
  { bg: '#0d9488', text: '#ffffff' }, // Teal
  { bg: '#4f46e5', text: '#ffffff' }, // Indigo
];

export function generatePseudoIdentity(seed = null) {
  const hash = seed
    ? String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Math.floor(Math.random() * 10000);

  const adjIndex = hash % PSEUDO_ADJECTIVES.length;
  const nounIndex = (Math.floor(hash / 3) + 7) % PSEUDO_NOUNS.length;
  const num = (hash % 899) + 100;
  const palette = PSEUDO_PALETTES[hash % PSEUDO_PALETTES.length];

  const name = `${PSEUDO_ADJECTIVES[adjIndex]} ${PSEUDO_NOUNS[nounIndex]} #${num}`;
  const initials = `${PSEUDO_ADJECTIVES[adjIndex][0]}${PSEUDO_NOUNS[nounIndex][0]}`;

  return {
    isAnonymous: false,
    isPseudo: true,
    name,
    initials,
    palette,
    badge: 'pilgrim',
    avatar: null,
  };
}

export const ANONYMOUS_IDENTITY = {
  isAnonymous: true,
  isPseudo: false,
  name: 'Anonymous Disciple',
  initials: 'AD',
  palette: { bg: '#334155', text: '#f8fafc' },
  badge: null,
  avatar: null,
};
