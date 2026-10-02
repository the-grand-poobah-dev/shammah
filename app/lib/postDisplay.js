// Small, shared pieces of UI logic that both the main feed and individual
// post cards need. Pulled out so there is exactly one copy of each.

export const CATEGORY_STYLES = {
  lessons: { label: 'Lessons & Icebreakers', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  stories: { label: 'Stories & Experiences', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  podcasts: { label: 'Podcasts & Videos', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  events: { label: 'Events', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  involved: { label: 'Get Involved', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  resources: { label: 'Resources', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  parent: { label: 'Parent Corner', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  worship: { label: 'Worship & Creative Arts', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  teen: { label: 'Teen Talks', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  kids: { label: "Kids' Corner", accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  volunteer: { label: 'Volunteer Spotlight', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  hacks: { label: 'Ministry Hacks', accent: '#a94b46', soft: '#f3dfdd', text: '#833a36' },
  prayer: { label: 'Prayer Requests & Praise Reports', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
  seasonal: { label: 'Seasonal Specials', accent: '#1e6b66', soft: '#dceeec', text: '#175450' },
  field: { label: 'From the Mission Field', accent: '#b8842a', soft: '#f4e9d6', text: '#8a611c' },
};

export function categoryStyle(categoryId) {
  return (
    CATEGORY_STYLES[categoryId] || {
      label: categoryId,
      accent: '#b8842a',
      soft: '#f4e9d6',
      text: '#8a611c',
    }
  );
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[1][0]] : [parts[0][0]];
  return chars.join('').toUpperCase();
}

// "3m", "2h", "5d", then falls back to a plain date once it's old
export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}
