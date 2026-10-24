// A friendly one-liner + emoji for each category card on the Browse page.
// Colours come from CATEGORY_STYLES in postDisplay.js; the ids match the `categories` table.
export const CATEGORY_INFO = {
  lessons: { emoji: '📖', blurb: 'Lesson ideas, icebreakers and teaching resources.' },
  stories: { emoji: '🕊️', blurb: 'Testimonies and real-life faith stories.' },
  podcasts: { emoji: '🎧', blurb: 'Sermons, podcasts and videos worth sharing.' },
  events: { emoji: '📅', blurb: 'Conferences, services and gatherings coming up.' },
  involved: { emoji: '🤝', blurb: 'Ways to serve, give and join in.' },
  resources: { emoji: '🧰', blurb: 'Study guides, tools and helpful downloads.' },
  parent: { emoji: '👨‍👩‍👧', blurb: 'Encouragement and advice for raising children in faith.' },
  worship: { emoji: '🎶', blurb: 'Music, creative arts and worship ideas.' },
  teen: { emoji: '🎯', blurb: 'Honest conversations for teenagers.' },
  kids: { emoji: '🧸', blurb: 'Activities and stories for little ones.' },
  volunteer: { emoji: '🌟', blurb: 'Celebrating people who serve quietly.' },
  hacks: { emoji: '💡', blurb: 'Practical tips for running a ministry well.' },
  prayer: { emoji: '🙏', blurb: 'Bring a request or share a praise report.' },
  seasonal: { emoji: '🎄', blurb: 'Easter, Christmas and other seasons of the church year.' },
  faq: { emoji: '❓', blurb: 'Answers for parents and volunteers.' },
  field: { emoji: '🌍', blurb: 'News and stories from missionaries around the world.' },
};

export function categoryInfo(id) {
  return CATEGORY_INFO[id] || { emoji: '✨', blurb: '' };
}
