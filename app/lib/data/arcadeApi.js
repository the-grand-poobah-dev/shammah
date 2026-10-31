export const TRIVIA_QUESTIONS = [
  {
    id: 't-1',
    question: 'How many days and nights did it rain during the Great Flood with Noah?',
    options: ['40 days & nights', '7 days & nights', '100 days & nights', '3 days & nights'],
    correctIndex: 0,
    scripture: 'Genesis 7:12',
  },
  {
    id: 't-2',
    question: 'What weapon did David use to bring down Goliath in the Valley of Elah?',
    options: ['A bronze spear', 'A sling and five smooth stones', 'An iron chariot', 'A golden bow'],
    correctIndex: 1,
    scripture: '1 Samuel 17:40-49',
  },
  {
    id: 't-3',
    question: 'Who was swallowed by a great fish when running from Nineveh?',
    options: ['Daniel', 'Elijah', 'Jonah', 'Samson'],
    correctIndex: 2,
    scripture: 'Jonah 1:17',
  },
];

export const NOAH_ANIMALS = [
  { id: 'lion', name: 'Lion', icon: '🦁' },
  { id: 'elephant', name: 'Elephant', icon: '🐘' },
  { id: 'dove', name: 'Dove', icon: '🕊️' },
  { id: 'sheep', name: 'Sheep', icon: '🐑' },
  { id: 'giraffe', name: 'Giraffe', icon: '🦒' },
];

export async function getArcadeHubData() {
  return {
    highScores: [
      { id: 'hs-1', game: 'Scripture Scramble', player: 'Joshua Kimani', score: 1240 },
      { id: 'hs-2', game: 'Bible Trivia', player: 'Tabitha Muthoni', score: 980 },
      { id: 'hs-3', game: 'Memory Verse Match', player: 'Daniel Otieno', score: 860 },
    ],
    gamesPlayedToday: 342,
  };
}
