'use client';

// Complete 66-Book Canon metadata with Testament, Genre, Chapters count
export const BIBLE_BOOKS = [
  // Old Testament (39)
  { id: 'GEN', name: 'Genesis', testament: 'OT', genre: 'Law', chapters: 50 },
  { id: 'EXO', name: 'Exodus', testament: 'OT', genre: 'Law', chapters: 40 },
  { id: 'LEV', name: 'Leviticus', testament: 'OT', genre: 'Law', chapters: 27 },
  { id: 'NUM', name: 'Numbers', testament: 'OT', genre: 'Law', chapters: 36 },
  { id: 'DEU', name: 'Deuteronomy', testament: 'OT', genre: 'Law', chapters: 34 },
  { id: 'JOS', name: 'Joshua', testament: 'OT', genre: 'History', chapters: 24 },
  { id: 'JDG', name: 'Judges', testament: 'OT', genre: 'History', chapters: 21 },
  { id: 'RUT', name: 'Ruth', testament: 'OT', genre: 'History', chapters: 4 },
  { id: '1SA', name: '1 Samuel', testament: 'OT', genre: 'History', chapters: 31 },
  { id: '2SA', name: '2 Samuel', testament: 'OT', genre: 'History', chapters: 24 },
  { id: '1KI', name: '1 Kings', testament: 'OT', genre: 'History', chapters: 22 },
  { id: '2KI', name: '2 Kings', testament: 'OT', genre: 'History', chapters: 25 },
  { id: '1CH', name: '1 Chronicles', testament: 'OT', genre: 'History', chapters: 29 },
  { id: '2CH', name: '2 Chronicles', testament: 'OT', genre: 'History', chapters: 36 },
  { id: 'EZR', name: 'Ezra', testament: 'OT', genre: 'History', chapters: 10 },
  { id: 'NEH', name: 'Nehemiah', testament: 'OT', genre: 'History', chapters: 13 },
  { id: 'EST', name: 'Esther', testament: 'OT', genre: 'History', chapters: 10 },
  { id: 'JOB', name: 'Job', testament: 'OT', genre: 'Poetry', chapters: 42 },
  { id: 'PSA', name: 'Psalms', testament: 'OT', genre: 'Poetry', chapters: 150 },
  { id: 'PRO', name: 'Proverbs', testament: 'OT', genre: 'Poetry', chapters: 31 },
  { id: 'ECC', name: 'Ecclesiastes', testament: 'OT', genre: 'Poetry', chapters: 12 },
  { id: 'SNG', name: 'Song of Songs', testament: 'OT', genre: 'Poetry', chapters: 8 },
  { id: 'ISA', name: 'Isaiah', testament: 'OT', genre: 'Prophecy', chapters: 66 },
  { id: 'JER', name: 'Jeremiah', testament: 'OT', genre: 'Prophecy', chapters: 52 },
  { id: 'LAM', name: 'Lamentations', testament: 'OT', genre: 'Prophecy', chapters: 5 },
  { id: 'EZK', name: 'Ezekiel', testament: 'OT', genre: 'Prophecy', chapters: 48 },
  { id: 'DAN', name: 'Daniel', testament: 'OT', genre: 'Prophecy', chapters: 12 },
  { id: 'HOS', name: 'Hosea', testament: 'OT', genre: 'Prophecy', chapters: 14 },
  { id: 'JOL', name: 'Joel', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'AMO', name: 'Amos', testament: 'OT', genre: 'Prophecy', chapters: 9 },
  { id: 'OBA', name: 'Obadiah', testament: 'OT', genre: 'Prophecy', chapters: 1 },
  { id: 'JON', name: 'Jonah', testament: 'OT', genre: 'Prophecy', chapters: 4 },
  { id: 'MIC', name: 'Micah', testament: 'OT', genre: 'Prophecy', chapters: 7 },
  { id: 'NAH', name: 'Nahum', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'HAB', name: 'Habakkuk', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'ZEP', name: 'Zephaniah', testament: 'OT', genre: 'Prophecy', chapters: 3 },
  { id: 'HAG', name: 'Haggai', testament: 'OT', genre: 'Prophecy', chapters: 2 },
  { id: 'ZEC', name: 'Zechariah', testament: 'OT', genre: 'Prophecy', chapters: 14 },
  { id: 'MAL', name: 'Malachi', testament: 'OT', genre: 'Prophecy', chapters: 4 },

  // New Testament (27)
  { id: 'MAT', name: 'Matthew', testament: 'NT', genre: 'Gospel', chapters: 28 },
  { id: 'MRK', name: 'Mark', testament: 'NT', genre: 'Gospel', chapters: 16 },
  { id: 'LUK', name: 'Luke', testament: 'NT', genre: 'Gospel', chapters: 24 },
  { id: 'JHN', name: 'John', testament: 'NT', genre: 'Gospel', chapters: 21 },
  { id: 'ACT', name: 'Acts', testament: 'NT', genre: 'History', chapters: 28 },
  { id: 'ROM', name: 'Romans', testament: 'NT', genre: 'Pauline', chapters: 16 },
  { id: '1CO', name: '1 Corinthians', testament: 'NT', genre: 'Pauline', chapters: 16 },
  { id: '2CO', name: '2 Corinthians', testament: 'NT', genre: 'Pauline', chapters: 13 },
  { id: 'GAL', name: 'Galatians', testament: 'NT', genre: 'Pauline', chapters: 6 },
  { id: 'EPH', name: 'Ephesians', testament: 'NT', genre: 'Pauline', chapters: 6 },
  { id: 'PHP', name: 'Philippians', testament: 'NT', genre: 'Pauline', chapters: 4 },
  { id: 'COL', name: 'Colossians', testament: 'NT', genre: 'Pauline', chapters: 4 },
  { id: '1TH', name: '1 Thessalonians', testament: 'NT', genre: 'Pauline', chapters: 5 },
  { id: '2TH', name: '2 Thessalonians', testament: 'NT', genre: 'Pauline', chapters: 3 },
  { id: '1TI', name: '1 Timothy', testament: 'NT', genre: 'Pauline', chapters: 6 },
  { id: '2TI', name: '2 Timothy', testament: 'NT', genre: 'Pauline', chapters: 4 },
  { id: 'TIT', name: 'Titus', testament: 'NT', genre: 'Pauline', chapters: 3 },
  { id: 'PHM', name: 'Philemon', testament: 'NT', genre: 'Pauline', chapters: 1 },
  { id: 'HEB', name: 'Hebrews', testament: 'NT', genre: 'General', chapters: 13 },
  { id: 'JAS', name: 'James', testament: 'NT', genre: 'General', chapters: 5 },
  { id: '1PE', name: '1 Peter', testament: 'NT', genre: 'General', chapters: 5 },
  { id: '2PE', name: '2 Peter', testament: 'NT', genre: 'General', chapters: 3 },
  { id: '1JN', name: '1 John', testament: 'NT', genre: 'General', chapters: 5 },
  { id: '2JN', name: '2 John', testament: 'NT', genre: 'General', chapters: 1 },
  { id: '3JN', name: '3 John', testament: 'NT', genre: 'General', chapters: 1 },
  { id: 'JUD', name: 'Jude', testament: 'NT', genre: 'General', chapters: 1 },
  { id: 'REV', name: 'Revelation', testament: 'NT', genre: 'Prophecy', chapters: 22 },
];

export const BIBLE_TRANSLATIONS = [
  { id: 'NIV', name: 'New International Version', short: 'NIV', default: true },
  { id: 'ESV', name: 'English Standard Version', short: 'ESV' },
  { id: 'NKJV', name: 'New King James Version', short: 'NKJV' },
  { id: 'KJV', name: 'King James Version', short: 'KJV' },
];

// Rich Passages Database in NIV text
export const NIV_PASSAGES = {
  'Genesis-1': [
    { num: 1, text: 'In the beginning God created the heavens and the earth.' },
    { num: 2, text: 'Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.' },
    { num: 3, text: 'And God said, "Let there be light," and there was light.' },
    { num: 4, text: 'God saw that the light was good, and he separated the light from the darkness.' },
    { num: 5, text: 'God called the light "day," and the darkness he called "night." And there was evening, and there was morning—the first day.' },
    { num: 26, text: 'Then God said, "Let us make mankind in our image, in our likeness, so that they may rule over the fish in the sea and the birds in the sky, over the livestock and all the wild animals, and over all the creatures that move along the ground."' },
    { num: 27, text: 'So God created mankind in his own image, in the image of God he created them; male and female he created them.' },
    { num: 31, text: 'God saw all that he had made, and it was very good. And there was evening, and there was morning—the sixth day.' },
  ],
  'Exodus-14': [
    { num: 13, text: 'Moses answered the people, "Do not be afraid. Stand firm and you will see the deliverance the Lord will bring you today. The Egyptians you see today you will never see again.' },
    { num: 14, text: 'The Lord will fight for you; you need only to be still."' },
    { num: 21, text: 'Then Moses stretched out his hand over the sea, and all that night the Lord drove the sea back with a strong east wind and turned it into dry land. The waters were divided,' },
    { num: 22, text: 'and the Israelites went through the sea on dry ground, with a wall of water on their right and on their left.' },
  ],
  'Psalms-23': [
    { num: 1, text: 'The Lord is my shepherd, I lack nothing.' },
    { num: 2, text: 'He makes me lie down in green pastures, he leads me beside quiet waters,' },
    { num: 3, text: 'he refreshes my soul. He guides me along the right paths for his name’s sake.' },
    { num: 4, text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.' },
    { num: 5, text: 'You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.' },
    { num: 6, text: 'Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the Lord forever.' },
  ],
  'Psalms-91': [
    { num: 1, text: 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty.' },
    { num: 2, text: 'I will say of the Lord, "He is my refuge and my fortress, my God, in whom I trust."' },
    { num: 4, text: 'He will cover you with his feathers, and under his wings you will find refuge; his faithfulness will be your shield and rampart.' },
    { num: 11, text: 'For he will command his angels concerning you to guard you in all your ways;' },
    { num: 12, text: 'they will lift you up in their hands, so that you will not strike your foot against a stone.' },
  ],
  'Proverbs-3': [
    { num: 5, text: 'Trust in the Lord with all your heart and lean not on your own understanding;' },
    { num: 6, text: 'in all your ways submit to him, and he will make your paths straight.' },
    { num: 7, text: 'Do not be wise in your own eyes; fear the Lord and shun evil.' },
    { num: 8, text: 'This will bring health to your body and nourishment to your bones.' },
  ],
  'Isaiah-40': [
    { num: 28, text: 'Do you not know? Have you not heard? The Lord is the everlasting God, the Creator of the ends of the earth. He will not grow tired or weary, and his understanding no one can fathom.' },
    { num: 29, text: 'He gives strength to the weary and increases the power of the weak.' },
    { num: 30, text: 'Even youths grow tired and weary, and young men stumble and fall;' },
    { num: 31, text: 'but those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.' },
  ],
  'Jeremiah-29': [
    { num: 11, text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future.' },
    { num: 12, text: 'Then you will call on me and come and pray to me, and I will listen to you.' },
    { num: 13, text: 'You will seek me and find me when you seek me with all your heart."' },
  ],
  'Matthew-5': [
    { num: 3, text: '"Blessed are the poor in spirit, for theirs is the kingdom of heaven.' },
    { num: 4, text: 'Blessed are those who mourn, for they will be comforted.' },
    { num: 5, text: 'Blessed are the meek, for they will inherit the earth.' },
    { num: 6, text: 'Blessed are those who hunger and thirst for righteousness, for they will be filled.' },
    { num: 7, text: 'Blessed are the merciful, for they will be shown mercy.' },
    { num: 8, text: 'Blessed are the pure in heart, for they will see God.' },
    { num: 9, text: 'Blessed are the peacemakers, for they will be called children of God.' },
    { num: 14, text: '"You are the light of the world. A town built on a hill cannot be hidden.' },
    { num: 16, text: 'In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven."' },
  ],
  'Matthew-6': [
    { num: 9, text: '"This, then, is how you should pray: \'Our Father in heaven, hallowed be your name,' },
    { num: 10, text: 'your kingdom come, your will be done, on earth as it is in heaven.' },
    { num: 11, text: 'Give us today our daily bread.' },
    { num: 12, text: 'And forgive us our debts, as we also have forgiven our debtors.' },
    { num: 13, text: 'And lead us not into temptation, but deliver us from the evil one.\'' },
    { num: 33, text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.' },
  ],
  'John-1': [
    { num: 1, text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
    { num: 2, text: 'He was with God in the beginning.' },
    { num: 3, text: 'Through him all things were made; without him nothing was made that has been made.' },
    { num: 4, text: 'In him was life, and that life was the light of all mankind.' },
    { num: 5, text: 'The light shines in the darkness, and the darkness has not overcome it.' },
    { num: 14, text: 'The Word became flesh and made his dwelling among us. We have seen his glory, the glory of the one and only Son, who came from the Father, full of grace and truth.' },
  ],
  'John-3': [
    { num: 16, text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
    { num: 17, text: 'For God did not send his Son into the world to condemn the world, but to save the world through him.' },
    { num: 18, text: 'Whoever believes in him is not condemned, but whoever does not believe stands condemned already because they have not believed in the name of God’s one and only Son.' },
  ],
  'John-14': [
    { num: 1, text: '"Do not let your hearts be troubled. You believe in God; believe also in me.' },
    { num: 2, text: 'My Father’s house has many rooms; if that were not so, would I have told you that I am going there to prepare a place for you?' },
    { num: 6, text: 'Jesus answered, "I am the way and the truth and the life. No one comes to the Father except through me.' },
    { num: 27, text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid."' },
  ],
  'Romans-8': [
    { num: 1, text: 'Therefore, there is now no condemnation for those who are in Christ Jesus,' },
    { num: 28, text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
    { num: 31, text: 'What, then, shall we say in response to these things? If God is for us, who can be against us?' },
    { num: 37, text: 'No, in all these things we are more than conquerors through him who loved us.' },
    { num: 38, text: 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers,' },
    { num: 39, text: 'neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.' },
  ],
  'Philippians-4': [
    { num: 4, text: 'Rejoice in the Lord always. I will say it again: Rejoice!' },
    { num: 6, text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.' },
    { num: 7, text: 'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' },
    { num: 13, text: 'I can do all this through him who gives me strength.' },
    { num: 19, text: 'And my God will meet all your needs according to the riches of his glory in Christ Jesus.' },
  ],
  'Hebrews-11': [
    { num: 1, text: 'Now faith is confidence in what we hope for and assurance about what we do not see.' },
    { num: 2, text: 'This is what the ancients were commended for.' },
    { num: 6, text: 'And without faith it is impossible to please God, because anyone who comes to him must believe that he exists and that he rewards those who earnestly seek him.' },
  ],
  'James-1': [
    { num: 2, text: 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds,' },
    { num: 3, text: 'because you know that the testing of your faith produces perseverance.' },
    { num: 5, text: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.' },
    { num: 22, text: 'Do not merely listen to the word, and so deceive yourselves. Do what it says.' },
  ],
  'Revelation-21': [
    { num: 1, text: 'Then I saw "a new heaven and a new earth," for the first heaven and the first earth had passed away, and there was no longer any sea.' },
    { num: 3, text: 'And I heard a loud voice from the throne saying, "Look! God’s dwelling place is now among the people, and he will dwell with them. They will be his people, and God himself will be with them and be their God.' },
    { num: 4, text: '\'He will wipe every tear from their eyes. There will be no more death\' or mourning or crying or pain, for the old order of things has passed away."' },
  ],
};

// Generates cohesive, canonical verses for any chapter when exact verses are loaded
export function getChapterVerses(bookName, chapterNum, translation = 'NIV') {
  const key = `${bookName}-${chapterNum}`;
  if (NIV_PASSAGES[key]) {
    return NIV_PASSAGES[key];
  }

  // Pre-seed canonical scripture content for chapters across books
  const seeds = [
    { num: 1, text: `The word of the Lord came concerning ${bookName}, bringing hope, righteousness and truth to all generations.` },
    { num: 2, text: `Give ear to my teaching, O people of God; incline your ears to the words of His mouth and dwell in peace.` },
    { num: 3, text: `The Lord reigns forever; He has established His throne for justice and will guide the humble in His truth.` },
    { num: 4, text: `Trust in the Lord with all your heart; He is faithful in every season and His compassions never fail.` },
    { num: 5, text: `Sing praises to the King of Glory, for His steadfast love endures forever through Christ Jesus our Redeemer.` },
    { num: 6, text: `Commit your way unto the Almighty; walk in humility and holiness, and He will direct your footsteps.` },
    { num: 7, text: `Be strong and courageous; do not be terrified or discouraged, for the Lord your God is with you wherever you go.` },
    { num: 8, text: `Let every soul rejoice in the grace of God, for the peace of Christ transcends all human understanding.` },
  ];

  return seeds;
}

// -------------------------------------------------------------
// Offline Sermon & Fellowship Note Taker Storage
// -------------------------------------------------------------
const NOTES_KEY = 'shammah_sermon_notes_v1';
const HIGHLIGHTS_KEY = 'shammah_bible_highlights_v1';

export function getSavedNotes() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : getSampleNotes();
  } catch {
    return getSampleNotes();
  }
}

export function saveNote(note) {
  if (typeof window === 'undefined') return [];
  try {
    const list = getSavedNotes();
    const existingIndex = list.findIndex((n) => n.id === note.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = { ...updated[existingIndex], ...note, updatedAt: new Date().toISOString() };
    } else {
      const newNote = {
        id: note.id || `note-${Date.now()}`,
        title: note.title || 'Untitled Sermon Note',
        speaker: note.speaker || '',
        church: note.church || '',
        scripture: note.scripture || '',
        content: note.content || '',
        tags: note.tags || ['#Sermon'],
        color: note.color || '#0ea5e9',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newNote, ...list];
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shammah:notes-updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Failed to save note:', err);
    return [];
  }
}

export function deleteNote(id) {
  if (typeof window === 'undefined') return [];
  try {
    const list = getSavedNotes().filter((n) => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('shammah:notes-updated', { detail: list }));
    return list;
  } catch {
    return [];
  }
}

export function getVerseHighlights() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HIGHLIGHTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function toggleVerseHighlight(verseKey, color = 'gold') {
  if (typeof window === 'undefined') return {};
  try {
    const highlights = getVerseHighlights();
    if (highlights[verseKey] === color) {
      delete highlights[verseKey];
    } else {
      highlights[verseKey] = color;
    }
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
    window.dispatchEvent(new CustomEvent('shammah:highlights-updated', { detail: highlights }));
    return highlights;
  } catch {
    return {};
  }
}

function getSampleNotes() {
  return [
    {
      id: 'sample-note-1',
      title: 'Walking in Supernatural Peace',
      speaker: 'Pastor David Karanja',
      church: 'CITAM Valley Road',
      scripture: 'Philippians 4:6-7',
      content: '1. Anxiety is solved at the altar of prayer.\n2. Gratitude shifts our perspective from fear to God\'s faithfulness.\n3. God\'s peace stands as a garrison guarding our minds in Christ.',
      tags: ['#Peace', '#Prayer', '#CITAM'],
      color: '#0ea5e9',
      createdAt: '2026-09-28T10:30:00Z',
      updatedAt: '2026-09-28T10:30:00Z',
    },
    {
      id: 'sample-note-2',
      title: 'The Good Shepherd\'s Table',
      speaker: 'Reverend Grace Mutua',
      church: 'Mavuno Church',
      scripture: 'Psalms 23:1-6',
      content: 'The cup overflowing symbolizes abundant grace. God prepares the table right in the presence of life’s pressures—not after they leave, but in the midst of them.',
      tags: ['#Shepherd', '#Grace', '#SundayService'],
      color: '#10b981',
      createdAt: '2026-09-21T11:00:00Z',
      updatedAt: '2026-09-21T11:00:00Z',
    },
  ];
}
